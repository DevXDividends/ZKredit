import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api";
import Spinner from "./ui/Spinner";

/**
 * "Why this decision?" — per-field SHAP contributions as diverging bars.
 * Green bars pushed towards approval, red bars towards rejection.
 */
export default function XaiPanel({ applicationId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .explainApplication(applicationId)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [applicationId]);

  if (error) {
    return (
      <div className="border border-ink-border rounded-2xl bg-ink-surface p-6 mt-6 text-sm text-paper-muted">
        Explanation unavailable: {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="border border-ink-border rounded-2xl bg-ink-surface p-6 mt-6">
        <Spinner className="w-4 h-4" />
      </div>
    );
  }

  const max = Math.max(...data.contributions.map((c) => Math.abs(c.contribution)), 0.0001);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-ink-border rounded-2xl bg-ink-surface p-6 mt-6"
    >
      <h3 className="font-display text-lg text-paper mb-2">Why this decision?</h3>
      <p className="text-sm text-paper-muted leading-relaxed mb-5">{data.summary}</p>

      <div className="space-y-2">
        {data.contributions.map((c) => {
          const pct = (Math.abs(c.contribution) / max) * 50; // each side of the centre line
          const positive = c.contribution >= 0;
          return (
            <div key={c.field} className="grid grid-cols-[9rem_1fr_4rem] items-center gap-3 text-xs">
              <div className="text-paper truncate" title={`${c.label}: ${c.value}`}>
                {c.label}
                <span className="text-paper-dim"> · {String(c.value)}</span>
                {c.sensitive && <span className="ml-1 text-reject" title="Protected characteristic">⚑</span>}
              </div>
              <div className="relative h-3 bg-ink-border/40 rounded">
                <div className="absolute inset-y-0 left-1/2 w-px bg-ink-border" />
                <div
                  className={`absolute inset-y-0 rounded ${positive ? "bg-approve" : "bg-reject"}`}
                  style={positive ? { left: "50%", width: `${pct}%` } : { right: "50%", width: `${pct}%` }}
                />
              </div>
              <div className={`font-mono text-right ${positive ? "text-approve" : "text-reject"}`}>
                {positive ? "+" : ""}
                {c.contribution.toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-paper-dim leading-relaxed mt-5">
        Bars show how much each field moved this applicant's score away from the average applicant
        (log-odds; right = towards approval). ⚑ marks protected characteristics. Method: {data.method}.
        This explanation is calculated off-chain from the same model; the zero-knowledge proof covers the
        decision, not the explanation.
      </p>
    </motion.div>
  );
}
