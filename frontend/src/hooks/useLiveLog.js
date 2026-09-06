import { useCallback, useEffect, useRef, useState } from "react";

let seq = 0;

function timestamp() {
  const d = new Date();
  return d.toTimeString().slice(0, 8) + "." + String(d.getMilliseconds()).padStart(3, "0");
}

const AMBIENT_POOL = [
  { type: "info", text: () => `peer node-${hex(4)} gossiped block header #${block()}` },
  { type: "success", text: () => `witness commitment confirmed by validator-${(1 + Math.floor(Math.random() * 24))}` },
  { type: "info", text: () => `mempool: ${1 + Math.floor(Math.random() * 6)} application(s) queued for proving` },
  { type: "success", text: () => `proof batch #${block()} verified in ${(0.8 + Math.random() * 1.6).toFixed(2)}s` },
  { type: "info", text: () => `circuit constraint check passed (${14000 + Math.floor(Math.random() * 800)} gates)` },
  { type: "info", text: () => `new peer joined network: node-${hex(4)}` },
  { type: "success", text: () => `consensus round finalized: block #${block()}` },
  { type: "warn", text: () => `peer node-${hex(4)} latency spike (${(120 + Math.random() * 340).toFixed(0)}ms)` },
  { type: "info", text: () => `fairness monitor: disparate-impact scan complete, no new flags` },
  { type: "success", text: () => `model commitment hash pinned: 0x${hex(10)}…` },
  { type: "info", text: () => `syncing merkle root across ${8 + Math.floor(Math.random() * 12)} nodes` },
  { type: "success", text: () => `zk-SNARK verified on-chain · gas: ${(21000 + Math.random() * 4000).toFixed(0)}` },
];

function hex(n) {
  let s = "";
  for (let i = 0; i < n; i++) s += "0123456789abcdef"[Math.floor(Math.random() * 16)];
  return s;
}
function block() {
  return 128000 + Math.floor(Math.random() * 9000);
}

/**
 * Manages an append-only feed of terminal-style log lines.
 * - ambient: when true, auto-generates a plausible network/proof feed on an interval.
 * - push(text, type): imperatively add a line (used to narrate a real action, e.g. proof generation).
 */
export default function useLiveLog({ ambient = false, intervalMs = [700, 1900], max = 160 } = {}) {
  const [entries, setEntries] = useState([]);
  const timerRef = useRef(null);

  const push = useCallback((text, type = "info") => {
    setEntries((prev) => {
      const next = [...prev, { id: ++seq, text, type, ts: timestamp() }];
      return next.length > max ? next.slice(next.length - max) : next;
    });
  }, [max]);

  const clear = useCallback(() => setEntries([]), []);

  useEffect(() => {
    if (!ambient) return;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const item = AMBIENT_POOL[Math.floor(Math.random() * AMBIENT_POOL.length)];
      push(item.text(), item.type);
      const [min, maxD] = intervalMs;
      timerRef.current = setTimeout(tick, min + Math.random() * (maxD - min));
    };
    timerRef.current = setTimeout(tick, 400);
    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambient]);

  return { entries, push, clear };
}
