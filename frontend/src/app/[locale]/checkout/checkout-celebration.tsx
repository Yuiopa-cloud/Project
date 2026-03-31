"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { MotionLink } from "@/components/motion-link";

const spring = { type: "spring" as const, stiffness: 320, damping: 28 };
const springSoft = { type: "spring" as const, stiffness: 220, damping: 22 };

export function CheckoutCelebration({
  orderNumber,
  totalMad,
  firstName,
  whatsappUrl,
}: {
  orderNumber: string;
  totalMad?: string;
  firstName?: string;
  whatsappUrl?: string;
}) {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const rtl = locale === "ar";

  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        i,
        x: (i * 73) % 340,
        delay: i * 0.035,
        duration: 2.2 + (i % 5) * 0.15,
        color: i % 3 === 0 ? "var(--accent)" : i % 3 === 1 ? "var(--accent-hot)" : "#fff",
      })),
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-[var(--accent)]/25 bg-[color-mix(in_srgb,var(--card)_92%,transparent)] px-3 py-10 shadow-[0_0_60px_-20px_var(--accent-glow)] md:px-8 md:py-14"
    >
      <div className="checkout-glow absolute" aria-hidden />
      {particles.map((p) => (
        <motion.span
          key={p.i}
          className="pointer-events-none absolute top-0 h-2 w-2 rounded-full opacity-70"
          style={{
            left: `${(p.i * 19) % 92}%`,
            background: p.color,
            boxShadow: `0 0 12px ${p.color}`,
          }}
          initial={{ y: -12, opacity: 0, scale: 0 }}
          animate={{ y: 420, opacity: [0, 1, 1, 0], scale: [0, 1, 0.6, 0.3] }}
          transition={{
            duration: p.duration,
            delay: 0.3 + p.delay,
            repeat: Infinity,
            repeatDelay: 0.5,
            ease: "easeIn",
          }}
        />
      ))}

      <div className="relative z-10">
        <div
          className={`mb-8 flex min-h-[3.5rem] flex-wrap items-center justify-center gap-4 px-1 md:mb-10 md:min-h-[4rem] ${rtl ? "flex-row-reverse" : ""}`}
        >
          <motion.span
            initial={{ x: rtl ? 100 : -100, opacity: 0, rotate: rtl ? 4 : -4 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            transition={{ ...spring, delay: 0.12 }}
            className="text-xl font-black tracking-tight text-[var(--accent)] drop-shadow-[0_0_12px_var(--accent-glow)] md:text-3xl"
          >
            {t("successFlyLeft")}
          </motion.span>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...springSoft, delay: 0.35 }}
            className="hidden text-2xl md:inline"
            aria-hidden
          >
            ✦
          </motion.span>
          <motion.span
            initial={{ x: rtl ? -100 : 100, opacity: 0, rotate: rtl ? -4 : 4 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            transition={{ ...spring, delay: 0.22 }}
            className="text-xl font-black tracking-tight text-[var(--accent-hot)] drop-shadow-[0_0_14px_var(--accent-glow-soft)] md:text-3xl"
          >
            {t("successFlyRight")}
          </motion.span>
        </div>

        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...springSoft, delay: 0.4 }}
          className="mx-auto max-w-md text-center"
        >
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
            {t("successTitle")}
          </p>
          {firstName ? (
            <p className="mt-3 text-lg text-[var(--fg)] md:text-xl">
              {firstName} — {t("successLead")}
            </p>
          ) : (
            <p className="mt-3 text-lg text-[var(--fg)] md:text-xl">{t("successLead")}</p>
          )}
          <motion.div
            layout
            className="card-chrome mt-8 rounded-2xl p-6 text-start"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55, ...springSoft }}
          >
            <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
              {t("successOrderLabel")}
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-[var(--accent)] md:text-2xl">
              {orderNumber}
            </p>
            {totalMad ? (
              <>
                <p className="mt-4 text-xs uppercase tracking-wider text-[var(--muted)]">
                  {t("successTotal")}
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--fg)]">
                  {totalMad} MAD
                </p>
              </>
            ) : null}
            <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">{t("successCod")}</p>
            <p className="mt-2 text-sm text-[var(--accent)]/90">{t("successEmailHint")}</p>
          </motion.div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {whatsappUrl ? (
              <motion.a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-whatsapp btn-primary-motion inline-flex justify-center text-center text-sm"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={spring}
              >
                {t("successWhatsappCta")}
              </motion.a>
            ) : null}
            <MotionLink
              href="/shop"
              className="btn-secondary inline-flex justify-center text-sm"
            >
              {t("successShopAgain")}
            </MotionLink>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
