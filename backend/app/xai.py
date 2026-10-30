"""
Explainable AI for ZKredit: why was this application approved or rejected?

Method: SHAP for a linear model (exact, no sampling).
  The model is  p = sigmoid(z),  z = w.x + b.  For a linear z with the
  "average applicant" as the reference, the SHAP value of feature i is
        phi_i = w_i * (x_i - mean_i)
  and   z = base_value + sum(phi_i)   holds EXACTLY (log-odds units).
  Approve  <=>  z > 0  (score > 0.5).

One-hot columns are summed back into the original 13 fields, so a person reads
"Home ownership: RENT  -0.42" instead of four separate dummy columns.

Note: the explanation is computed off-chain from the same model file the proof
is made for. It is NOT itself covered by the zero-knowledge proof.
"""
import json
import math
import os

import numpy as np

from app.inference import CATEGORICAL_COLS, CONTINUOUS_COLS, MODELS_DIR, get_model

LABELS = {
    "person_age": "Age",
    "person_gender": "Gender",
    "person_education": "Education",
    "person_income": "Annual income",
    "person_emp_exp": "Years of employment",
    "person_home_ownership": "Home ownership",
    "loan_amnt": "Loan amount",
    "loan_intent": "Loan purpose",
    "loan_int_rate": "Interest rate",
    "loan_percent_income": "Loan as % of income",
    "cb_person_cred_hist_length": "Credit history length",
    "credit_score": "Credit score",
    "previous_loan_defaults_on_file": "Previous defaults",
}

# Fields that are protected characteristics. They are explained like any other
# field but flagged, so a reviewer can see at a glance whether they moved the decision.
SENSITIVE = {"person_gender", "person_age"}

_BASELINE = None


def _load_baseline():
    global _BASELINE
    if _BASELINE is None:
        path = os.path.join(MODELS_DIR, "xai_baseline.json")
        if not os.path.exists(path):
            raise FileNotFoundError(
                "xai_baseline.json not found. Run: python training/build_xai_baseline.py "
                "--csv data/raw/loan_data.csv"
            )
        with open(path) as f:
            d = json.load(f)
        _BASELINE = {
            "cols": d["feature_columns"],
            "w": np.array(d["weights"], dtype=np.float64),
            "b": float(d["bias"]),
            "mean": np.array(d["means"], dtype=np.float64),
        }
    return _BASELINE


def _sigmoid(z: float) -> float:
    return 1.0 / (1.0 + math.exp(-z))


def _owner(col: str) -> str:
    """Map an encoded column back to the original field it came from."""
    if col in CONTINUOUS_COLS:
        return col
    for c in CATEGORICAL_COLS:
        if col.startswith(c + "_"):
            return c
    return col


def explain(raw_input: dict) -> dict:
    bl = _load_baseline()
    x = np.array(get_model().preprocess(raw_input)[0], dtype=np.float64)

    phi = bl["w"] * (x - bl["mean"])  # per encoded column, log-odds
    base = float(bl["w"] @ bl["mean"] + bl["b"])
    z = base + float(phi.sum())

    grouped: dict[str, float] = {}
    for col, v in zip(bl["cols"], phi):
        k = _owner(col)
        grouped[k] = grouped.get(k, 0.0) + float(v)

    total_abs = sum(abs(v) for v in grouped.values()) or 1.0
    rows = []
    for field, c in grouped.items():
        rows.append({
            "field": field,
            "label": LABELS.get(field, field),
            "value": raw_input.get(field),
            "contribution": round(c, 4),
            "share": round(100 * abs(c) / total_abs, 1),
            "direction": "approve" if c > 0 else ("reject" if c < 0 else "neutral"),
            "sensitive": field in SENSITIVE,
        })
    rows.sort(key=lambda r: abs(r["contribution"]), reverse=True)

    decision = "Approved" if z > 0 else "Rejected"
    pos = [r for r in rows if r["direction"] == "approve"][:3]
    neg = [r for r in rows if r["direction"] == "reject"][:3]

    def names(items):
        return ", ".join(f"{r['label']} ({r['value']})" for r in items) or "none"

    summary = (
        f"{decision}. Compared with an average applicant, the strongest factors "
        f"pushing towards approval were: {names(pos)}. "
        f"The strongest factors pushing towards rejection were: {names(neg)}."
    )

    return {
        "method": "SHAP (exact, linear model)",
        "units": "log-odds (positive = towards approval)",
        "decision": decision,
        "score": round(_sigmoid(z), 6),
        "base_value": round(base, 4),
        "base_probability": round(_sigmoid(base), 4),
        "final_value": round(z, 4),
        "contributions": rows,
        "summary": summary,
        "note": "Explanation is computed off-chain from the same model; it is not part of the ZK proof.",
    }
