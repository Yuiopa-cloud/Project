"use client";

import { motion } from "framer-motion";
import { MotionLink } from "@/components/motion-link";
import { ProductImage } from "@/components/product-image";
import type { ProductList } from "@/lib/api";
import { formatSar } from "@/lib/price";

export function HomeFeaturedProduct({
  product,
  locale,
  popularBadge,
  ctaLabel,
}: {
  product: ProductList["items"][number];
  locale: string;
  popularBadge: string;
  ctaLabel: string;
}) {
  const title = locale === "ar" ? product.nameAr : product.nameFr;

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mb-6"
    >
      <MotionLink
        href={`/product/${product.slug}`}
        className="card-chrome premium-product-card group relative flex flex-col overflow-hidden rounded-3xl md:flex-row md:items-stretch"
      >
        <span className="absolute left-4 top-4 z-20 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow-lg md:left-6 md:top-6">
          {popularBadge}
        </span>
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-zinc-900 md:aspect-auto md:w-[min(48%,420px)] md:min-h-[280px]">
          <ProductImage
            src={product.images?.[0]}
            alt={title}
            fill
            className="transition duration-700 ease-out group-hover:scale-[1.06]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--bg)]/60 to-transparent md:bg-gradient-to-r" />
        </div>
        <div className="flex flex-1 flex-col justify-center gap-4 p-6 md:p-10">
          <p className="font-display text-xl font-semibold leading-snug text-[var(--fg)] md:text-2xl">
            {title}
          </p>
          <p className="text-2xl font-semibold tabular-nums text-[color-mix(in_srgb,var(--accent)_80%,var(--primary-mid))] md:text-3xl">
            {formatSar(product.priceMad, locale)}
          </p>
          <span className="btn-primary pointer-events-none inline-flex w-fit min-h-[3rem] select-none px-6 text-sm md:min-h-[3.25rem] md:text-base">
            {ctaLabel}
          </span>
        </div>
      </MotionLink>
    </motion.div>
  );
}
