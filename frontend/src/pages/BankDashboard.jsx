import { useEffect, useState } from "react";
import { api } from "../api";
import ProofSeal from "../components/ProofSeal";

function StatCard({ label, value, accent }) {
  return (
    <div className="border border-ink-border rounded-lg bg-ink-surface px-5 py-4">
      <div className="text-xs text-paper-muted font-mono mb-2">{label}</div>
      <div className={`font-serif text-3xl ${accent || "text-paper"}`}>{value}</div>
    </div>
  );
}

function FairnessRow({ groupData }) {
  const flagged = groupData.disparate_impact_flag;
  return (
    <div className="border border-ink-border rounded-lg bg-ink-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-mono text-sm text-paper">{groupData.group_column}</h4>
        <span
          className={`font-mono text-xs px-2 py-0.5 rounded-full border ${
            flagged ? "text-reject border-reject/40" : "text-approve border-approve/40"
          }`}
        >
          DIR {groupData.disparate_impact_ratio?.toFixed(2)}
        </span>
      </div>
      <div className="space-y-2">
        {groupData.groups.map((g) => (
          <div key={g.group} className="flex items-center gap-3 text-xs">
            <span className="w-32 text-paper-muted truncate">{g.group}</span>
            <div className="flex-1 h-1.5 bg-ink rounded-full overflow-hidden">
              <div
                className={`h-full ${g.spd_flag ? "bg-reject" : "bg-seal"}`}
                style={{ width: `${Math.min(g.approval_rate * 100, 100)}%` }}
              />
            </div>
            <span className="font-mono text-paper-dim w-14 text-right">
              {(g.approval_rate * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BankDashboard() {
  const [summary, setSummary] = useState(null);
  const [applications, setApplications] = useState([]);
  const [fairness, setFairness] = useState(null);
  const [fairnessError, setFairnessError] = useState(null);

  useEffect(() => {
    api.bankSummary().then(setSummary).catch(() => {});
    api.bankApplications().then(setApplications).catch(() => {});
    api.fairnessReport().then(setFairness).catch((e) => setFairnessError(e.message));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <div className="font-mono text-xs text-seal-light tracking-widest uppercase mb-3">
        Bank ledger
      </div>
      <h1 className="font-serif text-3xl text-paper mb-10">Application register</h1>

      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-12">
          <StatCard label="Total applications" value={summary.total_applications} />
          <StatCard label="Approved" value={summary.approved} accent="text-approve" />
          <StatCard label="Rejected" value={summary.rejected} accent="text-reject" />
          <StatCard
            label="Approval rate"
            value={summary.approval_rate != null ? `${(summary.approval_rate * 100).toFixed(1)}%` : "—"}
          />
        </div>
      )}

      <h2 className="font-serif text-xl text-paper mb-4">Recent applications</h2>
      <div className="border border-ink-border rounded-lg overflow-hidden mb-14">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-raised text-paper-muted font-mono text-xs uppercase">
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Decision</th>
              <th className="text-left px-4 py-3">Confidence</th>
              <th className="text-left px-4 py-3">Proof</th>
              <th className="text-left px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-paper-dim font-mono text-xs">
                  No applications yet.
                </td>
              </tr>
            )}
            {applications.map((a) => (
              <tr key={a.id} className="border-t border-ink-border">
                <td className="px-4 py-3 font-mono text-xs text-paper-dim">{a.id.slice(0, 8)}</td>
                <td className={`px-4 py-3 font-medium ${a.decision === "Approved" ? "text-approve" : "text-reject"}`}>
                  {a.decision}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-paper-muted">
                  {(a.prediction_score * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3">
                  <ProofSeal status={a.proof_status} />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-paper-dim">
                  {new Date(a.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="font-serif text-xl text-paper mb-2">Fairness check</h2>
      <p className="text-sm text-paper-muted mb-6">
        Statistical parity across demographic groups. Disparate Impact Ratio (DIR) below 0.8
        flags a group under the EEOC four-fifths rule.
      </p>
      {fairnessError && (
        <div className="border border-ink-border bg-ink-surface text-paper-dim text-sm rounded px-4 py-3 font-mono">
          {fairnessError}
        </div>
      )}
      {fairness && (
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(fairness).map(([key, data]) => (
            <FairnessRow key={key} groupData={data} />
          ))}
        </div>
      )}
    </div>
  );
}
