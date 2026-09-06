import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api";
import ProofSeal from "../components/ProofSeal";
import Reveal from "../components/ui/Reveal";
import AnimatedCounter from "../components/ui/AnimatedCounter";
import Button from "../components/ui/Button";

function StatCard({ label, value, suffix = "", decimals = 0, delay = 0 }) {
  return (
    <Reveal delay={delay}>
      <div className="glass-card rounded-2xl px-5 py-5">
        <div className="text-xs text-paper-muted font-mono mb-2">{label}</div>
        <div className="font-display text-3xl text-paper">
          <AnimatedCounter value={value ?? 0} suffix={suffix} decimals={decimals} />
        </div>
      </div>
    </Reveal>
  );
}

function FairnessRow({ groupData, delay = 0 }) {
  const flagged = groupData.disparate_impact_flag;
  return (
    <Reveal delay={delay}>
      <div className="border border-ink-border rounded-2xl bg-ink-surface p-5">
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
                <motion.div
                  className={`h-full ${g.spd_flag ? "bg-reject" : "bg-paper"}`}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${Math.min(g.approval_rate * 100, 100)}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <span className="font-mono text-paper-dim w-14 text-right">{(g.approval_rate * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "Approved", label: "Approved" },
  { key: "Rejected", label: "Rejected" },
];

function exportCsv(rows) {
  const header = ["id", "decision", "confidence", "proof_status", "created_at"];
  const lines = rows.map((r) =>
    [r.id, r.decision, (r.prediction_score * 100).toFixed(1) + "%", r.proof_status, r.created_at].join(",")
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "zkredit-applications.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function BankDashboard() {
  const [summary, setSummary] = useState(null);
  const [applications, setApplications] = useState([]);
  const [fairness, setFairness] = useState(null);
  const [fairnessError, setFairnessError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.bankSummary().then(setSummary).catch(() => {});
    api.bankApplications().then(setApplications).catch(() => {});
    api.fairnessReport().then(setFairness).catch((e) => setFairnessError(e.message));
  }, []);

  const filtered = useMemo(() => {
    return applications.filter((a) => {
      const matchesFilter = filter === "all" || a.decision === filter;
      const matchesSearch = !search || a.id.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [applications, filter, search]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <Reveal>
        <div className="font-mono text-xs text-paper-muted tracking-widest uppercase mb-3">Bank ledger</div>
        <h1 className="font-display text-3xl text-paper mb-10">Application register</h1>
      </Reveal>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          <StatCard label="Total applications" value={summary.total_applications} />
          <StatCard label="Approved" value={summary.approved} delay={0.05} />
          <StatCard label="Rejected" value={summary.rejected} delay={0.1} />
          <StatCard
            label="Approval rate"
            value={summary.approval_rate != null ? summary.approval_rate * 100 : 0}
            suffix="%"
            decimals={1}
            delay={0.15}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="font-display text-xl text-paper">Recent applications</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID…"
            className="bg-ink-surface border border-ink-border rounded-full px-4 py-1.5 text-xs text-paper font-mono focus:outline-none focus:ring-1 focus:ring-paper focus:border-paper transition-colors w-40"
          />
          <div className="flex items-center gap-1 bg-ink-surface border border-ink-border rounded-full p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
                  filter === f.key ? "bg-accent text-ink" : "text-paper-muted hover:text-paper"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)} disabled={!filtered.length}>
            Export CSV
          </Button>
        </div>
      </div>

      <Reveal>
        <div className="border border-ink-border rounded-2xl overflow-hidden mb-14 overflow-x-auto">
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-paper-dim font-mono text-xs">
                    No applications match.
                  </td>
                </tr>
              )}
              {filtered.map((a, i) => (
                <motion.tr
                  key={a.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="border-t border-ink-border hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-paper-dim">{a.id.slice(0, 8)}</td>
                  <td className={`px-4 py-3 font-medium ${a.decision === "Approved" ? "text-approve" : "text-reject"}`}>
                    {a.decision}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-paper-muted">{(a.prediction_score * 100).toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    <ProofSeal status={a.proof_status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-paper-dim">{new Date(a.created_at).toLocaleString()}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>

      <Reveal>
        <h2 className="font-display text-xl text-paper mb-2">Fairness check</h2>
        <p className="text-sm text-paper-muted mb-6">
          Statistical parity across demographic groups. Disparate Impact Ratio (DIR) below 0.8 flags a group under
          the EEOC four-fifths rule.
        </p>
      </Reveal>
      {fairnessError && (
        <div className="border border-ink-border bg-ink-surface text-paper-dim text-sm rounded-xl px-4 py-3 font-mono">
          {fairnessError}
        </div>
      )}
      {fairness && (
        <div className="grid sm:grid-cols-2 gap-4">
          {Object.entries(fairness).map(([key, data], i) => (
            <FairnessRow key={key} groupData={data} delay={i * 0.06} />
          ))}
        </div>
      )}
    </div>
  );
}
