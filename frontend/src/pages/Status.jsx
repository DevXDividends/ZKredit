import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import ProofSeal from "../components/ProofSeal";

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

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="font-mono text-xs text-paper-dim tracking-widest uppercase mb-3">
        Application {id.slice(0, 8)}
      </div>

      <div className="border border-ink-border rounded-lg bg-ink-surface p-8 mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs text-paper-muted font-mono mb-1">Decision</div>
            <h1 className={`font-serif text-4xl ${approved ? "text-approve" : "text-reject"}`}>
              {app.decision}
            </h1>
          </div>
          <div className="text-right">
            <div className="text-xs text-paper-muted font-mono mb-1">Model confidence</div>
            <div className="font-mono text-2xl text-paper">
              {(app.prediction_score * 100).toFixed(1)}%
            </div>
          </div>
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
              className="px-4 py-2 border border-seal-dim text-seal-light text-sm rounded hover:bg-seal/10 transition-colors disabled:opacity-50"
            >
              {generating ? "Proving… (may take a minute)" : app.proof_status === "failed" ? "Retry proof" : "Generate proof"}
            </button>
          )}
        </div>
      </div>

      <div className="text-sm text-paper-dim font-mono leading-relaxed">
        {app.proof_status === "not_started" &&
          "This decision hasn't been backed by a proof yet. Requesting one runs the bank's real ZK circuit — a genuine proof, not a simulation — and can take a minute or two."}
        {app.proof_status === "pending" &&
          "Generating and verifying the proof now (witness → prove → verify). This runs the real EZKL pipeline and can take a minute or two."}
        {app.proof_status === "proven" &&
          "A real zero-knowledge proof was generated and verified locally — this confirms the bank's registered model produced this exact decision. Not yet submitted on-chain."}
        {app.proof_status === "failed" &&
          "Proof generation or verification failed. This can happen if the circuit artifacts are missing or the proving pipeline hit an error — check the backend logs."}
      </div>
    </div>
  );
}