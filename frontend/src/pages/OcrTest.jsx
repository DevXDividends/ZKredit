import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api";
import { useToast } from "../context/ToastContext";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

const FIELD_LABELS = {
  person_age: "Applicant age",
  person_gender: "Gender",
  person_education: "Education level",
  person_income: "Annual income",
  person_emp_exp: "Employment experience",
  person_home_ownership: "Home ownership",
  loan_amnt: "Requested loan amount",
  loan_intent: "Loan intent",
  loan_int_rate: "Interest rate",
  loan_percent_income: "Loan-to-income ratio",
  cb_person_cred_hist_length: "Credit history length",
  credit_score: "Credit score",
  previous_loan_defaults_on_file: "Previous defaults on file",
};

function ComparisonRow({ label, groundTruth, extracted }) {
  const hasGroundTruth = groundTruth !== undefined && groundTruth !== null;
  const match = !hasGroundTruth || String(groundTruth) === String(extracted ?? "");
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b border-ink-border text-sm">
      <span className="text-paper-muted font-mono text-xs">{label}</span>
      <span className="text-paper">{extracted ?? "—"}</span>
      {hasGroundTruth && (
        <span className={match ? "text-approve" : "text-reject"}>
          {match ? "✓ matches" : `✗ expected ${groundTruth}`}
        </span>
      )}
    </div>
  );
}

export default function OcrTest() {
  const [generated, setGenerated] = useState(null); // { pdf_base64, ground_truth }
  const [extracted, setExtracted] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const toast = useToast();

  const handleGenerate = async () => {
    setBusy(true);
    setError(null);
    setExtracted(null);
    try {
      const doc = await api.generateTestPdf();
      setGenerated(doc);
    } catch (err) {
      setError(err.message || "Could not generate a test PDF.");
    } finally {
      setBusy(false);
    }
  };

  const base64ToFile = (base64, filename, mime) => {
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new File([arr], filename, { type: mime });
  };

  const runExtraction = async (file) => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.extractApplicationPdf(file);
      setExtracted(result);
      toast.success(result.mock ? "Extracted (mock mode)." : "Extracted via Groq vision model.");
    } catch (err) {
      setError(err.message || "Extraction failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleTestGenerated = () => {
    if (!generated) return;
    runExtraction(base64ToFile(generated.pdf_base64, "test-application.pdf", "application/pdf"));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setGenerated(null); // no ground truth for a real, user-supplied document
      runExtraction(file);
    }
  };

  const handleDownload = () => {
    if (!generated) return;
    const a = document.createElement("a");
    a.href = `data:application/pdf;base64,${generated.pdf_base64}`;
    a.download = "test-loan-application.pdf";
    a.click();
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="font-mono text-xs text-paper-muted tracking-widest uppercase mb-3">OCR pipeline</div>
      <h1 className="font-display text-3xl text-paper mb-2">Loan Application Scanner</h1>
      <p className="text-paper-muted mb-10">
        Generates a fabricated loan-application PDF with known values, then runs it through OCR
        extraction to confirm the same 13 fields the Apply form collects manually can be read
        back correctly — or upload a real scanned PDF instead. Images are sent to Groq's vision
        model for extraction (or handled in mock mode if no Groq key is configured server-side).
      </p>

      <div className="grid sm:grid-cols-2 gap-6 mb-10">
        <div className="border border-ink-border rounded-2xl p-6 bg-ink-surface">
          <h2 className="font-display text-lg text-paper mb-3">1. Generate a test PDF</h2>
          <p className="text-sm text-paper-dim mb-4">
            Renders a fake application form with randomized values — nothing real, purely for
            testing extraction accuracy.
          </p>
          <Button onClick={handleGenerate} disabled={busy} variant="outline" className="w-full mb-3">
            {busy && <Spinner />} Generate test PDF
          </Button>
          {generated && (
            <div className="flex gap-2">
              <Button onClick={handleDownload} variant="ghost" size="sm">
                Download PDF
              </Button>
              <Button onClick={handleTestGenerated} disabled={busy} size="sm">
                {busy && <Spinner />} Run OCR on this
              </Button>
            </div>
          )}
        </div>

        <div className="border border-ink-border rounded-2xl p-6 bg-ink-surface">
          <h2 className="font-display text-lg text-paper mb-3">2. Or upload a real PDF</h2>
          <p className="text-sm text-paper-dim mb-4">A scanned or printed loan application, under 10MB.</p>
          <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} disabled={busy} variant="outline" className="w-full">
            {busy && <Spinner />} Choose a PDF
          </Button>
        </div>
      </div>

      {error && (
        <div className="border border-reject/40 bg-reject-bg text-reject text-sm rounded-xl px-4 py-3 mb-8">
          {error}
        </div>
      )}

      {extracted && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-ink-border rounded-2xl p-6 bg-ink-surface"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-paper">Extraction result</h2>
            <span className="font-mono text-xs text-paper-dim">
              {extracted.mock ? "mock mode — set GROQ_API_KEY for real OCR" : "via Groq vision model"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 pb-2 border-b border-ink-border text-xs font-mono text-paper-dim uppercase">
            <span>Field</span>
            <span>Extracted</span>
            <span>{generated ? "Check" : ""}</span>
          </div>
          {Object.entries(FIELD_LABELS).map(([key, label]) => (
            <ComparisonRow key={key} label={label} extracted={extracted[key]} groundTruth={generated?.ground_truth?.[key]} />
          ))}
        </motion.div>
      )}
    </div>
  );
}