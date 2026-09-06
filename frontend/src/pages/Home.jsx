import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Reveal from "../components/ui/Reveal";
import Button from "../components/ui/Button";
import AnimatedCounter from "../components/ui/AnimatedCounter";
import Sketchfab3D from "../components/Sketchfab3D";

/* ── Data ─────────────────────────────────────────────────────────────────── */
const STEPS = [
  {
    n: "01",
    title: "Applicant submits",
    body: "Income, credit history, and loan details go straight to the model — never to a public ledger.",
  },
  {
    n: "02",
    title: "Circuit proves",
    body: "A zero-knowledge proof attests the decision came from the bank's registered model, unmodified.",
  },
  {
    n: "03",
    title: "Chain verifies",
    body: "Anyone can check the proof on-chain. No one can see the model weights or the applicant's data.",
  },
];

const FEATURES = [
  {
    title: "Model privacy",
    body: "The bank's underwriting weights never leave its infrastructure — only a succinct proof does.",
    icon: <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" />,
  },
  {
    title: "Cryptographic certainty",
    body: "A regulator gets a mathematical certificate, not a promise — the same model made every call.",
    icon: <path d="M9 12.5 11 15l4-6M12 3l8 4v5c0 5-3.4 9-8 10-4.6-1-8-5-8-10V7l8-4Z" />,
  },
  {
    title: "Tamper-evident",
    body: "Flip a single bit in a proof and verification fails instantly — no silent corruption, ever.",
    icon: <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1" />,
  },
  {
    title: "Fairness built-in",
    body: "Disparate-impact monitoring runs across every demographic group, continuously, on the ledger.",
    icon: <path d="M4 20V10M12 20V4M20 20v-7" />,
  },
];

const FAQS = [
  {
    q: "What is actually being proven?",
    a: "That the published decision is the true output of the bank's registered model — not a manual override, not a different model.",
  },
  {
    q: "Does ZKredit see my raw financial data?",
    a: "Only a cryptographic commitment — not the underlying figures — is ever published or stored on-chain.",
  },
  {
    q: "Can the bank change its model after approving my loan?",
    a: "Every proof is bound to a specific, versioned model commitment, so past decisions stay verifiably tied to the model that made them.",
  },
  {
    q: "What happens if a proof fails verification?",
    a: "The decision is flagged immediately and cannot be presented as verified. See it live in the tamper demo.",
  },
];

/* ── Animated ticker (scrolling proof hashes) ────────────────────────────── */
const TICKER_ITEMS = [
  "PROOF #A17F2C · VERIFIED",
  "PROOF #B3E091 · VERIFIED",
  "PROOF #C82F44 · VERIFIED",
  "PROOF #D10AF7 · VERIFIED",
  "PROOF #E55C2B · VERIFIED",
  "PROOF #F7A318 · VERIFIED",
];

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="relative overflow-hidden border-t border-b border-ink-border py-3 my-0">
      {/* left/right fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10"
           style={{ background: "linear-gradient(to right, var(--color-ink, #0a0a0a), transparent)" }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10"
           style={{ background: "linear-gradient(to left, var(--color-ink, #0a0a0a), transparent)" }} />
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 22, ease: "linear", repeat: Infinity }}
      >
        {items.map((item, i) => (
          <span key={i} className="font-mono text-xs text-paper-dim tracking-widest flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-approve inline-block" />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Glowing orb background ──────────────────────────────────────────────── */
function HeroOrb() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* main indigo orb */}
      <motion.div
        className="absolute rounded-full blur-[120px] opacity-30"
        style={{
          width: 600, height: 600,
          right: "-10%", top: "-20%",
          background: "radial-gradient(circle, #6366f1, #4f46e5 40%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.28, 0.36, 0.28] }}
        transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
      />
      {/* secondary teal orb */}
      <motion.div
        className="absolute rounded-full blur-[100px] opacity-20"
        style={{
          width: 400, height: 400,
          left: "-5%", bottom: "-10%",
          background: "radial-gradient(circle, #06b6d4, transparent 70%)",
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.18, 0.26, 0.18] }}
        transition={{ duration: 8, ease: "easeInOut", repeat: Infinity, delay: 2 }}
      />
    </div>
  );
}

