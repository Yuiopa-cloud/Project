import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ProductList } from "@/lib/api";
import { TrendingRail } from "@/components/trending-rail";
import { TRENDING_FALLBACK } from "@/lib/trending-fallback";
import { serverFetchApiJson } from "@/lib/server-fetch-api";
import { HomeEditorialHero } from "@/components/home-editorial-hero";
import { HomeFeaturedProduct } from "@/components/home-featured-product";
import { HomeSocialProof } from "@/components/home-social-proof";
import { MobileStickyCta } from "@/components/mobile-sticky-cta";
import { ScrollReveal } from "@/components/scroll-reveal";
import { HomeInspirationBand } from "@/components/home-inspiration-band";
import { HomeProductGallery } from "@/components/home-product-gallery";
import { WHATSAPP_CHAT_URL } from "@/lib/site-contact";

/** Avoid caching an empty "Tendances" block from build-time when the API was off. */
export const dynamic = "force-dynamic";

async function getTrending(): Promise<{
  items: ProductList["items"];
  isFallback: boolean;
}> {
  const r = await serverFetchApiJson<ProductList>(
    "/products?sort=popular&take=24",
  );
  if (!r.ok) {
    console.error("[home] trending fetch failed", r.url, r.status, r.cause);
    return { items: TRENDING_FALLBACK.slice(0, 8), isFallback: true };
  }
  const data = r.data;
  if (!data.items?.length) {
    return { items: TRENDING_FALLBACK.slice(0, 8), isFallback: true };
  }
  return { items: data.items.slice(0, 24), isFallback: false };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const { items, isFallback } = await getTrending();

  const categories = [
    { slug: "interieur", label: t("catInterior") },
    { slug: "exterieur", label: t("catExterior") },
    { slug: "performance", label: t("catPerformance") },
    { slug: "entretien", label: t("catCare") },
  ];

  const stats = [
    { label: t("statShip"), value: t("statShipVal") },
    { label: t("statCities"), value: t("statCitiesVal") },
    { label: t("statRating"), value: t("statRatingVal") },
  ];

  const featuredProduct = items[0];
  const railItems = items.length > 1 ? items.slice(1, 8) : [];
  const galleryProducts =
    items.length > 10
      ? items.slice(8, 24)
      : items.length > 5
        ? items.slice(5)
        : items;

  const reviews = [t("socialReview1"), t("socialReview2"), t("socialReview3")] as [
    string,
    string,
    string,
  ];

  return (
    <>
      <HomeEditorialHero
        kicker={t("heroEditorialKicker")}
        title={t("heroEditorialTitle")}
        tagline={t("heroEditorialSub")}
        ctaShop={t("heroEditorialCtaShop")}
        ctaWhatsApp={t("ctaWhatsApp")}
        waHref={WHATSAPP_CHAT_URL}
      />
      <div className="mx-auto max-w-7xl px-4 pb-32 pt-10 sm:px-6 md:px-8 md:pb-28 md:pt-14 lg:px-10">
        <div className="mt-2 md:mt-4">
          <HomeSocialProof
            starsLabel={t("socialProofStarsAria")}
            headline={t("socialProofHeadline")}
            reviews={reviews}
          />
        </div>

        <ScrollReveal className="mt-10 md:mt-12">
          <div className="card-chrome grid gap-8 rounded-2xl p-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-[var(--border)]/70 sm:p-10">
          {stats.map((s) => (
            <div
              key={s.label}
              className="text-center sm:px-6 sm:text-start md:px-8"
            >
              <p className="font-display text-2xl font-semibold tracking-tight text-[color-mix(in_srgb,var(--accent)_90%,var(--primary-mid))] md:text-3xl">
                {s.value}
              </p>
              <p className="mt-2 text-sm leading-snug text-[var(--muted)]">
                {s.label}
              </p>
            </div>
          ))}
          </div>
        </ScrollReveal>

        <HomeInspirationBand />

        <section className="mt-20 md:mt-24">
          <ScrollReveal className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <h2 className="section-headline text-2xl text-[var(--fg)] md:text-3xl">
                {t("categories")}
              </h2>
              <p className="max-w-md text-sm text-[var(--muted)]">
                {t("categoryExplore")}
              </p>
            </div>
            <Link
              href="/shop"
              className="btn-secondary inline-flex w-full min-h-[3.25rem] sm:w-fit md:self-end"
            >
              {t("shopAll")}
            </Link>
          </ScrollReveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c, i) => (
              <ScrollReveal key={c.slug} delay={i * 0.06} y={18}>
                <Link
                  href={`/shop?category=${c.slug}`}
                  className="card-chrome premium-category-tile group relative block overflow-hidden rounded-2xl p-6 md:p-8"
                >
                  <p className="font-display text-lg font-semibold tracking-tight text-[var(--fg)] transition group-hover:text-[var(--accent)] md:text-xl">
                    {c.label}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[var(--muted)] transition group-hover:text-[var(--accent)]">
                    {t("categoryExplore")}
                    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="mt-20 md:mt-28">
          <ScrollReveal className="mb-6 md:mb-8">
            <h2 className="section-headline text-2xl text-[var(--fg)] md:text-3xl">
              {t("trending")}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)] md:text-base">
              {t("trendingSub")}
            </p>
          </ScrollReveal>
          {featuredProduct ? (
            <HomeFeaturedProduct
              product={featuredProduct}
              locale={locale}
              popularBadge={t("popularBadge")}
              ctaLabel={t("featuredCta")}
            />
          ) : null}
          {railItems.length > 0 ? (
            <TrendingRail
              items={railItems}
              locale={locale}
              durationSec={Math.max(36, railItems.length * 7)}
            />
          ) : null}
          {isFallback ? (
            <p className="mt-6 text-center text-sm text-[var(--muted)]">
              {t("catalogPreviewNote")}
            </p>
          ) : null}
        </section>

        <HomeProductGallery products={galleryProducts} locale={locale} />

        <MobileStickyCta label={t("ctaOrder")} href="/shop" />
    </div>
    </>
  );
}
