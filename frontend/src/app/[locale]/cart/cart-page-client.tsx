"use client";

import { motion } from "framer-motion";
import { ProductImage } from "@/components/product-image";
import { useLocale, useTranslations } from "next-intl";
import { MotionLink } from "@/components/motion-link";
import { useCart } from "@/contexts/cart-context";

const tap = { scale: 0.9 };

export function CartPageClient() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const { cart, loading, setQty, refresh } = useCart();

  if (loading && !cart) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="skeleton h-10 w-48 rounded-lg" />
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const lines = cart?.items ?? [];

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
          <MotionLink href="/shop" className="btn-primary mt-8">
            → Shop
          </MotionLink>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-[var(--fg)]">{t("title")}</h1>
        <motion.button
          type="button"
          onClick={() => refresh()}
          whileHover={{ y: -1 }}
          whileTap={tap}
          className="btn-ghost px-2 py-1 text-xs underline decoration-[var(--accent)]/50 underline-offset-2"
        >
          Refresh
        </motion.button>
      </div>
      <ul className="mt-8 space-y-4">
        {lines.map((line, i) => {
          const p = line.product;
          const title = locale === "ar" ? p.nameAr : p.nameFr;
          const price =
            typeof p.priceMad === "string"
              ? p.priceMad
              : String(p.priceMad);
          return (
            <motion.li
              key={line.id}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-chrome flex flex-col gap-4 rounded-2xl p-4 sm:flex-row"
            >
              <div className="relative mx-auto h-24 w-28 max-w-full shrink-0 overflow-hidden rounded-xl bg-zinc-900 sm:mx-0">
                <ProductImage src={p.images?.[0]} alt="" fill />
              </div>
              <div className="min-w-0 flex-1">
                <MotionLink
                  href={`/product/${p.slug}`}
                  className="font-medium text-[var(--fg)] hover:text-[var(--accent)]"
                >
                  {title}
                </MotionLink>
                <p className="mt-1 text-sm text-[var(--accent)]">
                  {price} MAD
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <motion.button
                    type="button"
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--press-bg)] text-lg font-medium shadow-[0_4px_12px_-8px_rgba(0,0,0,0.4)]"
                    whileTap={tap}
                    onClick={() =>
                      setQty(p.id, Math.max(0, line.quantity - 1)).catch(
                        console.error,
                      )
                    }
                  >
                    −
                  </motion.button>
                  <span className="w-8 text-center text-sm">{line.quantity}</span>
                  <motion.button
                    type="button"
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--press-bg)] text-lg font-medium shadow-[0_4px_12px_-8px_rgba(0,0,0,0.4)]"
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
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <MotionLink href="/checkout" className="btn-primary text-center">
          {t("checkout")}
        </MotionLink>
      </div>
    </div>
  );
}
