"use client";

import { motion } from "framer-motion";
import { MotionLink } from "@/components/motion-link";
import { ProductImage } from "@/components/product-image";
import type { ProductList } from "@/lib/api";

export function ShopProductCard({
  product,
  locale,
  index,
}: {
  product: ProductList["items"][number];
  locale: string;
  index: number;
}) {
  const title = locale === "ar" ? product.nameAr : product.nameFr;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.4) }}
    >
      <MotionLink
        href={`/product/${product.slug}`}
        className="card-chrome group block overflow-hidden rounded-2xl"
      >
        <div className="relative aspect-video overflow-hidden bg-zinc-900">
          <ProductImage
            src={product.images?.[0]}
            alt={title}
            fill
            className="transition duration-700 group-hover:scale-110"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg)]/55 via-transparent to-[var(--accent)]/12 opacity-0 transition group-hover:opacity-100" />
        </div>
        <div className="p-4">
          <p className="line-clamp-2 text-sm font-medium text-[var(--fg)] group-hover:text-[var(--accent)]">
            {title}
          </p>
          <p className="mt-2 font-medium text-[var(--accent-hot)]">
            {product.priceMad} MAD
            {product.ratingAvg != null ? (
              <span className="ms-2 text-xs font-normal text-[var(--muted)]">
                ★ {product.ratingAvg.toFixed(1)}
              </span>
            ) : null}
          </p>
        </div>
      </MotionLink>
    </motion.div>
  );
}
