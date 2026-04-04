"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { MotionLink } from "@/components/motion-link";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2400&q=85";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomeEditorialHero({
  kicker,
  title,
  tagline,
  ctaShop,
  ctaWhatsApp,
  waHref,
}: {
  kicker: string;
  title: string;
  tagline: string;
  ctaShop: string;
  ctaWhatsApp: string;
  waHref: string;
}) {
  const reduce = useReducedMotion();

  return (
    <section
      className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen -mt-[calc(env(safe-area-inset-top)+6.25rem)] min-h-[min(100dvh,920px)] overflow-hidden"
      aria-label={title}
    >
      <div className="absolute inset-0">
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/55"
          aria-hidden
        />
      </div>

      <div className="relative z-10 flex min-h-[min(100dvh,920px)] flex-col items-center justify-center px-5 pb-16 pt-8 text-center sm:px-8 md:pb-24">
        <motion.p
          className="max-w-xl text-[0.65rem] font-semibold uppercase tracking-[0.38em] text-white/95 sm:text-xs"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
        >
          {kicker}
        </motion.p>
        <motion.h1
          className="mt-5 max-w-4xl text-balance font-display text-3xl font-semibold uppercase leading-[1.08] tracking-[0.02em] text-white sm:text-4xl md:text-5xl lg:text-6xl"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease, delay: 0.06 }}
        >
          {title}
        </motion.h1>
        <motion.p
          className="mt-5 max-w-lg text-[0.7rem] font-medium uppercase tracking-[0.28em] text-white/88 sm:text-xs"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 0.12 }}
        >
          {tagline}
        </motion.p>
        <motion.div
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease, delay: 0.2 }}
        >
          <MotionLink
            href="/shop"
            className="inline-flex min-h-[3rem] min-w-[200px] items-center justify-center border border-white bg-white px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] text-neutral-900 transition hover:bg-white/95"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {ctaShop}
          </MotionLink>
          <motion.a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[3rem] min-w-[200px] items-center justify-center border border-white/50 bg-transparent px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white backdrop-blur-[2px] transition hover:border-white hover:bg-white/10"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            {ctaWhatsApp}
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
