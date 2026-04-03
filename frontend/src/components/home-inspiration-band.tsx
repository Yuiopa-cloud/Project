"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { MotionLink } from "@/components/motion-link";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomeInspirationBand() {
  const t = useTranslations("home");
  const reduce = useReducedMotion();

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, ease }}
      className="relative mt-20 overflow-hidden rounded-[1.75rem] border border-[color-mix(in_srgb,var(--accent)_18%,var(--glass-border))] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] px-6 py-14 shadow-[0_32px_80px_-40px_color-mix(in_srgb,var(--primary-mid)_35%,transparent)] sm:px-10 md:mt-28 md:px-14 md:py-16"
    >
      <div
        className="pointer-events-none absolute -left-1/4 top-0 h-[120%] w-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--accent)_16%,transparent),transparent_65%)] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-1/5 bottom-0 h-[90%] w-[45%] rounded-full bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--primary-mid)_14%,transparent),transparent_60%)] blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
          {t("wowEyebrow")}
        </p>
        <h2 className="font-display mt-4 text-balance text-3xl font-semibold leading-[1.12] tracking-tight text-[var(--fg)] sm:text-4xl md:text-[2.75rem]">
          {t("wowTitle")}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-[var(--muted)] md:text-lg">
          {t("wowBody")}
        </p>
        <motion.div
          className="mt-10 flex justify-center"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.12, duration: 0.45, ease }}
        >
          <MotionLink
            href="/shop"
            className="btn-primary-motion inline-flex min-h-[3.25rem] items-center justify-center rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hot)] px-8 py-3 text-sm font-bold text-slate-900 shadow-[0_16px_40px_-12px_var(--accent-glow)]"
          >
            {t("wowCta")}
          </MotionLink>
        </motion.div>
      </div>
    </motion.section>
  );
}
