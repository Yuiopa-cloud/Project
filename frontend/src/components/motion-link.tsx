"use client";

import type { ComponentProps } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";

const MotionI18nLink = motion.create(Link);

const tap = { scale: 0.95 };
const hover = {
  scale: 1.04,
  y: -2,
  boxShadow:
    "0 16px 44px -14px color-mix(in srgb, var(--primary-mid) 35%, transparent), 0 0 36px -16px var(--accent-glow), 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent)",
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
