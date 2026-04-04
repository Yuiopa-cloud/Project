"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { MotionLink } from "@/components/motion-link";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2000&q=82";

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
    <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_20px_50px_-24px_rgba(15,23,42,0.12)] sm:rounded-3xl">
      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14 lg:py-16 lg:ps-12 lg:pe-10">
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
            <MotionLink
              href="/shop"
              className="inline-flex min-h-[3rem] min-w-[200px] items-center justify-center rounded-xl bg-[var(--accent)] px-8 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(22,163,74,0.45)] transition hover:bg-[var(--primary-to)]"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              {cta}
            </MotionLink>
          </motion.div>
        </div>
        <div className="relative min-h-[220px] lg:min-h-[380px]">
          <Image
            src={HERO_IMAGE}
            alt={imageAlt}
            fill
            priority
            className="object-cover object-center lg:rounded-e-3xl"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[var(--card)] lg:via-transparent lg:to-transparent"
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}
