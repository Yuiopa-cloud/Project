import { getTranslations } from "next-intl/server";
import type { ProductList } from "@/lib/api";
import { TRENDING_FALLBACK } from "@/lib/trending-fallback";
import { serverFetchApiJson } from "@/lib/server-fetch-api";
import { ShopProductCard } from "./shop/shop-product-card";
import { MobileStickyCta } from "@/components/mobile-sticky-cta";
import { HomeStoreHero } from "@/components/home-store-hero";
import { HomeCategoryShortcuts } from "@/components/home-category-shortcuts";
import { HomeWhyUs } from "@/components/home-why-us";
import { HomeBrandStrip } from "@/components/home-brand-strip";

export const dynamic = "force-dynamic";

async function getProducts(): Promise<ProductList["items"]> {
  const r = await serverFetchApiJson<ProductList>("/products?sort=popular&take=24");
  if (!r.ok) {
    console.error("[home] products fetch failed", r.url, r.status, r.cause);
    return TRENDING_FALLBACK.slice(0, 24);
  }
  const data = r.data;
  if (!data.items?.length) return TRENDING_FALLBACK.slice(0, 24);
  return data.items;
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const tFooter = await getTranslations("footer");
  const items = await getProducts();

  const categories = [
    { slug: "home-garden", label: "Home & Garden" },
    { slug: "toys-hobbies", label: "Toys & Hobbies" },
    { slug: "electronics", label: "Electronics" },
    { slug: "jewelry-accessories", label: "Jewelry & accessories" },
    { slug: "clothing", label: "Clothing" },
  ];

  const featured = items.slice(0, 8);
  const bestSellers = items.slice(8, 16).length ? items.slice(8, 16) : items.slice(0, 8);

  const whyItems = [
    { title: t("whyUsDeliveryTitle"), body: t("whyUsDeliveryBody") },
    { title: t("whyUsReturnsTitle"), body: t("whyUsReturnsBody") },
    { title: t("whyUsSupportTitle"), body: t("whyUsSupportBody") },
    { title: t("whyUsTrustTitle"), body: t("whyUsTrustBody") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 md:pb-24 md:pt-10">
      <HomeStoreHero
        headline={t("storeHeroHeadline")}
        subheadline={t("storeHeroSub")}
        cta={t("storeHeroCta")}
        imageAlt={t("storeHeroImageAlt")}
      />

      <section className="mt-8 sm:mt-10" aria-labelledby="featured-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="featured-heading"
              className="section-headline text-xl text-[var(--fg)] sm:text-2xl"
            >
              {t("featuredTitle")}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">{t("featuredSub")}</p>
          </div>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p, i) => (
            <ShopProductCard key={p.id} product={p} locale={locale} index={i} />
          ))}
        </div>
      </section>

      <div className="mt-12 sm:mt-14">
        <HomeCategoryShortcuts title={t("categoryShortcutsTitle")} items={categories} />
      </div>

      <HomeWhyUs title={t("whyUsSectionTitle")} items={whyItems} trustAlt={tFooter("trustBadgesAlt")} />

      <section className="mt-4 sm:mt-6" aria-labelledby="bestsellers-heading">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="bestsellers-heading"
              className="section-headline text-xl text-[var(--fg)] sm:text-2xl"
            >
              {t("bestSellersTitle")}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">{t("bestSellersSub")}</p>
          </div>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {bestSellers.map((p, i) => (
            <ShopProductCard key={`${p.id}-bs`} product={p} locale={locale} index={i} />
          ))}
        </div>
      </section>

      <HomeBrandStrip />

      <MobileStickyCta label={t("storeHeroCta")} href="/shop" />
    </div>
  );
}
