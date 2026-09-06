import { useEffect, useRef, useState } from "react";
import useReveal from "../hooks/useReveal";

/**
 * Animates counting up to `value` once it scrolls into view. Never invents
 * data — value must be passed in from a real source (backend response).
 * Renders `fallback` (e.g. "—") while value is null/undefined.
 */
export default function AnimatedNumber({
  value,
  duration = 1200,
  decimals = 0,
  prefix = "",
  suffix = "",
  fallback = "—",
  className = "",
}) {
  const [containerRef, visible] = useReveal();
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!visible || value == null || started.current) return;
    started.current = true;
    const target = Number(value);
    if (Number.isNaN(target)) return;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    let raf;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(target * ease(progress));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, value, duration]);

  return (
    <span ref={containerRef} className={className}>
      {value == null ? fallback : `${prefix}${display.toFixed(decimals)}${suffix}`}
    </span>
  );
}
