"use client";

import { motion } from "framer-motion";
import { MotionLink } from "@/components/motion-link";
import { ProductImage } from "@/components/product-image";
import type { ProductList } from "@/lib/api";

export function TrendingCard({
  product,
  index,
  locale,
}: {
  product: ProductList["items"][number];
  index: number;
  locale: string;
}) {
  const title = locale === "ar" ? product.nameAr : product.nameFr;
  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay: (index % 8) * 0.04, duration: 0.45 }}
      whileHover={{
        y: -6,
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
      }}
    >
      <MotionLink
        href={`/product/${product.slug}`}
        className="card-chrome premium-product-card group flex h-full flex-col overflow-hidden rounded-2xl"
      >
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-zinc-900">
          <ProductImage
            src={product.images?.[0]}
            alt={title}
            fill
            className="transition duration-700 ease-out group-hover:scale-[1.08]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg)]/50 to-transparent opacity-0 transition group-hover:opacity-100" />
        </div>
        <div className="flex flex-1 flex-col space-y-1 p-4">
          <p className="line-clamp-2 text-sm font-medium text-[var(--fg)] group-hover:text-[var(--accent)]">
            {title}
          </p>
          <p className="text-[var(--accent-hot)]">
            {product.priceMad}{" "}
            <span className="text-xs text-[var(--muted)]">MAD</span>
          </p>
          {product.lowStock ? (
            <p className="text-xs text-rose-400">Stock limité</p>
          ) : null}
        </div>
      </MotionLink>
    </motion.div>
  );
}
