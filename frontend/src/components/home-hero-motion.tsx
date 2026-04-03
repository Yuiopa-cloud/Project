"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomeHeroMotion({
  heroKicker,
  heroTitle,
  heroSub,
  children,
}: {
  heroKicker: string;
  heroTitle: string;
  heroSub: string;
  /** Hero CTAs + trust + offers */
  children: ReactNode;
}) {
  return (
    <div className="max-w-xl space-y-6 lg:max-w-lg lg:space-y-7">
      <motion.p
        className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease, delay: 0.02 }}
      >
        {heroKicker}
      </motion.p>
      <motion.h1
        className="font-display text-[2.35rem] font-semibold leading-[1.07] tracking-tight text-[var(--fg)] sm:text-4xl md:text-5xl lg:text-[3.25rem]"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease, delay: 0.08 }}
      >
        {heroTitle}
      </motion.h1>
      <motion.p
        className="max-w-md text-base leading-relaxed text-[var(--muted)] md:text-lg"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease, delay: 0.16 }}
      >
        {heroSub}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, type: "spring", stiffness: 320, damping: 28, delay: 0.22 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
