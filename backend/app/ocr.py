"""
Loan-application OCR: reads a scanned/printed application PDF and extracts
the same 13 fields the /apply form collects manually, using Groq's hosted
vision model. Groq only accepts images (not PDFs) as vision input, so the
PDF's first page is rasterized to PNG first via PyMuPDF.

Groq's multimodal lineup changes often — check
https://console.groq.com/docs/vision for the current model if this stops
working, and override via GROQ_VISION_MODEL rather than editing code.
(Llama-4 Scout and Maverick were both deprecated on Groq in 2026;
qwen/qwen3.6-27b is the current vision-capable one as of this writing.)

Falls back to a fixed mock extraction when GROQ_API_KEY isn't set, so the
feature stays demoable without a Groq account. Extracted values only ever
prefill a form an applicant still reviews before submitting — nothing here
writes to the database directly.
"""

import base64
import io
import json
import os
import random

import pymupdf
from fastapi import HTTPException
from groq import Groq
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
# Groq deprecated its earlier vision models (llama-4-scout, then llama-4-maverick
# in Feb 2026) in favor of text-only gpt-oss models — qwen3.6-27b is the current
# vision-capable one. Check https://console.groq.com/docs/vision if this changes.
GROQ_MODEL = os.environ.get("GROQ_VISION_MODEL", "qwen/qwen3.6-27b")
MOCK_MODE = not bool(GROQ_API_KEY)

FIELDS = [
    "person_age",
    "person_gender",
    "person_education",
    "person_income",
    "person_emp_exp",
    "person_home_ownership",
    "loan_amnt",
    "loan_intent",
    "loan_int_rate",
    "loan_percent_income",
    "cb_person_cred_hist_length",
    "credit_score",
    "previous_loan_defaults_on_file",
]

EXTRACTION_PROMPT = f"""You are reading a printed loan application form for a lending platform.
Extract exactly these fields and respond with ONLY a JSON object, no other text:
{{
  "person_age": "applicant age, a number, or null",
  "person_gender": "'male' or 'female', or null",
  "person_education": "one of High School/Associate/Bachelor/Master/Doctorate, or null",
  "person_income": "annual income, a number, or null",
  "person_emp_exp": "years of employment experience, an integer, or null",
  "person_home_ownership": "one of RENT/OWN/MORTGAGE/OTHER, or null",
  "loan_amnt": "requested loan amount, a number, or null",
  "loan_intent": "one of PERSONAL/EDUCATION/MEDICAL/VENTURE/HOMEIMPROVEMENT/DEBTCONSOLIDATION, or null",
  "loan_int_rate": "interest rate percentage, a number, or null",
  "loan_percent_income": "loan amount as a fraction of income (e.g. 0.18), a number, or null",
  "cb_person_cred_hist_length": "credit history length in years, a number, or null",
  "credit_score": "credit score, an integer, or null",
  "previous_loan_defaults_on_file": "'Yes' or 'No', or null"
}}
If a field truly isn't visible in the image, use null rather than guessing."""


def _mock_extraction() -> dict:
    return {
        "person_age": 28,
        "person_gender": "female",
        "person_education": "Bachelor",
        "person_income": 65000,
        "person_emp_exp": 5,
        "person_home_ownership": "RENT",
        "loan_amnt": 12000,
        "loan_intent": "MEDICAL",
        "loan_int_rate": 11.5,
        "loan_percent_income": 0.18,
        "cb_person_cred_hist_length": 6,
        "credit_score": 680,
        "previous_loan_defaults_on_file": "No",
        "mock": True,
    }


def _pdf_first_page_to_png(pdf_bytes: bytes) -> bytes:
    try:
        doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        page = doc.load_page(0)
        pix = page.get_pixmap(dpi=200)
        return pix.tobytes("png")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")


def extract_application_from_pdf(pdf_bytes: bytes) -> dict:
    if MOCK_MODE:
        return _mock_extraction()

    png_bytes = _pdf_first_page_to_png(pdf_bytes)
    b64 = base64.b64encode(png_bytes).decode("utf-8")
    client = Groq(api_key=GROQ_API_KEY)

    try:
        completion = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": EXTRACTION_PROMPT},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                    ],
                }
            ],
            temperature=0.1,
            max_completion_tokens=2048,
            response_format={"type": "json_object"},
        )
        result = json.loads(completion.choices[0].message.content)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OCR extraction failed: {e}")

    result["mock"] = False
    return result


# --- Synthetic test PDF, for verifying the OCR pipeline end-to-end ---

_EDUCATION = ["High School", "Associate", "Bachelor", "Master", "Doctorate"]
_HOME = ["RENT", "OWN", "MORTGAGE", "OTHER"]
_INTENT = ["PERSONAL", "EDUCATION", "MEDICAL", "VENTURE", "HOMEIMPROVEMENT", "DEBTCONSOLIDATION"]


def _random_ground_truth() -> dict:
    income = random.randint(25, 140) * 1000
    loan_amnt = random.randint(2, 30) * 1000
    return {
        "person_age": random.randint(21, 60),
        "person_gender": random.choice(["male", "female"]),
        "person_education": random.choice(_EDUCATION),
        "person_income": income,
        "person_emp_exp": random.randint(0, 25),
        "person_home_ownership": random.choice(_HOME),
        "loan_amnt": loan_amnt,
        "loan_intent": random.choice(_INTENT),
        "loan_int_rate": round(random.uniform(6, 19), 1),
        "loan_percent_income": round(loan_amnt / income, 2),
        "cb_person_cred_hist_length": random.randint(2, 20),
        "credit_score": random.randint(560, 800),
        "previous_loan_defaults_on_file": random.choice(["Yes", "No"]),
    }


_LABELS = {
    "person_age": "Applicant Age",
    "person_gender": "Gender",
    "person_education": "Education Level",
    "person_income": "Annual Income (INR)",
    "person_emp_exp": "Employment Experience (years)",
    "person_home_ownership": "Home Ownership",
    "loan_amnt": "Requested Loan Amount (INR)",
    "loan_intent": "Loan Intent",
    "loan_int_rate": "Interest Rate (%)",
    "loan_percent_income": "Loan-to-Income Ratio",
    "cb_person_cred_hist_length": "Credit History Length (years)",
    "credit_score": "Credit Score",
    "previous_loan_defaults_on_file": "Previous Defaults on File",
}


def generate_test_pdf() -> dict:
    """Renders a fabricated loan-application PDF with randomized-but-known
    values, so the OCR extraction result can be compared against ground
    truth to confirm the pipeline actually works end to end."""
    values = _random_ground_truth()

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    c.setFillColorRGB(0.11, 0.14, 0.2)
    c.rect(0, height - 3 * cm, width, 3 * cm, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(2 * cm, height - 1.9 * cm, "ZKredit — Loan Application (Applicant Copy)")

    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica", 10)
    y = height - 4 * cm
    for key in FIELDS:
        c.setFont("Helvetica", 11)
        c.drawString(2 * cm, y, f"{_LABELS[key]}:")
        c.setFont("Helvetica-Bold", 11)
        c.drawString(9.5 * cm, y, str(values[key]))
        y -= 0.9 * cm

    c.setFont("Helvetica-Oblique", 9)
    c.setFillColorRGB(0.6, 0, 0)
    c.drawString(2 * cm, 2 * cm, "FABRICATED FOR TESTING — not a real applicant or application.")
    c.save()

    return {
        "pdf_base64": base64.b64encode(buf.getvalue()).decode("utf-8"),
        "ground_truth": values,
    }