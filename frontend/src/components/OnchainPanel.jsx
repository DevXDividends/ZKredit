import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../api";
import { useToast } from "../context/ToastContext";
import Button from "./ui/Button";
import Spinner from "./ui/Spinner";

/**
 * Shows the "verify on-chain" step. Renders nothing when the backend has
 * on-chain verification switched off, or when there is no proof yet.
 */
export default function OnchainPanel({ applicationId, app, onDone }) {
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [tamper, setTamper] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api.onchainStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  const hasProof = app.proof_status === "proven" || app.proof_status === "verified";
  if (!status?.enabled || !hasProof) return null;

  const txHash = app.onchain_tx_hash;
  const explorerUrl = status.explorer_tx_url && txHash ? `${status.explorer_tx_url}${txHash}` : null;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.submitOnchain(applicationId);
      setReceipt(res);
      toast.success("Proof verified on-chain.");
      await onDone?.();
    } catch (err) {
      setError(err.message);
      toast.error("On-chain verification failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const runTamperCheck = async () => {
    setChecking(true);
    setError(null);
    try {
      setTamper(await api.onchainTamperCheck(applicationId));
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-ink-border rounded-2xl bg-ink-surface p-6 mt-6"
    >
      <h3 className="font-display text-lg text-paper mb-2">On-chain verification</h3>
      <p className="text-sm text-paper-muted leading-relaxed mb-4">
        Send this proof to a smart contract. The contract runs the zk-SNARK verifier itself; only if it
        accepts the proof is the decision recorded permanently on the blockchain
        {status.chain_id ? ` (chain ${status.chain_id})` : ""}.
      </p>

      {!txHash && (
        <Button onClick={submit} disabled={submitting} variant="outline" size="sm">
          {submitting && <Spinner className="w-3.5 h-3.5" />}
          {submitting ? "Waiting for the chain…" : "Verify on-chain"}
        </Button>
      )}

      {txHash && (
        <div className="border border-approve/40 bg-approve-bg rounded-xl p-4 mb-4">
          <div className="text-xs text-paper-muted font-mono mb-1">Verified on-chain · transaction</div>
          <div className="text-approve font-mono text-xs break-all">
            {explorerUrl ? (
              <a href={explorerUrl} target="_blank" rel="noreferrer" className="underline">
                {txHash}
              </a>
            ) : (
              txHash
            )}
          </div>
          {receipt && (
            <div className="text-xs text-paper-dim font-mono mt-2">
              block {receipt.block_number} · gas {receipt.gas_used.toLocaleString()} · recorded decision:{" "}
              {receipt.decision_label}
            </div>
          )}
          <div className="text-xs text-paper-dim font-mono mt-1 break-all">
            registry {status.registry_address}
          </div>
        </div>
      )}

      {error && (
        <div className="border border-reject/40 bg-reject-bg text-reject text-sm rounded-xl px-4 py-3 mt-3">
          {error}
        </div>
      )}

      <div className="mt-4">
        {!tamper && (
          <Button onClick={runTamperCheck} disabled={checking} variant="outline" size="sm">
            {checking && <Spinner className="w-3.5 h-3.5" />}
            {checking ? "Asking the chain…" : "Try a tampered proof on-chain"}
          </Button>
        )}
        {tamper && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="border border-approve/40 bg-approve-bg rounded-xl p-4">
              <div className="text-xs text-paper-muted font-mono mb-2">Your real proof</div>
              <span className="text-approve font-medium text-sm">
                {tamper.real_proof.accepted ? "Accepted by the contract" : tamper.real_proof.reason}
              </span>
            </div>
            <div className="border border-reject/40 bg-reject-bg rounded-xl p-4">
              <div className="text-xs text-paper-muted font-mono mb-2">Same proof, 1 byte flipped</div>
              <span className="text-reject font-medium text-sm">
                {tamper.tampered_proof.accepted ? "Accepted (unexpected)" : "Rejected by the contract"}
              </span>
            </div>
          </div>
        )}
        <p className="text-xs text-paper-dim font-mono mt-2">
          The tamper check is a dry run: no transaction is sent and nothing is recorded.
        </p>
      </div>
    </motion.div>
  );
}
