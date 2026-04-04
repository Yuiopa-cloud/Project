"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ProductImage } from "@/components/product-image";
import { useLocale, useTranslations } from "next-intl";
import { MotionLink } from "@/components/motion-link";
import { useCart } from "@/contexts/cart-context";

const tap = { scale: 0.9 };

function parseMad(v: string | number): number {
  const s = String(v).replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function CartPageClient() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const { cart, loading, setQty, refresh } = useCart();

  const lines = cart?.items ?? [];

  const { subtotal, count } = useMemo(() => {
    let sum = 0;
    let c = 0;
    for (const line of lines) {
      const unit = parseMad(line.product.priceMad);
      sum += unit * line.quantity;
      c += line.quantity;
    }
    return { subtotal: sum, count: c };
  }, [lines]);

  if (loading && !cart) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="skeleton h-10 w-48 rounded-lg" />
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-semibold text-[var(--fg)]">{t("title")}</h1>
          <p className="mt-4 text-[var(--muted)]">{t("empty")}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">{t("shippingNote")}</p>
          <MotionLink
            href="/shop"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--accent)] px-8 text-sm font-semibold text-white"
          >
            {t("continueShopping")}
          </MotionLink>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-8 px-4 py-10 lg:grid-cols-[1fr_280px] lg:items-start">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-[var(--fg)]">{t("title")}</h1>
          <motion.button
            type="button"
            onClick={() => refresh()}
            whileHover={{ y: -1 }}
            whileTap={tap}
            className="text-xs font-medium text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2"
          >
            {t("refresh")}
          </motion.button>
        </div>
        <ul className="mt-8 space-y-4">
          {lines.map((line, i) => {
            const p = line.product;
            const title = locale === "ar" ? p.nameAr : p.nameFr;
            const price =
              typeof p.priceMad === "string" ? p.priceMad : String(p.priceMad);
            return (
              <motion.li
                key={line.id}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm"
              >
                <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-[var(--press-bg)]">
                  <ProductImage src={p.images?.[0]} alt="" fill />
                </div>
                <div className="min-w-0 flex-1">
                  <MotionLink
                    href={`/product/${p.slug}`}
                    className="font-semibold text-[var(--fg)] hover:text-[var(--accent)]"
                  >
                    {title}
                  </MotionLink>
                  <p className="mt-1 text-sm font-medium text-[var(--fg)]">
                    {price} MAD
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <motion.button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--press-bg)] text-lg"
                      whileTap={tap}
                      onClick={() =>
                        setQty(p.id, Math.max(0, line.quantity - 1)).catch(
                          console.error,
                        )
                      }
                    >
                      −
                    </motion.button>
                    <span className="w-8 text-center text-sm font-medium">
                      {line.quantity}
                    </span>
                    <motion.button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--press-bg)] text-lg"
                      whileTap={tap}
                      onClick={() =>
                        setQty(p.id, line.quantity + 1).catch(console.error)
                      }
                    >
                      +
                    </motion.button>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-28">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("orderSummary")}
          </p>
          <p className="mt-4 text-sm text-[var(--muted)]">
            {t("itemsCount", { count })}
          </p>
          <div className="mt-4 flex items-baseline justify-between border-t border-[var(--border)] pt-4">
            <span className="text-sm font-medium text-[var(--muted)]">
              {t("estimatedTotal")}
            </span>
            <span className="text-xl font-bold tabular-nums text-[var(--fg)]">
              {subtotal.toFixed(2)} MAD
            </span>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">{t("shippingNote")}</p>
          <MotionLink
            href="/checkout"
            className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(22,163,74,0.35)]"
          >
            {t("checkout")}
          </MotionLink>
        </div>
      </aside>
    </div>
  );
}
