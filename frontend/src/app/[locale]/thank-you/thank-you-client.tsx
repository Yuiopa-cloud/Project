"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { MotionLink } from "@/components/motion-link";

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };
const springSoft = { type: "spring" as const, stiffness: 280, damping: 28 };

type ThankYouMeta = {
  whatsappUrl?: string | null;
  emailNotice?: string | null;
  firstName?: string;
};

export function ThankYouClient({
  orderNumber,
  totalMad,
  payment,
}: {
  orderNumber: string;
  totalMad?: string;
  payment: "CASH_ON_DELIVERY" | "STRIPE";
}) {
  const t = useTranslations("checkout");
  const [meta, setMeta] = useState<ThankYouMeta | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("thankYouMeta");
      if (!raw) return;
      sessionStorage.removeItem("thankYouMeta");
      setMeta(JSON.parse(raw) as ThankYouMeta);
    } catch {
      sessionStorage.removeItem("thankYouMeta");
    }
  }, []);

  const particles = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        id: i,
        leftPct: ((i * 67 + 7) % 86) + 4,
        delay: (i * 0.16) % 2.2,
        duration: 3.8 + (i % 4) * 0.45,
        yMax: 320 + (i % 6) * 28,
        hue: i % 3,
      })),
    [],
  );

  const particleColor = (hue: number) =>
    hue === 0
      ? "var(--accent)"
      : hue === 1
        ? "var(--accent-hot)"
        : "color-mix(in srgb, var(--accent) 70%, #fff)";

  const paymentLabel =
    payment === "STRIPE" ? t("stripe") : t("thankYouPaymentCod");

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-14 md:py-20">
      {/* Ambient: full-bleed within column (overflow visible for side glows) */}
      <div
        className="pointer-events-none absolute -inset-x-12 inset-y-0 -z-10 overflow-hidden md:-inset-x-20"
        aria-hidden
      >
        {/* Slowly drifting radial washes */}
        <div
          className={`thank-you-ambient-blob absolute -left-[10%] top-[8%] h-[min(55vh,22rem)] w-[min(90%,24rem)] rounded-[50%] blur-3xl ${reduceMotion ? "opacity-[0.24]" : ""}`}
          style={{
            background:
              "radial-gradient(ellipse at 35% 40%, color-mix(in srgb, var(--accent-glow-soft) 55%, transparent), transparent 68%)",
          }}
        />
        <div
          className={`thank-you-ambient-blob--alt absolute -right-[8%] bottom-[10%] h-[min(48vh,20rem)] w-[min(85%,22rem)] rounded-[50%] blur-3xl ${reduceMotion ? "opacity-[0.2]" : ""}`}
          style={{
            background:
              "radial-gradient(ellipse at 65% 50%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 72%)",
          }}
        />

        {/* Side edge lights */}
        {!reduceMotion ? (
          <>
            <motion.div
              className="absolute left-0 top-[14%] h-72 w-36 rounded-full opacity-20 blur-3xl"
              style={{
                background:
                  "linear-gradient(90deg, color-mix(in srgb, var(--accent) 65%, transparent), transparent)",
              }}
              animate={{
                x: [0, 14, -4, 0],
                opacity: [0.16, 0.26, 0.18, 0.16],
              }}
              transition={{
                duration: 22,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute right-0 top-[22%] h-80 w-40 rounded-full opacity-20 blur-3xl"
              style={{
                background:
                  "linear-gradient(270deg, color-mix(in srgb, var(--accent-hot) 55%, transparent), transparent)",
              }}
              animate={{
                x: [0, -12, 6, 0],
                opacity: [0.14, 0.24, 0.17, 0.14],
              }}
              transition={{
                duration: 24,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.5,
              }}
            />
          </>
        ) : (
          <>
            <div
              className="absolute left-0 top-[14%] h-72 w-36 rounded-full opacity-[0.18] blur-3xl"
              style={{
                background:
                  "linear-gradient(90deg, color-mix(in srgb, var(--accent) 55%, transparent), transparent)",
              }}
            />
            <div
              className="absolute right-0 top-[22%] h-80 w-40 rounded-full opacity-[0.16] blur-3xl"
              style={{
                background:
                  "linear-gradient(270deg, color-mix(in srgb, var(--accent-hot) 50%, transparent), transparent)",
              }}
            />
          </>
        )}

        {/* Sparkles — few, slow drifts */}
        {!reduceMotion
          ? particles.map((p) => (
              <motion.span
                key={p.id}
                className="absolute top-[12%] h-1.5 w-1.5 rounded-full"
                style={{
                  left: `${p.leftPct}%`,
                  background: particleColor(p.hue),
                  boxShadow: `0 0 10px ${particleColor(p.hue)}`,
                }}
                initial={{ opacity: 0, y: 0, scale: 0.4 }}
                animate={{
                  y: [0, p.yMax],
                  opacity: [0, 0.65, 0.45, 0],
                  scale: [0.4, 1, 0.7, 0.3],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  repeatDelay: 1.8 + (p.id % 4) * 0.35,
                  ease: "easeInOut",
                }}
              />
            ))
          : null}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduceMotion ? { duration: 0.35 } : spring}
        className="card-chrome relative overflow-hidden rounded-3xl p-7 text-center shadow-[0_0_60px_-28px_var(--accent-glow)] md:p-10"
      >
        <motion.div
          className="checkout-glow absolute inset-0 opacity-40"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
        />
        <div className="relative z-10">
          <motion.p
            className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent)]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: reduceMotion ? 0 : 0.06 }}
          >
            {t("thankYouKicker")}
          </motion.p>
          <motion.h1
            className="mt-4 text-3xl font-bold tracking-tight text-[var(--fg)] md:text-4xl"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: reduceMotion ? 0 : 0.12 }}
          >
            {t("thankYouConfirmed")}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: reduceMotion ? 0 : 0.18 }}
          >
            {meta?.firstName ? (
              <p className="mt-3 text-base text-[var(--muted)] md:text-lg">
                {meta.firstName} — {t("successLead")}
              </p>
            ) : (
              <p className="mt-3 text-base text-[var(--muted)] md:text-lg">
                {t("successLead")}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: reduceMotion ? 0 : 0.22 }}
            className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--press-bg)]/60 p-6 text-start md:p-8"
          >
            <dl className="space-y-5">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  {t("successOrderLabel")}
                </dt>
                <dd className="thank-you-order-glow mt-1 font-mono text-xl font-bold text-[var(--accent)] md:text-2xl">
                  {orderNumber}
                </dd>
              </div>
              {totalMad ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                    {t("successTotal")}
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-[var(--fg)]">
                    {totalMad} MAD
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  {t("thankYouPaymentLabel")}
                </dt>
                <dd className="mt-1 text-base font-medium text-[var(--fg)]">
                  {paymentLabel}
                </dd>
              </div>
            </dl>
            <p className="mt-6 text-sm leading-relaxed text-[var(--muted)]">
              {t("successEmailHint")}
            </p>
            {payment === "CASH_ON_DELIVERY" ? (
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                {t("successCod")}
              </p>
            ) : null}
            {meta?.emailNotice ? (
              <p
                role="status"
                className="mt-4 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100"
              >
                {meta.emailNotice}
              </p>
            ) : null}
          </motion.div>

          <motion.div
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduceMotion ? 0 : 0.28, ...springSoft }}
          >
            <MotionLink
              href="/shop"
              className="btn-primary-motion inline-flex justify-center rounded-full px-6 py-3 text-sm font-semibold"
              whileHover={{
                scale: 1.045,
                y: -3,
                boxShadow:
                  "0 22px 52px -14px var(--accent-glow), 0 8px 28px -12px var(--accent-glow-soft), 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent)",
              }}
              whileTap={{ scale: 0.98 }}
            >
              {t("successShopAgain")}
            </MotionLink>
            {meta?.whatsappUrl ? (
              <motion.a
                href={meta.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-whatsapp btn-primary-motion inline-flex justify-center text-center text-sm"
                whileHover={{
                  scale: 1.04,
                  y: -2,
                  boxShadow:
                    "0 16px 40px -12px color-mix(in srgb, var(--accent) 40%, transparent)",
                }}
                whileTap={{ scale: 0.97 }}
                transition={springSoft}
              >
                {t("successWhatsappCta")}
              </motion.a>
            ) : null}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
