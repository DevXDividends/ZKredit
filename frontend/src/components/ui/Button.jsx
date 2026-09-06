import { motion } from "framer-motion";
import { forwardRef } from "react";

const VARIANTS = {
  primary:
    "bg-accent text-ink hover:bg-accent-dim shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
  outline:
    "border border-ink-border text-paper hover:border-paper-dim hover:bg-white/[0.03]",
  ghost: "text-paper-muted hover:text-paper hover:bg-white/[0.04]",
  danger: "border border-reject/40 text-reject hover:bg-reject/10",
};

const SIZES = {
  sm: "px-3.5 py-2 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

const Button = forwardRef(function Button(
  { children, variant = "primary", size = "md", className = "", disabled, as: Tag = "button", ...props },
  ref
) {
  const MotionTag = typeof Tag === "string" ? motion(Tag) : motion(Tag);
  return (
    <MotionTag
      ref={ref}
      whileHover={disabled ? {} : { scale: 1.015 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      transition={{ duration: 0.15 }}
      disabled={disabled}
      className={`btn-sheen inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </MotionTag>
  );
});

export default Button;
