const STATES = {
  not_started: { label: "Unproven", color: "text-paper-dim border-ink-border", dot: "bg-paper-dim" },
  pending: { label: "Proof Pending", color: "text-seal-light border-seal-dim", dot: "bg-seal animate-pulse" },
  generated: { label: "Proof Generated", color: "text-seal-light border-seal-dim", dot: "bg-seal" },
  verified: { label: "Verified On-Chain", color: "text-approve border-approve/40", dot: "bg-approve" },
  failed: { label: "Verification Failed", color: "text-reject border-reject/40", dot: "bg-reject" },
};

export default function ProofSeal({ status }) {
  const s = STATES[status] || STATES.not_started;
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border font-mono text-xs ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
