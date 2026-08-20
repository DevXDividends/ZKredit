import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import ProofSeal from "../components/ProofSeal";

function ConfidenceGauge({ value, approved }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value));
  const offset = circumference * (1 - pct);
  const color = approved ? "#3FA873" : "#C15B4A";

  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#28353F" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl text-paper">{(pct * 100).toFixed(0)}%</span>
        <span className="font-mono text-[9px] text-paper-dim tracking-wide uppercase">confidence</span>
      </div>
    </div>
  );
}

function DecisionSeal({ approved, statusKey }) {
  const color = approved ? "text-approve" : "text-reject";
  const border = approved ? "border-approve/50" : "border-reject/50";
  return (
    <div key={statusKey} className="relative w-24 h-24 shrink-0 animate-stamp">
      <div className={`absolute inset-0 rounded-full seal-ring-thin ${color}`} />
      <div className={`absolute inset-2 rounded-full border-2 ${border} flex items-center justify-center`}>
        <span className={`font-serif text-[11px] tracking-widest uppercase ${color} rotate-[-8deg]`}>
          {approved ? "Approved" : "Rejected"}
        </span>
      </div>
    </div>
  );
}

function TamperDemo({ applicationId, enabled }) {
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await api.runTamperDemo(applicationId);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  if (!enabled) return null;

  return (
    <div className="border border-ink-border rounded-lg bg-ink-surface p-6 mt-6">
      <h3 className="font-serif text-lg text-paper mb-2">See verification actually fail</h3>
      <p className="text-sm text-paper-muted leading-relaxed mb-4">
        A genuine proof of a real decision always verifies successfully — that's the point of a
        ZK proof, not a shortcut. So you'll never see this check fail on a normal application.
        This button takes your real proof, deliberately corrupts a copy of it (flips one byte),
        and re-runs verification on both — so you can see the check actually reject something.
      </p>

      {!result && (
        <button
          onClick={run}
          disabled={running}
          className="px-4 py-2 border border-seal-dim text-seal-light text-sm rounded hover:bg-seal/10 hover:border-seal transition-colors disabled:opacity-50"
        >
          {running ? "Running…" : "Run tamper demo"}
        </button>
      )}

      {error && (
        <div className="border border-reject/40 bg-reject-bg text-reject text-sm rounded px-4 py-3">
          {error}
        </div>
      )}

      {result && (
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-approve/40 bg-approve-bg rounded-lg p-4">
            <div className="text-xs text-paper-muted font-mono mb-2">Your real proof</div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-approve" />
              <span className="text-approve font-medium text-sm">
                {result.real_proof_verified ? "Verified" : "Failed (unexpected)"}
              </span>
            </div>
          </div>
          <div className="border border-reject/40 bg-reject-bg rounded-lg p-4">
            <div className="text-xs text-paper-muted font-mono mb-2">Same proof, 1 byte flipped</div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${result.tampered_proof_verified ? "bg-approve" : "bg-reject"}`} />
              <span className={`font-medium text-sm ${result.tampered_proof_verified ? "text-approve" : "text-reject"}`}>
                {result.tampered_proof_verified ? "Verified (unexpected)" : "Rejected, as expected"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Status() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    try {
      const data = await api.getApplication(id);
      setApp(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleGenerateProof = async () => {
    setGenerating(true);
    try {
      await api.generateProof(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="border border-reject/40 bg-reject-bg text-reject text-sm rounded px-4 py-3">
          {error}
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-paper-muted font-mono text-sm">
        Loading…
      </div>
    );
  }

  const approved = app.decision === "Approved";
  const canRunTamperDemo = app.proof_status === "proven" || app.proof_status === "verified";

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="font-mono text-xs text-paper-dim tracking-widest uppercase mb-3">
        Application {id.slice(0, 8)}
      </div>

      <div className="border border-ink-border rounded-lg bg-ink-surface p-8 mb-8">
        <div className="flex items-center justify-between mb-6 gap-6">
          <div className="flex items-center gap-5">
            <DecisionSeal approved={approved} statusKey={app.decision} />
            <div>
              <div className="text-xs text-paper-muted font-mono mb-1">Decision</div>
              <h1 className={`font-serif text-4xl ${approved ? "text-approve" : "text-reject"}`}>
                {app.decision}
              </h1>
            </div>
          </div>
          <ConfidenceGauge value={app.prediction_score} approved={approved} />
        </div>

        <div className="border-t border-ink-border pt-6 flex items-center justify-between">
          <div>
            <div className="text-xs text-paper-muted font-mono mb-2">Proof status</div>
            <ProofSeal status={app.proof_status} />
          </div>
          {(app.proof_status === "not_started" || app.proof_status === "failed") && (
            <button
              onClick={handleGenerateProof}
              disabled={generating}
              className="px-4 py-2 border border-seal-dim text-seal-light text-sm rounded hover:bg-seal/10 hover:border-seal transition-colors disabled:opacity-50"
            >
              {generating ? "Proving… (may take a minute)" : app.proof_status === "failed" ? "Retry proof" : "Generate proof"}
            </button>
          )}
        </div>
      </div>

      <div className="text-sm text-paper-dim font-mono leading-relaxed mb-2">
        {app.proof_status === "not_started" &&
          "This decision hasn't been backed by a proof yet. Requesting one runs the bank's real ZK circuit — a genuine proof, not a simulation — and can take a minute or two."}
        {app.proof_status === "pending" &&
          "Generating and verifying the proof now (witness → prove → verify). This runs the real EZKL pipeline and can take a minute or two."}
        {app.proof_status === "proven" && (
          <>
            A real zero-knowledge proof was generated and verified locally. <strong className="text-paper">
            This means: the decision above was genuinely computed by evaluating the bank's registered
            model — not looked up, not overridden, not faked.</strong> It does not mean the decision
            itself is "correct" in a moral sense, only that it truly came from that model.
          </>
        )}
        {app.proof_status === "failed" &&
          "Proof generation or verification failed. This can happen if the circuit artifacts are missing or the proving pipeline hit an error — check the backend logs."}
      </div>

      <TamperDemo applicationId={id} enabled={canRunTamperDemo} />
    </div>
  );
}