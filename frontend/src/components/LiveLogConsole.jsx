import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DOT = {
  info: "bg-paper-dim",
  success: "bg-approve",
  warn: "bg-pending",
  error: "bg-reject",
};

const TEXT = {
  info: "text-paper-muted",
  success: "text-approve",
  warn: "text-pending",
  error: "text-reject",
};

export default function LiveLogConsole({ entries, title = "network.log", height = "h-72", liveLabel = "LIVE" }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  return (
    <div className="rounded-2xl border border-ink-border bg-[#020202] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink-border bg-ink-raised/60">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-reject/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-pending/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-approve/70" />
          <span className="ml-2 font-mono text-[11px] text-paper-dim">{title}</span>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-approve tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-approve animate-pulse" />
          {liveLabel}
        </span>
      </div>
      <div ref={scrollRef} className={`${height} overflow-y-auto px-4 py-3 font-mono text-[12px] leading-relaxed`}>
        <AnimatePresence initial={false}>
          {entries.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 py-0.5"
            >
              <span className="text-paper-dim/60 shrink-0">{e.ts}</span>
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${DOT[e.type] || DOT.info}`} />
              <span className={`${TEXT[e.type] || TEXT.info} break-all`}>{e.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {entries.length === 0 && (
          <div className="text-paper-dim/60 flex items-center gap-2">
            <span className="w-1.5 h-2.5 bg-paper-dim/60 animate-pulse" /> awaiting activity…
          </div>
        )}
      </div>
    </div>
  );
}
