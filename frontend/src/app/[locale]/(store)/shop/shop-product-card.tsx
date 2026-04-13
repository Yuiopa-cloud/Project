"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { MotionLink } from "@/components/motion-link";
import { ProductImage } from "@/components/product-image";
import type { ProductList } from "@/lib/api";
import { useCart, type CartLineProduct } from "@/contexts/cart-context";
import { useCartFly } from "@/contexts/cart-fly-context";
import { isOfflineProductId } from "@/lib/catalog-fallback";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { MiniSpinner } from "@/components/mini-spinner";
import { formatSar } from "@/lib/price";

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
  const router = useRouter();
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();
  const { flyToCart } = useCartFly();
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
    if (product.variantsEnabled) {
      router.push(`/product/${product.slug}`);
      return;
    }
    setAdding(true);
    try {
      if (isOfflineProductId(product.id)) {
        await addItem(product.id, 1, snapshot(), null);
      } else {
        await addItem(product.id, 1, snapshot(), null);
      }
      flyToCart({
        imageSrc: product.images?.[0] ?? null,
        sourceEl: imageWrapRef.current,
      });
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
      whileHover={{ y: -5, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }}
    >
      <MotionLink
        href={`/product/${product.slug}`}
        className="premium-product-card group/card block overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition hover:border-[var(--accent)]/20 hover:shadow-md"
      >
        <div
          ref={imageWrapRef}
          className="relative aspect-[4/3] overflow-hidden bg-[var(--press-bg)] sm:aspect-[5/4]"
        >
          <ProductImage
            src={product.images?.[0]}
            alt={title}
            fill
            className="object-cover transition duration-500 ease-out group-hover/card:scale-[1.04]"
          />
          {product.lowStock ? (
            <span className="absolute left-3 top-3 rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              {t("lowStockBadge")}
            </span>
          ) : null}
          <motion.button
            type="button"
            onClick={quickAdd}
            disabled={product.stock < 1 || adding}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="absolute bottom-3 end-3 z-10 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[var(--accent)] text-lg font-bold leading-none text-white shadow-lg disabled:opacity-40"
            aria-label={t("quickAddAria")}
          >
            {adding ? <MiniSpinner className="h-4 w-4 border-2 border-white border-t-transparent" /> : "+"}
          </motion.button>
        </div>
        <div className="space-y-3 p-4">
          <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-[var(--fg)]">
            {title}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {product.ratingAvg != null ? (
              <span className="text-xs font-medium text-[var(--muted)]">
                ★ {product.ratingAvg.toFixed(1)}
              </span>
            ) : (
              <span className="text-xs text-[var(--muted)]">—</span>
            )}
            <span className="text-xs text-[var(--border)]">·</span>
            <span className="text-xs text-[var(--muted)]">
              {product.stock < 1 ? t("outOfStock") : t("inStock")}
            </span>
          </div>
          <div className="flex items-end justify-between gap-2 border-t border-[var(--border)] pt-3">
            <p className="text-lg font-bold tabular-nums text-[var(--fg)]">
              {formatSar(product.priceMad, locale)}
            </p>
            <span className="rounded-lg bg-[var(--accent-dim)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
              {t("viewProduct")}
            </span>
          </div>
        </div>
      </MotionLink>
    </motion.div>
  );
}
