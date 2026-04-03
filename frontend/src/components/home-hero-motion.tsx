"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomeHeroMotion({
  heroKicker,
  heroTitle,
  heroSub,
  heroHighlight,
  trustCod,
  trustWarranty,
  children,
}: {
  heroKicker: string;
  heroTitle: string;
  heroSub: string;
  heroHighlight: string;
  trustCod: string;
  trustWarranty: string;
  /** Hero CTAs */
  children: ReactNode;
}) {
  return (
    <div className="max-w-xl space-y-6 lg:max-w-lg lg:space-y-8">
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
      <motion.p
        className="text-sm font-medium tracking-wide text-[color-mix(in_srgb,var(--accent)_85%,var(--accent-hot))]"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease, delay: 0.22 }}
      >
        {heroHighlight}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, type: "spring", stiffness: 320, damping: 28, delay: 0.28 }}
      >
        {children}
      </motion.div>
      <motion.ul
        className="flex list-none flex-wrap gap-3 pt-3 md:gap-3 md:pt-5"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: { staggerChildren: 0.06, delayChildren: 0.38 },
          },
        }}
      >
        {[trustCod, trustWarranty].map((label) => (
          <motion.li
            key={label}
            variants={{
              hidden: { opacity: 0, y: 12, scale: 0.96 },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { type: "spring", stiffness: 420, damping: 26 },
              },
            }}
          >
            <span className="chip-interactive inline-block">{label}</span>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}
