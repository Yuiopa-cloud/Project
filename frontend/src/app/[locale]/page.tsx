import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ProductList } from "@/lib/api";
import { TrendingRail } from "@/components/trending-rail";
import { TRENDING_FALLBACK } from "@/lib/trending-fallback";
import { serverFetchApiJson } from "@/lib/server-fetch-api";
import { HomeHeroCtas } from "@/components/home-hero-ctas";
import { LandingHeroShowcase } from "@/components/landing-hero-showcase";
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
    { slug: "interieur", label: t("catInterior"), emoji: "🛋️" },
    { slug: "exterieur", label: t("catExterior"), emoji: "✨" },
    { slug: "performance", label: t("catPerformance"), emoji: "⚡" },
    { slug: "entretien", label: t("catCare"), emoji: "🧽" },
  ];

  const stats = [
    { label: t("statShip"), value: t("statShipVal") },
    { label: t("statCities"), value: t("statCitiesVal") },
    { label: t("statRating"), value: t("statRatingVal") },
  ];

  const benefits = [
    { title: t("why1Title"), body: t("why1Body") },
    { title: t("why2Title"), body: t("why2Body") },
    { title: t("why3Title"), body: t("why3Body") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-3 pb-24 pt-6 sm:px-4 md:pt-10">
      <section className="card-chrome relative overflow-hidden rounded-2xl px-4 py-10 sm:rounded-3xl sm:px-6 sm:py-12 md:px-10 md:py-16">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent)]/18 via-transparent to-[var(--accent-hot)]/14" />
        <div className="pointer-events-none absolute -right-32 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-[var(--accent-hot)]/10 blur-3xl" />

        <div className="relative grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
          <div className="max-w-xl space-y-5 lg:space-y-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
              {t("heroKicker")}
            </p>
            <h1 className="text-[2rem] font-semibold leading-tight tracking-tight text-[var(--fg)] sm:text-4xl md:text-5xl">
              {t("heroTitle")}
            </h1>
            <p className="text-base text-[var(--muted)] md:text-lg">
              {t("heroSub")}
            </p>
            <p className="text-sm font-medium text-[var(--accent-hot)]">
              {t("heroHighlight")}
            </p>
            <HomeHeroCtas
              ctaShop={t("ctaShop")}
              ctaWhatsApp={t("ctaWhatsApp")}
              waHref={WHATSAPP_CHAT_URL}
            />
            <div className="flex flex-wrap gap-3 pt-2 md:gap-4 md:pt-4">
              <span className="chip-interactive">{t("trustCod")}</span>
              <span className="chip-interactive">{t("trustShip")}</span>
              <span className="chip-interactive">{t("trustWarranty")}</span>
            </div>
          </div>
          <LandingHeroShowcase imageUrls={heroShots} />
        </div>
      </section>

      <div className="mt-10 grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--press-bg)]/50 p-5 sm:grid-cols-3 sm:p-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center sm:text-start">
            <p className="text-2xl font-bold tracking-tight text-[var(--accent)] md:text-3xl">
              {s.value}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-xs text-[var(--muted)] sm:text-sm">
        {t("trustSocial")}
      </p>

      <section className="mt-16 md:mt-20">
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--fg)] md:text-2xl">
              {t("categories")}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("categoryExplore")}
            </p>
          </div>
          <Link
            href="/shop"
            className="btn-secondary inline-flex w-fit text-sm md:self-end"
          >
            {t("shopAll")}
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/shop?category=${c.slug}`}
              className="card-chrome group relative overflow-hidden rounded-2xl p-5 transition"
            >
              <span className="text-3xl">{c.emoji}</span>
              <p className="mt-3 font-semibold text-[var(--fg)] group-hover:text-[var(--accent)]">
                {c.label}
              </p>
              <span className="mt-2 inline-flex text-xs font-medium text-[var(--accent)] opacity-80 group-hover:opacity-100">
                {t("categoryExplore")} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16 md:mt-20">
        <h2 className="text-xl font-semibold text-[var(--fg)] md:text-2xl">
          {t("whyTitle")}
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="card-chrome rounded-2xl p-5 transition hover:border-[var(--accent)]/30"
            >
              <p className="font-semibold text-[var(--fg)]">{b.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {b.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 md:mt-20">
        <div className="mb-4 md:mb-6">
          <h2 className="text-xl font-semibold text-[var(--fg)] md:text-2xl">
            {t("trending")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            {t("trendingSub")}
          </p>
        </div>
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

      <section className="mt-16 md:mt-20">
        <h2 className="mb-6 text-xl font-semibold text-[var(--fg)] md:text-2xl">
          {t("testimonials")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <figure className="card-chrome rounded-2xl p-6">
            <blockquote className="text-sm leading-relaxed text-[var(--fg)]">
              {t("testimonial1")}
            </blockquote>
            <figcaption className="mt-4 text-xs font-medium text-[var(--accent)]">
              {t("testimonial1Author")}
            </figcaption>
          </figure>
          <figure className="card-chrome rounded-2xl p-6">
            <blockquote className="text-sm leading-relaxed text-[var(--fg)]">
              {t("testimonial2")}
            </blockquote>
            <figcaption className="mt-4 text-xs font-medium text-[var(--accent)]">
              {t("testimonial2Author")}
            </figcaption>
          </figure>
        </div>
      </section>
    </div>
  );
}
