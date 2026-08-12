import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

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

const FIELD_GROUPS = [
  {
    title: "About you",
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

export default function Apply() {
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      navigate(`/status/${result.id}`);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="font-mono text-xs text-seal-light tracking-widest uppercase mb-3">
        New application
      </div>
      <h1 className="font-serif text-3xl text-paper mb-2">Loan application</h1>
      <p className="text-paper-muted mb-10">
        Your details are sent to the model for a decision. Only a cryptographic commitment to
        this data — never the data itself — is ever recorded publicly.
      </p>

      <form onSubmit={handleSubmit} className="space-y-10">
        {FIELD_GROUPS.map((group) => (
          <fieldset key={group.title}>
            <legend className="font-serif text-lg text-paper mb-4 pb-2 border-b border-ink-border w-full">
              {group.title}
            </legend>
            <div className="grid grid-cols-2 gap-5">
              {group.fields.map((f) => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <label className="text-xs text-paper-muted font-mono">{f.label}</label>
                  {f.type === "select" ? (
                    <select
                      value={form[f.key]}
                      onChange={(e) => update(f.key, e.target.value)}
                      className="bg-ink-surface border border-ink-border rounded px-3 py-2 text-sm text-paper focus:outline-none focus:ring-1 focus:ring-seal focus:border-seal"
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
                      value={form[f.key]}
                      onChange={(e) => update(f.key, e.target.value)}
                      required
                      className="bg-ink-surface border border-ink-border rounded px-3 py-2 text-sm text-paper focus:outline-none focus:ring-1 focus:ring-seal focus:border-seal"
                    />
                  )}
                </div>
              ))}
            </div>
          </fieldset>
        ))}

        {error && (
          <div className="border border-reject/40 bg-reject-bg text-reject text-sm rounded px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-seal text-ink font-medium rounded hover:bg-seal-light transition-colors disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </div>
  );
}
