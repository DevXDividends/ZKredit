import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { useToast } from "../context/ToastContext";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

const initial = {
  person_age: 28,
  person_gender: "female",
  person_education: "Bachelor",
  person_income: 65000,
  person_emp_exp: 5,
  person_home_ownership: "RENT",
  loan_amnt: 12000,
  loan_intent: "MEDICAL",
  loan_int_rate: 11.5,
  loan_percent_income: 0.18,
  cb_person_cred_hist_length: 6,
  credit_score: 680,
  previous_loan_defaults_on_file: "No",
};

const STEPS = [
  {
    title: "About you",
    subtitle: "Basic applicant details.",
    fields: [
      { key: "person_age", label: "Age", type: "number" },
      { key: "person_gender", label: "Gender", type: "select", options: ["female", "male"] },
      {
        key: "person_education",
        label: "Education",
        type: "select",
        options: ["High School", "Associate", "Bachelor", "Master", "Doctorate"],
      },
      { key: "person_home_ownership", label: "Home ownership", type: "select", options: ["RENT", "OWN", "MORTGAGE", "OTHER"] },
    ],
  },
  {
    title: "Income & employment",
    subtitle: "Your financial standing.",
    fields: [
      { key: "person_income", label: "Annual income ($)", type: "number" },
      { key: "person_emp_exp", label: "Years of employment", type: "number" },
      { key: "credit_score", label: "Credit score", type: "number" },
      { key: "cb_person_cred_hist_length", label: "Credit history length (yrs)", type: "number" },
      {
        key: "previous_loan_defaults_on_file",
        label: "Previous defaults on file",
        type: "select",
        options: ["No", "Yes"],
      },
    ],
  },
  {
    title: "This loan",
    subtitle: "What you're applying for.",
    fields: [
      { key: "loan_amnt", label: "Loan amount ($)", type: "number" },
      {
        key: "loan_intent",
        label: "Purpose",
        type: "select",
        options: ["PERSONAL", "EDUCATION", "MEDICAL", "VENTURE", "HOMEIMPROVEMENT", "DEBTCONSOLIDATION"],
      },
      { key: "loan_int_rate", label: "Interest rate (%)", type: "number", step: "0.1" },
      { key: "loan_percent_income", label: "Loan / income ratio", type: "number", step: "0.01" },
    ],
  },
];

function Field({ f, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-paper-muted font-mono">{f.label}</label>
      {f.type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(f.key, e.target.value)}
          className="bg-ink-surface border border-ink-border rounded-xl px-3.5 py-2.5 text-sm text-paper focus:outline-none focus:ring-1 focus:ring-paper focus:border-paper transition-colors"
        >
          {f.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="number"
          step={f.step || "1"}
          value={value}
          onChange={(e) => onChange(f.key, e.target.value)}
          required
          className="bg-ink-surface border border-ink-border rounded-xl px-3.5 py-2.5 text-sm text-paper focus:outline-none focus:ring-1 focus:ring-paper focus:border-paper transition-colors"
        />
      )}
    </div>
  );
}

export default function Apply() {
  const [form, setForm] = useState(initial);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const isLastStep = step === STEPS.length - 1;

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLastStep) {
      goNext();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...form,
        person_age: Number(form.person_age),
        person_income: Number(form.person_income),
        person_emp_exp: Number(form.person_emp_exp),
        loan_amnt: Number(form.loan_amnt),
        loan_int_rate: Number(form.loan_int_rate),
        loan_percent_income: Number(form.loan_percent_income),
        cb_person_cred_hist_length: Number(form.cb_person_cred_hist_length),
        credit_score: Number(form.credit_score),
      };
      const result = await api.submitApplication(payload);
      toast.success("Application submitted.");
      navigate(`/status/${result.id}`);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const variants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="font-mono text-xs text-paper-muted tracking-widest uppercase mb-3">New application</div>
      <h1 className="font-display text-3xl text-paper mb-2">Loan application</h1>
      <p className="text-paper-muted mb-10">
        Your details are sent to the model for a decision. Only a cryptographic commitment to
        this data — never the data itself — is ever recorded publicly.
      </p>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex-1">
            <div className="h-1 rounded-full bg-ink-border overflow-hidden mb-2">
              <motion.div
                className="h-full bg-paper"
                initial={false}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <span className={`text-[11px] font-mono ${i <= step ? "text-paper" : "text-paper-dim"}`}>{s.title}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-6">
                <h2 className="font-display text-xl text-paper mb-1">{STEPS[step].title}</h2>
                <p className="text-sm text-paper-dim">{STEPS[step].subtitle}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                {STEPS[step].fields.map((f) => (
                  <Field key={f.key} f={f} value={form[f.key]} onChange={update} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {error && (
          <div className="border border-reject/40 bg-reject-bg text-reject text-sm rounded-xl px-4 py-3 mt-8">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mt-10">
          <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0}>
            ← Back
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Spinner />}
            {isLastStep ? (submitting ? "Submitting…" : "Submit application") : "Continue →"}
          </Button>
        </div>
      </form>
    </div>
  );
}
