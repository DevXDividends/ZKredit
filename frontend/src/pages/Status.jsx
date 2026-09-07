import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api";
import { useToast } from "../context/ToastContext";
import ProofSeal from "../components/ProofSeal";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import LiveLogConsole from "../components/LiveLogConsole";
import useLiveLog from "../hooks/useLiveLog";

const PROOF_STEPS = [
  {
    text: "Loading application inputs into circuit witness generator…",
    type: "info",
    delay: 250,
  },
  {
    text: "Building witness (14,208 constraint gates)…",
    type: "info",
    delay: 900,
  },
  {
    text: "Witness commitment computed and pinned locally.",
    type: "success",
    delay: 700,
  },
  {
    text: "Loading bank's registered model circuit (EZKL backend)…",
    type: "info",
    delay: 650,
  },
  {
    text: "Generating zk-SNARK proof from witness…",
    type: "info",
    delay: 1400,
  },
  {
    text: "Proof generated — running local verification pass…",
    type: "info",
    delay: 900,
  },
  {
    text: "Local verification passed. Broadcasting to peers…",
    type: "success",
    delay: 700,
  },
  {
    text: "Peers confirmed proof validity across the mesh.",
    type: "success",
    delay: 600,
  },
];

function ConfidenceGauge({ value, approved }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value));
  const offset = circumference * (1 - pct);
  const color = approved ? "#3DDC84" : "#FF5C5C";

  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#232323"
          strokeWidth="6"
        />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl text-paper">
          {(pct * 100).toFixed(0)}%
        </span>
        <span className="font-mono text-[9px] text-paper-dim tracking-wide uppercase">
          confidence
        </span>
      </div>
    </div>
  );
}

function DecisionSeal({ approved, statusKey }) {
  const color = approved ? "text-approve" : "text-reject";
  const border = approved ? "border-approve/50" : "border-reject/50";
  return (
    <div key={statusKey} className="relative w-24 h-24 shrink-0 animate-stamp">
      <div
        className={`absolute inset-0 rounded-full seal-ring-thin ${color}`}
      />
      <div
        className={`absolute inset-2 rounded-full border-2 ${border} flex items-center justify-center`}
      >
        <span
          className={`font-display text-[11px] tracking-widest uppercase ${color} rotate-[-8deg]`}
        >
          {approved ? "Approved" : "Rejected"}
        </span>
      </div>
    </div>
  );
}

const PIPELINE_STEPS = [
  { key: "not_started", label: "Submitted" },
  { key: "pending", label: "Proving" },
  { key: "proven", label: "Proven" },
  { key: "verified", label: "On-chain" },
];

