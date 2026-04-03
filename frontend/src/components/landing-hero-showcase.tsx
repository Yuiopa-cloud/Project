"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ProductImage } from "@/components/product-image";

const FALLBACK = [
  "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=600&q=80",
  "https://images.unsplash.com/photo-1486754735734-325b5831c3ad?w=600&q=80",
  "https://images.unsplash.com/photo-1619405399517-d7fce0f13302?w=600&q=80",
];

function FloatInner({
  children,
  delay = 0,
  amplitude = 5,
}: {
  children: ReactNode;
  delay?: number;
  amplitude?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="relative h-full w-full"
      animate={reduce ? undefined : { y: [0, -amplitude, 0] }}
      transition={
        reduce
          ? undefined
          : {
              duration: 5.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay,
            }
      }
    >
      {children}
    </motion.div>
  );
}

export function LandingHeroShowcase({ imageUrls }: { imageUrls: string[] }) {
  const urls =
    imageUrls.length > 0 ? imageUrls.slice(0, 5) : FALLBACK.slice(0, 3);

  const slots = [0, 1, 2, 3, 4].map((i) => urls[i % urls.length]);

  return (
    <div className="relative mx-auto aspect-[4/3] max-h-[min(420px,56svh)] w-full max-w-lg lg:max-w-none lg:translate-x-4">
      <motion.div
        className="absolute left-[6%] top-[8%] z-30 h-[44%] w-[52%] overflow-hidden rounded-2xl border border-[var(--border)] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.55)]"
        initial={{ opacity: 0, y: 24, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ type: "spring" as const, stiffness: 280, damping: 28, delay: 0.05 }}
      >
        <div className="relative h-full w-full bg-zinc-900">
          <FloatInner delay={0.35} amplitude={6}>
            <ProductImage src={slots[0]} alt="" fill className="scale-105" priority />
          </FloatInner>
        </div>
      </motion.div>
      <motion.div
        className="absolute right-[4%] top-[22%] z-20 h-[38%] w-[46%] overflow-hidden rounded-2xl border border-[var(--border)] shadow-[0_20px_44px_-18px_rgba(0,0,0,0.5)]"
        initial={{ opacity: 0, y: 20, rotate: 3 }}
        animate={{ opacity: 1, y: 0, rotate: 3 }}
        transition={{ type: "spring" as const, stiffness: 280, damping: 28, delay: 0.12 }}
      >
        <div className="relative h-full w-full bg-zinc-900">
          <FloatInner delay={0.55} amplitude={5}>
            <ProductImage src={slots[1]} alt="" fill />
          </FloatInner>
        </div>
      </motion.div>
      <motion.div
        className="absolute bottom-[10%] left-[18%] z-40 h-[34%] w-[42%] overflow-hidden rounded-2xl border-2 border-[var(--accent)]/35 shadow-[0_0_40px_-12px_var(--accent-glow)]"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring" as const, stiffness: 260, damping: 24, delay: 0.2 }}
      >
        <div className="relative h-full w-full bg-zinc-900">
          <FloatInner delay={0.2} amplitude={7}>
            <ProductImage src={slots[2]} alt="" fill />
          </FloatInner>
        </div>
      </motion.div>
      <motion.div
        className="absolute bottom-[14%] right-[8%] z-10 h-[28%] w-[40%] overflow-hidden rounded-xl border border-[var(--border)] opacity-90 shadow-lg"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 0.9, x: 0 }}
        transition={{ delay: 0.28, duration: 0.5 }}
      >
        <div className="relative h-full w-full bg-zinc-900">
          <FloatInner delay={0.75} amplitude={4}>
            <ProductImage src={slots[3]} alt="" fill />
          </FloatInner>
        </div>
      </motion.div>
      <div className="pointer-events-none absolute -right-6 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-[var(--accent)]/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-[var(--accent-hot)]/15 blur-3xl" />
    </div>
  );
}
