import { useRef, useState } from "react";

/**
 * Stylized "3D" hero visual: a stack of layered credit-card panes with a
 * gold chip, a floating proof-seal badge, and a live confidence dial.
 * Reacts to pointer movement with a subtle perspective tilt — replaces the
 * old placeholder 3D model with a lightweight, dependency-free 3D image.
 */
export default function HeroCard() {
  const wrapRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMove = (e) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: py * -14, y: px * 18 });
  };

  const handleLeave = () => setTilt({ x: 0, y: 0 });

  return (
    <div
      ref={wrapRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="card-3d-wrap relative w-full max-w-[440px] mx-auto aspect-square select-none"
    >
      {/* ambient glow */}
      <div className="absolute inset-0 rounded-full bg-seal/20 blur-[90px] animate-pulse-ring" />

      <div
        className="card-3d relative w-full h-full"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        {/* back card */}
        <div
          className="absolute left-[8%] top-[30%] w-[78%] aspect-[1.586] rounded-2xl border border-ink-border bg-ink-raised shadow-card-lg animate-float"
          style={{ "--tilt": "-9deg", transform: "translateZ(-40px) rotate(-9deg)", animationDelay: "0.4s" }}
        />
        {/* middle card */}
        <div
          className="absolute left-[14%] top-[22%] w-[78%] aspect-[1.586] rounded-2xl border border-seal-dim/40 bg-gradient-to-br from-ink-raised to-ink-surface shadow-card-lg animate-float"
          style={{ "--tilt": "-3deg", transform: "translateZ(0px) rotate(-3deg)", animationDelay: "0.15s" }}
        >
          <div className="absolute right-5 top-5 w-9 h-9 rounded-full seal-ring opacity-70" />
        </div>

        {/* front card — the hero piece */}
        <div
          className="absolute left-[10%] top-[14%] w-[80%] aspect-[1.586] rounded-2xl overflow-hidden shadow-card-lg animate-float"
          style={{ "--tilt": "4deg", transform: "translateZ(60px) rotate(4deg)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#12141a] via-[#1c1f26] to-[#0b0e11]" />
          <div className="absolute inset-0 bg-card-sheen bg-[length:200%_200%] animate-gradient-x opacity-60" />
          <div className="absolute inset-0 bg-grid opacity-30" />

          <div className="relative h-full flex flex-col justify-between p-5">
            <div className="flex items-start justify-between">
              <div className="w-9 h-7 rounded-md bg-seal-gradient bg-[length:200%_100%] animate-gradient-x shadow-[0_0_12px_rgba(240,185,11,0.5)]" />
              <span className="font-serif text-[13px] font-bold tracking-wide text-seal-light">
                ZKredit
              </span>
            </div>

            <div>
              <div className="font-mono text-[15px] tracking-[0.2em] text-paper/90 mb-3">
                •••• •••• •••• 4029
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-widest text-paper-dim">
                  Proof-backed decision
                </span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 1.5 3 4.5v5c0 4.5 3 7.4 7 9 4-1.6 7-4.5 7-9v-5L10 1.5Z"
                    stroke="#F0B90B"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                  <path d="M6.7 10.1 9 12.4l4.3-4.7" stroke="#F0B90B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* floating badge: proof verified */}
        <div
          className="absolute -right-2 bottom-[6%] flex items-center gap-2 rounded-xl border border-ink-border bg-ink-surface/95 backdrop-blur px-3 py-2 shadow-card animate-float-slow"
          style={{ animationDelay: "0.6s" }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-approve opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-approve" />
          </span>
          <span className="font-mono text-[10px] text-paper">Proof verified</span>
        </div>

        {/* floating badge: zk circuit */}
        <div
          className="absolute -left-3 top-[8%] flex items-center gap-2 rounded-xl border border-ink-border bg-ink-surface/95 backdrop-blur px-3 py-2 shadow-card animate-float-slow"
          style={{ animationDelay: "1s" }}
        >
          <span className="font-mono text-[10px] text-seal-light">zk-EZKL</span>
          <span className="w-1 h-1 rounded-full bg-paper-dim" />
          <span className="font-mono text-[10px] text-paper-muted">on-chain ready</span>
        </div>
      </div>
    </div>
  );
}
