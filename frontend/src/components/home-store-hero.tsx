"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { MotionLink } from "@/components/motion-link";

const HERO_IMAGE = "/banners/home-banner-custom.png";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomeStoreHero({
  headline,
  subheadline,
  cta,
  imageAlt,
}: {
  headline: string;
  subheadline: string;
  cta: string;
  imageAlt: string;
}) {
  const reduce = useReducedMotion();

  return (
    <MotionLink
      href="/shop"
      aria-label={cta}
      className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.995 }}
    >
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_22px_56px_-22px_rgba(76,29,10,0.28)] transition group-hover:shadow-[0_28px_64px_-24px_rgba(76,29,10,0.34)] sm:rounded-3xl">
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <Image
            src={HERO_IMAGE}
            alt={imageAlt}
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
        <div className="grid gap-0 lg:grid-cols-[1fr] lg:items-stretch">
          <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10">
            <motion.h1
              className="font-display text-balance text-3xl font-semibold leading-[1.12] tracking-tight text-[var(--fg)] sm:text-4xl lg:text-[2.75rem]"
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
            >
              {headline}
            </motion.h1>
            <motion.p
              className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-[var(--muted)] sm:text-lg"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease, delay: 0.06 }}
            >
              {subheadline}
            </motion.p>
            <motion.div
              className="mt-8"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.12 }}
            >
              <span className="inline-flex min-h-[3rem] min-w-[200px] items-center justify-center rounded-xl bg-[var(--accent)] px-8 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(180,83,9,0.45)] transition group-hover:bg-[var(--primary-to)]">
                {cta}
              </span>
            </motion.div>
          </div>
        </div>
      </section>
    </MotionLink>
  );
}
