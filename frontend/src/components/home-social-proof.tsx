"use client";

import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomeSocialProof({
  starsLabel,
  headline,
  reviews,
}: {
  starsLabel: string;
  headline: string;
  reviews: [string, string, string];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-32px" }}
      transition={{ duration: 0.45, ease }}
      className="card-chrome rounded-2xl p-6 md:p-8"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p
            className="stars-premium font-medium"
            aria-label={starsLabel}
          >
            ★★★★★
          </p>
          <p className="font-display mt-2 text-lg font-semibold tracking-tight text-[var(--fg)] md:text-xl">
            {headline}
          </p>
        </div>
        <ul className="grid flex-1 gap-3 sm:max-w-xl sm:grid-cols-3">
          {reviews.map((text, i) => (
            <motion.li
              key={i}
              className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-3 text-sm leading-snug text-[var(--muted)] shadow-[0_8px_28px_-18px_rgba(0,0,0,0.35)] backdrop-blur-md transition-shadow duration-300 hover:border-[color-mix(in_srgb,var(--accent)_25%,var(--glass-border))] hover:shadow-[0_12px_36px_-16px_color-mix(in_srgb,var(--primary-mid)_22%,transparent)] md:px-3.5 md:py-3.5"
              whileHover={{ y: -3, transition: { duration: 0.22 } }}
            >
              “{text}”
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
