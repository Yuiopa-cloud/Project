"use client";

import type { ComponentProps } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";

const MotionI18nLink = motion.create(Link);

const tap = { scale: 0.95 };
const hover = {
  scale: 1.05,
  y: -2,
  boxShadow:
    "0 14px 40px -14px var(--accent-glow), 0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent)",
};
const transition = { type: "spring" as const, stiffness: 380, damping: 26 };

export function MotionLink({
  children,
  whileHover,
  whileTap,
  transition: t,
  ...props
}: ComponentProps<typeof MotionI18nLink>) {
  return (
    <MotionI18nLink
      whileTap={whileTap ?? tap}
      whileHover={whileHover ?? hover}
      transition={t ?? transition}
      {...props}
    >
      {children}
    </MotionI18nLink>
  );
}
