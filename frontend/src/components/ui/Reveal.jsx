import { motion } from "framer-motion";

/**
 * Fades + slides a block into place when it enters the viewport.
 * Wrap any section content with this for consistent scroll-reveal motion.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 18,
  className = "",
  as = "div",
  once = true,
}) {
  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}
