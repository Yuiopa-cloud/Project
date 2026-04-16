"use client";

import { useMemo, useSyncExternalStore } from "react";
import { motion } from "framer-motion";

function subscribeNow(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 1000);
  return () => window.clearInterval(id);
}

function useNowMs(): number {
  return useSyncExternalStore(
    subscribeNow,
    () => Date.now(),
    () => 0,
  );
}

function splitRemaining(ms: number): {
  d: number;
  h: number;
  m: number;
  s: number;
} {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return { d, h, m, s };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Decorative urgency timer only — does not change catalog or checkout. */
export function ProductOfferCountdown({
  endMs,
  labels,
}: {
  endMs: number;
  labels: {
    title: string;
    endsIn: string;
    unitD: string;
    unitH: string;
    unitM: string;
    unitS: string;
  };
}) {
  const nowMs = useNowMs();

  const remaining = useMemo(() => {
    return splitRemaining(endMs - nowMs);
  }, [endMs, nowMs]);

  const urgent = endMs - nowMs < 8 * 60 * 1000;

  const blocks = [
    { v: remaining.d, u: labels.unitD },
    { v: remaining.h, u: labels.unitH },
    { v: remaining.m, u: labels.unitM },
    { v: remaining.s, u: labels.unitS },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border px-3 py-3 shadow-[0_12px_40px_-18px_rgba(234,88,12,0.35)] ${
        urgent
          ? "border-rose-400/50 bg-gradient-to-br from-rose-600/25 via-[var(--card)] to-amber-500/20"
          : "border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] bg-gradient-to-br from-[var(--accent-dim)] via-[var(--card)] to-[var(--accent-hot)]/15"
      }`}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[var(--accent)]/25 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-[var(--accent-hot)]/20 blur-2xl"
        aria-hidden
      />
      <p className="relative text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
        {labels.title}
      </p>
      <p className="relative mt-0.5 text-center text-xs font-medium text-[var(--fg)]">
        {labels.endsIn}
      </p>
      <div className="relative mt-3 flex justify-center gap-1.5 sm:gap-2">
        {blocks.map(({ v, u }, i) => (
          <motion.div
            key={`${i}-${u}`}
            animate={
              i === 3
                ? { scale: [1, 1.06, 1] }
                : {}
            }
            transition={{ duration: 1, repeat: i === 3 ? Infinity : 0, ease: "easeInOut" }}
            className="flex min-w-[3rem] flex-col items-center rounded-xl border border-white/10 bg-black/20 px-2 py-2 backdrop-blur-sm sm:min-w-[3.5rem] sm:px-2.5"
          >
            <span className="font-mono text-lg font-bold tabular-nums text-white sm:text-xl">
              {i === 0 ? String(v) : pad2(v)}
            </span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/70">
              {u}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