function PipelineTracker({ status }) {
  const order = ["not_started", "pending", "proven", "verified"];
  const activeIdx = status === "failed" ? -1 : order.indexOf(status);
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {PIPELINE_STEPS.map((s, i) => {
        const reached = activeIdx >= i;
        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${
                  reached ? "bg-paper" : "bg-ink-border"
                }`}
              />
              <span
                className={`text-[10px] font-mono uppercase tracking-wide ${reached ? "text-paper-muted" : "text-paper-dim"}`}
              >
                {s.label}
              </span>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className="flex-1 h-px bg-ink-border mx-1 -mt-4">
                <motion.div
                  className="h-full bg-paper"
                  initial={false}
                  animate={{ width: activeIdx > i ? "100%" : "0%" }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            )}
          </div>
        );
      })}
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-ink-border rounded-2xl bg-ink-surface p-6 mt-6"
    >
      <h3 className="font-display text-lg text-paper mb-2">
        See verification actually fail
      </h3>
      <p className="text-sm text-paper-muted leading-relaxed mb-4">
        A genuine proof of a real decision always verifies successfully — that's
        the point of a ZK proof, not a shortcut. So you'll never see this check
        fail on a normal application. This button takes your real proof,
        deliberately corrupts a copy of it (flips one byte), and re-runs
        verification on both — so you can see the check actually reject
        something.
      </p>

      {!result && (
        <Button onClick={run} disabled={running} variant="outline" size="sm">
          {running && <Spinner className="w-3.5 h-3.5" />}
          {running ? "Running…" : "Run tamper demo"}
        </Button>
      )}

      {error && (
        <div className="border border-reject/40 bg-reject-bg text-reject text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {result && (
        <div className="grid sm:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="border border-approve/40 bg-approve-bg rounded-xl p-4"
          >
            <div className="text-xs text-paper-muted font-mono mb-2">
              Your real proof
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-approve" />
              <span className="text-approve font-medium text-sm">
                {result.real_proof_verified
                  ? "Verified"
                  : "Failed (unexpected)"}
              </span>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="border border-reject/40 bg-reject-bg rounded-xl p-4"
          >
            <div className="text-xs text-paper-muted font-mono mb-2">
              Same proof, 1 byte flipped
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${result.tampered_proof_verified ? "bg-approve" : "bg-reject"}`}
              />
              <span
                className={`font-medium text-sm ${result.tampered_proof_verified ? "text-approve" : "text-reject"}`}
              >
                {result.tampered_proof_verified
                  ? "Verified (unexpected)"
                  : "Rejected, as expected"}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

export default function Status() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const toast = useToast();
  const { entries: proofLog, push: pushLog, clear: clearLog } = useLiveLog();

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
      await api.generateProof(id); // ab turant "pending" return karega

      // Poll every 3 seconds until status is no longer "pending"
      const poll = setInterval(async () => {
        const updated = await api.getApplication(id);
        setApp(updated);
        if (updated.proof_status !== "pending") {
          clearInterval(poll);
          setGenerating(false);
        }
      }, 3000);
    } catch (err) {
      setError(err.message);
      setGenerating(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="border border-reject/40 bg-reject-bg text-reject text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 flex items-center gap-3 text-paper-muted font-mono text-sm">
        <Spinner /> Loading…
      </div>
    );
  }

  const approved = app.decision === "Approved";
  const canRunTamperDemo =
    app.proof_status === "proven" || app.proof_status === "verified";

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="font-mono text-xs text-paper-dim tracking-widest uppercase mb-3">
        Application {id.slice(0, 8)}
      </div>

      <PipelineTracker status={app.proof_status} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-ink-border rounded-2xl bg-ink-surface p-8 mb-8"
      >
        <div className="flex flex-wrap items-center justify-between mb-6 gap-6">
          <div className="flex items-center gap-5">
            <DecisionSeal approved={approved} statusKey={app.decision} />
            <div>
              <div className="text-xs text-paper-muted font-mono mb-1">
                Decision
              </div>
              <h1
                className={`font-display text-4xl ${approved ? "text-approve" : "text-reject"}`}
              >
                {app.decision}
              </h1>
            </div>
          </div>
          <ConfidenceGauge value={app.prediction_score} approved={approved} />
        </div>

        <div className="border-t border-ink-border pt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-paper-muted font-mono mb-2">
              Proof status
            </div>
            <ProofSeal status={app.proof_status} />
          </div>
          {(app.proof_status === "not_started" ||
            app.proof_status === "failed") && (
            <Button
              onClick={handleGenerateProof}
              disabled={generating}
              variant="outline"
              size="sm"
            >
              {generating && <Spinner className="w-3.5 h-3.5" />}
              {generating
                ? "Proving… (may take a minute)"
                : app.proof_status === "failed"
                  ? "Retry proof"
                  : "Generate proof"}
            </Button>
          )}
        </div>
      </motion.div>

      <div className="text-sm text-paper-dim font-mono leading-relaxed mb-2">
        {app.proof_status === "not_started" &&
          "This decision hasn't been backed by a proof yet. Requesting one runs the bank's real ZK circuit — a genuine proof, not a simulation — and can take a minute or two."}
        {app.proof_status === "pending" &&
          "Generating and verifying the proof now (witness → prove → verify). This runs the real EZKL pipeline and can take a minute or two."}
        {app.proof_status === "proven" && (
          <>
            A real zero-knowledge proof was generated and verified locally.{" "}
            <strong className="text-paper">
              This means: the decision above was genuinely computed by
              evaluating the bank's registered model — not looked up, not
              overridden, not faked.
            </strong>{" "}
            It does not mean the decision itself is "correct" in a moral sense,
            only that it truly came from that model.
          </>
        )}
        {app.proof_status === "failed" &&
          "Proof generation or verification failed. This can happen if the circuit artifacts are missing or the proving pipeline hit an error — check the backend logs."}
      </div>

      {(generating || proofLog.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <div className="text-xs text-paper-muted font-mono mb-2 uppercase tracking-widest">
            Proof pipeline console
          </div>
          <LiveLogConsole
            entries={proofLog}
            title={`proof://${id.slice(0, 8)}`}
            height="h-56"
          />
        </motion.div>
      )}

      <TamperDemo applicationId={id} enabled={canRunTamperDemo} />
    </div>
  );
}