/* ── Floating network node dots (decorative) ─────────────────────────────── */
const NODES = [
  { x: "12%",  y: "18%",  size: 6,  delay: 0 },
  { x: "88%",  y: "30%",  size: 4,  delay: 1.2 },
  { x: "75%",  y: "78%",  size: 5,  delay: 0.6 },
  { x: "22%",  y: "72%",  size: 3,  delay: 2 },
  { x: "50%",  y: "8%",   size: 4,  delay: 1.5 },
  { x: "95%",  y: "60%",  size: 3,  delay: 0.3 },
  { x: "5%",   y: "45%",  size: 5,  delay: 1.8 },
];

function NetworkNodes() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block">
      {NODES.map((n, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/20"
          style={{ left: n.x, top: n.y, width: n.size, height: n.size }}
          animate={{ opacity: [0.2, 0.7, 0.2], scale: [1, 1.4, 1] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: n.delay }}
        />
      ))}
      {/* connector lines between some nodes — SVG overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <line x1="12%" y1="18%" x2="50%" y2="8%"  stroke="white" strokeWidth="1" />
        <line x1="50%" y1="8%"  x2="88%" y2="30%" stroke="white" strokeWidth="1" />
        <line x1="88%" y1="30%" x2="95%" y2="60%" stroke="white" strokeWidth="1" />
        <line x1="95%" y1="60%" x2="75%" y2="78%" stroke="white" strokeWidth="1" />
        <line x1="75%" y1="78%" x2="22%" y2="72%" stroke="white" strokeWidth="1" />
        <line x1="22%" y1="72%" x2="5%"  y2="45%" stroke="white" strokeWidth="1" />
        <line x1="5%"  y1="45%" x2="12%" y2="18%" stroke="white" strokeWidth="1" />
      </svg>
    </div>
  );
}

/* ── Live proof feed (left side mini widget) ─────────────────────────────── */
const FEED_PROOFS = [
  { id: "A17F2C", status: "Approved", time: "0.3s ago" },
  { id: "B3E091", status: "Approved", time: "1.1s ago" },
  { id: "C82F44", status: "Rejected", time: "2.4s ago" },
  { id: "D10AF7", status: "Approved", time: "3.8s ago" },
];

function LiveFeed() {
  const [items, setItems] = useState(FEED_PROOFS.slice(0, 4));
  useEffect(() => {
    const ids = ["E55C2B","F7A318","G9B234","H1D567"];
    const statuses = ["Approved","Approved","Rejected","Approved"];
    let idx = 0;
    const t = setInterval(() => {
      setItems(prev => [
        { id: ids[idx % ids.length], status: statuses[idx % statuses.length], time: "just now" },
        ...prev.slice(0, 3), // always keep exactly 4 items
      ]);
      idx++;
    }, 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="glass-card rounded-2xl p-4 w-full max-w-xs">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-approve animate-pulse" />
        <span className="font-mono text-[10px] text-paper-dim uppercase tracking-widest">Live proof feed</span>
      </div>
      {/* Fixed height container — never grows, clips overflow */}
      <div className="overflow-hidden" style={{ height: "88px" }}>
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between text-xs shrink-0"
              >
                <span className="font-mono text-paper-muted">#{p.id}</span>
                <span className={`font-mono px-2 py-0.5 rounded-full text-[10px] ${
                  p.status === "Approved"
                    ? "bg-approve/10 text-approve"
                    : "bg-red-500/10 text-red-400"
                }`}>{p.status}</span>
                <span className="text-paper-dim">{p.time}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ── FAQ item ────────────────────────────────────────────────────────────── */
function FaqItem({ item, index }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="border-b border-ink-border py-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-6 text-left group"
      >
        <span className="font-display text-base sm:text-lg text-paper group-hover:text-paper-muted transition-colors">
          {item.q}
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25 }}
          className="shrink-0 w-7 h-7 rounded-full border border-ink-border flex items-center justify-center text-paper-muted"
        >
          +
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden"
      >
        <p className="text-sm text-paper-muted leading-relaxed pt-3 pr-8">{item.a}</p>
      </motion.div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div>
      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-6 sm:pt-12 sm:pb-10 overflow-visible"
      >
        <HeroOrb />
        <NetworkNodes />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-center"
        >
          {/* Left — copy */}
          <div className="flex flex-col justify-center order-2 lg:order-1 relative z-10 pt-4 lg:pt-0">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 font-mono text-xs text-paper-muted tracking-widest uppercase mb-5 border border-ink-border rounded-full px-3.5 py-1.5 w-fit backdrop-blur-sm bg-white/[0.03]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-approve animate-pulse" />
              Zero-Knowledge Lending
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="font-display font-semibold text-4xl sm:text-5xl xl:text-6xl leading-[1.06] tracking-tight text-paper mb-5"
            >
              Prove the decision.
              <br />
              <span className="text-paper-muted">Hide the model.</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="text-paper-muted text-base sm:text-lg leading-relaxed mb-8 max-w-md"
            >
              Every loan decision is wrapped in a cryptographic proof —
              verifiable by anyone, readable by no one.
            </motion.p>

            {/* CTAs — bank ledger replaced with explore network */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col xs:flex-row flex-wrap gap-3 mb-8 sm:mb-10"
            >
              <Button as={Link} to="/apply" size="lg">
                Apply now <span aria-hidden>→</span>
              </Button>
              <Button as={Link} to="/network" size="lg" variant="outline">
                Explore network →
              </Button>
            </motion.div>

            {/* Live proof feed widget — hidden on xs, visible sm+ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="hidden sm:block w-full max-w-xs"
            >
              <LiveFeed />
            </motion.div>
          </div>

          {/* Right — 3D model */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex items-center justify-center order-1 lg:order-2 w-full"
          >
            {/* Glow ring behind model */}
            <div
              className="absolute rounded-full blur-3xl opacity-30 pointer-events-none"
              style={{
                width: "80%", height: "80%",
                background: "radial-gradient(circle, #6366f1 0%, #06b6d4 50%, transparent 70%)",
              }}
            />

            {/* Model */}
            <div className="animate-float w-full max-w-[260px] xs:max-w-[300px] sm:max-w-[380px] lg:max-w-full mx-auto relative z-10">
              <Sketchfab3D />
            </div>

            {/* Floating verified badge — top right, lg+ only */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotate: 6 }}
              animate={{ opacity: 1, scale: 1, rotate: 3 }}
              transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block absolute -right-2 -top-2 xl:-right-6 xl:-top-4 w-48 xl:w-56 glass-card rounded-2xl p-4 pointer-events-none z-20 backdrop-blur-md"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] text-paper-dim uppercase tracking-widest">Proof #A17F2C</span>
                <span className="w-2 h-2 rounded-full bg-approve animate-pulse" />
              </div>
              <div className="font-display text-base xl:text-lg text-paper mb-1">Verified On-Chain</div>
              <div className="text-xs text-paper-muted font-mono mb-3">witness → prove → verify · 1.8s</div>
              <div className="h-1 rounded-full bg-ink-border overflow-hidden">
                <motion.div
                  className="h-full bg-paper rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.8, delay: 1, ease: "easeOut" }}
                />
              </div>
            </motion.div>

            {/* Floating score badge — bottom left, lg+ only */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:flex absolute -left-2 bottom-6 xl:-left-6 items-center gap-3 glass-card rounded-2xl px-3 py-2.5 pointer-events-none z-20 backdrop-blur-md"
            >
              <div className="w-7 h-7 rounded-full bg-approve/20 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-approve" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div>
                <div className="font-display text-sm text-paper">Score: 0.84</div>
                <div className="font-mono text-[10px] text-approve">Approved</div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ══ TICKER ════════════════════════════════════════════════════════ */}
      <Ticker />

      {/* ══ STATS ══════════════════════════════════════════════════════════ */}
      <section className="border-b border-ink-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-8">
          {[
            { value: 100, suffix: "%", label: "Model integrity per decision" },
            { value: 0,   suffix: "",  label: "Raw applicant data on-chain" },
            { value: 2,   suffix: "s", label: "Median proof verify time" },
            { value: 4,   suffix: "/5",label: "EEOC fairness ratio ×0.8" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="font-display text-2xl sm:text-4xl text-paper mb-1">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </div>
              <div className="text-[11px] sm:text-xs text-paper-dim font-mono leading-snug">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ HOW IT WORKS ══════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-b border-ink-border">
        <Reveal>
          <div className="font-mono text-xs text-paper-muted tracking-widest uppercase mb-3">How it works</div>
          <h2 className="font-display text-2xl sm:text-4xl text-paper mb-12 max-w-lg">
            Three steps to a provable answer.
          </h2>
        </Reveal>

        {/* Step cards with hover glow */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 relative">
          {/* connector line desktop only */}
          <div className="hidden sm:block absolute top-7 left-[18%] right-[18%] h-px"
               style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)" }} />

          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.12}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25 }}
                className="relative glass-card rounded-2xl p-6 group overflow-hidden cursor-default"
              >
                {/* subtle inner glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                     style={{ background: "radial-gradient(circle at 50% 0%, rgba(99,102,241,0.12), transparent 70%)" }} />

                <div className="w-11 h-11 rounded-full bg-ink-surface border border-ink-border flex items-center justify-center font-mono text-sm text-paper mb-5 relative z-10">
                  {step.n}
                </div>
                <h3 className="font-display text-lg sm:text-xl text-paper mb-2 relative z-10">{step.title}</h3>
                <p className="text-sm text-paper-muted leading-relaxed relative z-10">{step.body}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-b border-ink-border">
        <Reveal>
          <div className="font-mono text-xs text-paper-muted tracking-widest uppercase mb-3">Why it matters</div>
          <h2 className="font-display text-2xl sm:text-4xl text-paper mb-12 max-w-lg">
            Trust without asking anyone to trust.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="group glass-card rounded-2xl p-5 sm:p-7 h-full transition-colors duration-300 hover:border-white/20 relative overflow-hidden cursor-default"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                     style={{ background: "radial-gradient(circle at 0% 0%, rgba(99,102,241,0.08), transparent 60%)" }} />
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-accent/[0.06] border border-ink-border flex items-center justify-center mb-4 sm:mb-5 group-hover:bg-accent group-hover:border-accent transition-colors duration-300 relative z-10">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 text-paper group-hover:text-ink transition-colors" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {f.icon}
                  </svg>
                </div>
                <h3 className="font-display text-base sm:text-lg text-paper mb-2 relative z-10">{f.title}</h3>
                <p className="text-sm text-paper-muted leading-relaxed relative z-10">{f.body}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════════════════ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-b border-ink-border">
        <Reveal>
          <div className="font-mono text-xs text-paper-muted tracking-widest uppercase mb-3">FAQ</div>
          <h2 className="font-display text-2xl sm:text-4xl text-paper mb-10 sm:mb-12">Common questions.</h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div>
            {FAQS.map((item, i) => (
              <FaqItem key={item.q} item={item} index={i} />
            ))}
          </div>
        </Reveal>
      </section>

      {/* ══ CTA ═══════════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <Reveal>
          <div className="relative rounded-2xl sm:rounded-3xl border border-ink-border bg-ink-surface overflow-hidden px-5 py-12 sm:px-16 sm:py-20 text-center">
            {/* dot grid */}
            <div className="absolute inset-0 bg-dot-grid opacity-30 [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000,transparent)]" />
            {/* glow */}
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(99,102,241,0.15), transparent)" }} />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 font-mono text-xs text-paper-muted tracking-widest uppercase mb-6 border border-ink-border rounded-full px-3.5 py-1.5 backdrop-blur-sm bg-white/[0.03]">
                <span className="w-1.5 h-1.5 rounded-full bg-approve animate-pulse" />
                Live on testnet
              </div>
              <h2 className="font-display text-2xl sm:text-4xl text-paper mb-3 sm:mb-4">
                Ready to prove it?
              </h2>
              <p className="text-paper-muted text-sm sm:text-base mb-7 sm:mb-8 max-w-sm mx-auto">
                Submit an application. Watch the proof run live.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Button as={Link} to="/apply" size="lg" className="w-full sm:w-auto">
                  Apply now <span aria-hidden>→</span>
                </Button>
                <Button as={Link} to="/network" size="lg" variant="outline" className="w-full sm:w-auto">
                  Explore network
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
