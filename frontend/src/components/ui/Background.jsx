/**
 * Fixed, full-viewport ambient background: soft grid + two drifting glow
 * orbs + a faint noise layer. Purely decorative, sits behind all content.
 */
export default function Background() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-ink">
      <div className="absolute inset-0 bg-grid bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_10%,transparent_75%)]" />
      <div className="absolute -top-40 -left-40 w-[36rem] h-[36rem] rounded-full bg-white glow-orb animate-float" />
      <div
        className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-white glow-orb animate-float"
        style={{ animationDelay: "2.4s" }}
      />
      <div className="absolute inset-0 noise-overlay pointer-events-none" />
    </div>
  );
}
