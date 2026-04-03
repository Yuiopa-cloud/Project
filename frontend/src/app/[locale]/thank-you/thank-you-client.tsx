"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { MotionLink } from "@/components/motion-link";

const spring = { type: "spring" as const, stiffness: 380, damping: 32 };

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

  const paymentLabel =
    payment === "STRIPE" ? t("stripe") : t("thankYouPaymentCod");

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-14 md:py-20">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-64 w-[min(100%,28rem)] -translate-x-1/2 rounded-full opacity-35 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--accent-glow-soft), transparent 70%)",
        }}
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring}
        className="card-chrome relative overflow-hidden rounded-3xl p-7 text-center shadow-[0_0_60px_-28px_var(--accent-glow)] md:p-10"
      >
        <motion.div
          className="checkout-glow absolute inset-0 opacity-40"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 0.6 }}
        />
        <div className="relative z-10">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
            {t("thankYouKicker")}
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--fg)] md:text-4xl">
            {t("thankYouConfirmed")}
          </h1>
          {meta?.firstName ? (
            <p className="mt-3 text-base text-[var(--muted)] md:text-lg">
              {meta.firstName} — {t("successLead")}
            </p>
          ) : (
            <p className="mt-3 text-base text-[var(--muted)] md:text-lg">
              {t("successLead")}
            </p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.12 }}
            className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--press-bg)]/60 p-6 text-start md:p-8"
          >
            <dl className="space-y-5">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                  {t("successOrderLabel")}
                </dt>
                <dd className="mt-1 font-mono text-xl font-bold text-[var(--accent)] md:text-2xl">
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, ...spring }}
          >
            <MotionLink
              href="/shop"
              className="btn-primary-motion inline-flex justify-center rounded-full px-6 py-3 text-sm font-semibold"
            >
              {t("successShopAgain")}
            </MotionLink>
            {meta?.whatsappUrl ? (
              <motion.a
                href={meta.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-whatsapp btn-primary-motion inline-flex justify-center text-center text-sm"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={spring}
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
