"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import type { ProductList } from "@/lib/api";
import { ShopProductCard } from "@/app/[locale]/(store)/shop/shop-product-card";

export function HomeProductGallery({
  products,
  locale,
}: {
  products: ProductList["items"];
  locale: string;
}) {
  const t = useTranslations("home");
  const reduce = useReducedMotion();

  if (products.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: reduce ? 0.2 : 0.5 }}
      className="mt-20 md:mt-28"
      aria-labelledby="home-gallery-heading"
    >
      <div className="mb-8 max-w-2xl md:mb-10">
        <h2
          id="home-gallery-heading"
          className="section-headline text-2xl text-[var(--fg)] md:text-3xl"
        >
          {t("galleryTitle")}
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)] md:text-base">
          {t("gallerySub")}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p, i) => (
          <ShopProductCard
            key={`${p.id}-gallery-${i}`}
            product={p}
            locale={locale}
            index={i}
          />
        ))}
      </div>
    </motion.section>
  );
}
