import useReveal from "../hooks/useReveal";

/**
 * Wraps children in a div that fades/slides up into view the first time it
 * enters the viewport. `delay` (ms) staggers groups of siblings.
 */
export default function Reveal({ children, delay = 0, as: Tag = "div", className = "" }) {
  const [ref, visible] = useReveal();
  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={visible ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
