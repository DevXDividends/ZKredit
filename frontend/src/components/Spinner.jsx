export default function Spinner({ label, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 ${className}`}>
      <span className="relative w-8 h-8 block">
        <span className="absolute inset-0 rounded-full border-2 border-ink-border" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-seal animate-spin" />
      </span>
      {label && <span className="font-mono text-xs text-paper-dim tracking-wide">{label}</span>}
    </div>
  );
}
