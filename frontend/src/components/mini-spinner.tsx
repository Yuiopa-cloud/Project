"use client";

import { motion, useReducedMotion } from "framer-motion";

export function MiniSpinner({
  className = "h-[1.1em] w-[1.1em]",
  label,
}: {
  className?: string;
  label?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.span
      data-slot="mini-spinner"
      className={`inline-block align-middle ${className} rounded-full border-2 border-current border-t-transparent`}
      role="status"
      aria-label={label ?? "Chargement"}
      animate={reduce ? {} : { rotate: 360 }}
      transition={
        reduce
          ? {}
          : { duration: 0.65, repeat: Infinity, ease: "linear" }
      }
      style={{ willChange: reduce ? undefined : "transform" }}
    />
  );
}
