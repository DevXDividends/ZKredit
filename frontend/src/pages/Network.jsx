import Reveal from "../components/ui/Reveal";
import AnimatedCounter from "../components/ui/AnimatedCounter";
import NetworkGraph3D from "../components/NetworkGraph3D";
import LiveLogConsole from "../components/LiveLogConsole";
import useLiveLog from "../hooks/useLiveLog";

function StatCard({ label, value, suffix = "", decimals = 0, delay = 0 }) {
  return (
    <Reveal delay={delay}>
      <div className="glass-card rounded-2xl px-5 py-5">
        <div className="text-xs text-paper-muted font-mono mb-2">{label}</div>
        <div className="font-display text-3xl text-paper">
          <AnimatedCounter value={value} suffix={suffix} decimals={decimals} />
        </div>
      </div>
    </Reveal>
  );
}

export default function Network() {
  const { entries } = useLiveLog({ ambient: true, intervalMs: [500, 1400] });

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <Reveal>
        <div className="inline-flex items-center gap-2 font-mono text-xs text-paper-muted tracking-widest uppercase mb-4 border border-ink-border rounded-full px-3.5 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-approve animate-pulse" />
          Live network view
        </div>
        <h1 className="font-display text-3xl sm:text-4xl text-paper mb-3">Proof network, in real time.</h1>
        <p className="text-paper-muted max-w-2xl mb-10">
          Every validator, every gossiped header, every proof propagating across the mesh —
          rendered live. Drag to orbit the mesh like you're standing inside it; the console
          below streams the same activity as it happens.
        </p>
      </Reveal>

      <div className="grid gap-6 mb-6">
        <Reveal>
          <NetworkGraph3D />
        </Reveal>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <StatCard label="Active nodes" value={46} />
        <StatCard label="Validators" value={6} delay={0.05} />
        <StatCard label="Proofs verified /min" value={12} delay={0.1} />
        <StatCard label="Network uptime" value={99.98} suffix="%" decimals={2} delay={0.15} />
      </div>

      <Reveal>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-paper">Activity feed</h2>
          <span className="text-xs text-paper-dim font-mono">gossip · consensus · proofs</span>
        </div>
        <LiveLogConsole entries={entries} title="mesh://zkredit-network" height="h-80" />
      </Reveal>

      <Reveal>
        <div className="grid sm:grid-cols-3 gap-5 mt-10">
          <div className="border border-ink-border rounded-2xl p-6">
            <div className="w-2 h-2 rounded-full bg-approve mb-3" />
            <h3 className="font-display text-base text-paper mb-1">Validator nodes</h3>
            <p className="text-sm text-paper-muted leading-relaxed">
              Larger, glowing points in the mesh — these confirm witness commitments and finalize
              consensus rounds.
            </p>
          </div>
          <div className="border border-ink-border rounded-2xl p-6">
            <div className="w-2 h-2 rounded-full bg-paper mb-3" />
            <h3 className="font-display text-base text-paper mb-1">Peer nodes</h3>
            <p className="text-sm text-paper-muted leading-relaxed">
              Standard mesh participants — they relay proofs and block headers between
              validators.
            </p>
          </div>
          <div className="border border-ink-border rounded-2xl p-6">
            <div className="w-2 h-2 rounded-full bg-reject mb-3" />
            <h3 className="font-display text-base text-paper mb-1">Rejected pulses</h3>
            <p className="text-sm text-paper-muted leading-relaxed">
              Occasionally a proof or header fails a peer's check before propagating further —
              shown in red as it happens.
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
