import { motion } from "framer-motion";

const POINTS = [
  "Zero-knowledge proofs on every decision",
  "Model weights never leave the bank",
  "Fairness monitored across every group",
];

/**
 * Left-hand decorative panel shown alongside auth forms (login/signup).
 * Hidden below the lg breakpoint to keep mobile forms full-width.
 */
export default function AuthShowcase() {
  return (
    <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-ink-surface border-r border-ink-border px-12 py-16">
      <div className="absolute inset-0 bg-dot-grid opacity-30 [mask-image:radial-gradient(ellipse_70%_70%_at_30%_20%,#000,transparent)]" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-white glow-orb animate-float" />

      <div className="relative">
        <span className="font-display font-semibold text-2xl text-paper">
          ZK<span className="text-paper-muted">redit</span>
        </span>
      </div>

      <div className="relative">
        <h2 className="font-display text-3xl text-paper leading-tight mb-8 max-w-sm">
          Lending decisions, proven mathematically — not just promised.
        </h2>
        <div className="flex flex-col gap-4">
          {POINTS.map((p, i) => (
            <motion.div
              key={p}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.1 }}
              className="flex items-center gap-3"
            >
              <span className="w-6 h-6 rounded-full border border-ink-border flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-3 h-3 text-paper" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <span className="text-sm text-paper-muted">{p}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="relative font-mono text-[11px] text-paper-dim">
        witness → prove → verify
      </div>
    </div>
  );
}
