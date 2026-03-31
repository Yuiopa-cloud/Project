"use client";

import type { ComponentProps } from "react";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";

const MotionI18nLink = motion.create(Link);

const tap = { scale: 0.96 };
const hover = { y: -2 };
const transition = { type: "spring" as const, stiffness: 420, damping: 28 };

export function MotionLink({
  children,
  ...props
}: ComponentProps<typeof MotionI18nLink>) {
  return (
    <MotionI18nLink
      whileTap={tap}
      whileHover={hover}
      transition={transition}
      {...props}
    >
      {children}
    </MotionI18nLink>
  );
}
