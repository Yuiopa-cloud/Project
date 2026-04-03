import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ProductList } from "@/lib/api";
import { TrendingRail } from "@/components/trending-rail";
import { TRENDING_FALLBACK } from "@/lib/trending-fallback";
import { serverFetchApiJson } from "@/lib/server-fetch-api";
import { HomeHeroCtas } from "@/components/home-hero-ctas";
import { HomeHeroMotion } from "@/components/home-hero-motion";
import { LandingHeroShowcase } from "@/components/landing-hero-showcase";
import { ScrollReveal } from "@/components/scroll-reveal";
import { WHATSAPP_CHAT_URL } from "@/lib/site-contact";

/** Avoid caching an empty "Tendances" block from build-time when the API was off. */
export const dynamic = "force-dynamic";

async function getTrending(): Promise<{
  items: ProductList["items"];
  isFallback: boolean;
}> {
  const r = await serverFetchApiJson<ProductList>(
    "/products?sort=popular&take=8",
  );
  if (!r.ok) {
    console.error("[home] trending fetch failed", r.url, r.status, r.cause);
    return { items: TRENDING_FALLBACK.slice(0, 4), isFallback: true };
  }
  const data = r.data;
  if (!data.items?.length) {
    return { items: TRENDING_FALLBACK.slice(0, 4), isFallback: true };
  }
  return { items: data.items.slice(0, 8), isFallback: false };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const { items, isFallback } = await getTrending();

  const heroShots = items
    .map((p) => p.images?.[0])
    .filter((x): x is string => Boolean(x));

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

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 md:px-8 md:pt-12 lg:px-10">
      <section className="premium-hero-shell relative px-5 py-12 sm:px-8 sm:py-14 md:px-12 md:py-20">
        <div className="premium-hero-aurora" aria-hidden />

        <div className="relative grid items-center gap-14 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <HomeHeroMotion
            heroKicker={t("heroKicker")}
            heroTitle={t("heroTitle")}
            heroSub={t("heroSub")}
            heroHighlight={t("heroHighlight")}
            trustCod={t("trustCod")}
            trustWarranty={t("trustWarranty")}
          >
            <HomeHeroCtas
              ctaShop={t("ctaShop")}
              ctaWhatsApp={t("ctaWhatsApp")}
              waHref={WHATSAPP_CHAT_URL}
            />
          </HomeHeroMotion>
          <LandingHeroShowcase imageUrls={heroShots} />
        </div>
      </section>

      <ScrollReveal className="mt-12 md:mt-16">
        <div className="card-chrome grid gap-8 rounded-2xl p-8 sm:grid-cols-3 sm:p-10">
          {stats.map((s) => (
            <div key={s.label} className="text-center sm:text-start">
              <p className="font-display text-2xl font-semibold tracking-tight text-[color-mix(in_srgb,var(--accent)_90%,var(--primary-mid))] md:text-3xl">
                {s.value}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">{s.label}</p>
            </div>
          ))}
        </div>
      </ScrollReveal>

      <section className="mt-20 md:mt-24">
        <ScrollReveal className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-semibold text-[var(--fg)] md:text-3xl">
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
                className="card-chrome group relative block overflow-hidden rounded-2xl p-6 transition md:p-8"
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
          <h2 className="font-display text-2xl font-semibold text-[var(--fg)] md:text-3xl">
            {t("trending")}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)] md:text-base">
            {t("trendingSub")}
          </p>
        </ScrollReveal>
        <TrendingRail
          items={items}
          locale={locale}
          durationSec={Math.max(36, items.length * 7)}
        />
        {isFallback ? (
          <p className="mt-4 text-center text-xs text-[var(--accent)]/85">
            {locale === "ar"
              ? "معاينة ثابتة — لتفعيل البيانات الحية شغّل الـ API ثم npm run db:seed في backend."
              : "Aperçu catalogue (API indisponible) — démarrez le backend puis `npm run db:seed` pour prix & stocks réels."}
          </p>
        ) : null}
      </section>

      <section className="mt-20 md:mt-28">
        <ScrollReveal>
          <h2 className="mb-8 font-display text-2xl font-semibold text-[var(--fg)] md:text-3xl">
            {t("testimonials")}
          </h2>
        </ScrollReveal>
        <div className="grid gap-6 md:grid-cols-2">
          <ScrollReveal delay={0.05} y={20}>
            <figure className="card-chrome rounded-2xl p-8 md:p-10">
              <blockquote className="text-base font-normal leading-relaxed text-[var(--fg)]">
                {t("testimonial1")}
              </blockquote>
              <figcaption className="mt-6 text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
                {t("testimonial1Author")}
              </figcaption>
            </figure>
          </ScrollReveal>
          <ScrollReveal delay={0.12} y={20}>
            <figure className="card-chrome rounded-2xl p-8 md:p-10">
              <blockquote className="text-base font-normal leading-relaxed text-[var(--fg)]">
                {t("testimonial2")}
              </blockquote>
              <figcaption className="mt-6 text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
                {t("testimonial2Author")}
              </figcaption>
            </figure>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
