"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MotionLink } from "@/components/motion-link";
import { ProductImage } from "@/components/product-image";
import type { ProductList } from "@/lib/api";
import { useCart, type CartLineProduct } from "@/contexts/cart-context";
import { isOfflineProductId } from "@/lib/catalog-fallback";
import { useTranslations } from "next-intl";

export function ShopProductCard({
  product,
  locale,
  index,
}: {
  product: ProductList["items"][number];
  locale: string;
  index: number;
}) {
  const t = useTranslations("shop");
  const { addItem } = useCart();
  const [adding, setAdding] = useState(false);
  const title = locale === "ar" ? product.nameAr : product.nameFr;

  function snapshot(): CartLineProduct {
    return {
      id: product.id,
      slug: product.slug,
      nameFr: product.nameFr,
      nameAr: product.nameAr,
      priceMad: product.priceMad,
      images: product.images ?? [],
      stock: product.stock,
    };
  }

  async function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock < 1 || adding) return;
    setAdding(true);
    try {
      if (isOfflineProductId(product.id)) {
        await addItem(product.id, 1, snapshot());
      } else {
        await addItem(product.id, 1, snapshot());
      }
    } catch {
      /* toast optional */
    } finally {
      setAdding(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.4) }}
      className="group/card relative"
    >
      <MotionLink
        href={`/product/${product.slug}`}
        className="card-chrome premium-product-card block overflow-hidden rounded-2xl"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-900 sm:aspect-video">
          <ProductImage
            src={product.images?.[0]}
            alt={title}
            fill
            className="transition duration-700 group-hover/card:scale-110"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg)]/70 via-transparent to-transparent opacity-60 transition group-hover/card:opacity-90" />
          {product.lowStock ? (
            <span className="absolute left-3 top-3 rounded-full bg-rose-500/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
              {t("lowStockBadge")}
            </span>
          ) : null}
          <motion.button
            type="button"
            onClick={quickAdd}
            disabled={product.stock < 1 || adding}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="absolute bottom-3 end-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hot)] text-lg font-bold text-slate-900 shadow-[0_8px_28px_-6px_var(--accent-glow)] disabled:opacity-40"
            aria-label={t("quickAddAria")}
          >
            {adding ? "…" : "+"}
          </motion.button>
        </div>
        <div className="p-4">
          <p className="line-clamp-2 text-sm font-medium text-[var(--fg)] transition group-hover/card:text-[var(--accent)]">
            {title}
          </p>
          <p className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-bold tabular-nums text-[var(--accent-hot)]">
              {product.priceMad}
            </span>
            <span className="text-xs text-[var(--muted)]">MAD</span>
            {product.ratingAvg != null ? (
              <span className="text-xs font-medium text-[var(--muted)]">
                ★ {product.ratingAvg.toFixed(1)}
              </span>
            ) : null}
          </p>
        </div>
      </MotionLink>
    </motion.div>
  );
}
