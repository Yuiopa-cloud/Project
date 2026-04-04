import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ShopProductCard } from "./shop-product-card";
import type { ProductList } from "@/lib/api";
import { ALL_FALLBACK_PRODUCTS } from "@/lib/catalog-fallback";
import { serverFetchApiJson } from "@/lib/server-fetch-api";

export const dynamic = "force-dynamic";

const CATEGORY_SLUGS = [
  "interieur",
  "exterieur",
  "performance",
  "entretien",
] as const;

export default async function ShopPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ q?: string; sort?: string; category?: string }>;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations("shop");
  const tHome = await getTranslations("home");

  const qs = new URLSearchParams();
  if (sp.q) qs.set("q", sp.q);
  if (sp.sort) qs.set("sort", sp.sort);
  if (sp.category) qs.set("category", sp.category);
  qs.set("take", "48");

  let items: ProductList["items"] = [];
  let total = 0;
  let apiFailed = false;
  let apiStatus: number | undefined;

  const result = await serverFetchApiJson<ProductList>(`/products?${qs}`);
  if (result.ok) {
    items = result.data.items ?? [];
    total = result.data.total ?? 0;
  } else {
    apiFailed = true;
    apiStatus = result.status;
    console.error("[shop] products fetch failed", {
      url: result.url,
      status: result.status,
      cause: result.cause,
    });
  }

  const usingFallback = items.length === 0;
  if (usingFallback) {
    items = [...ALL_FALLBACK_PRODUCTS];
    total = items.length;
    if (sp.q?.trim()) {
      const qq = sp.q.trim().toLowerCase();
      items = items.filter(
        (p) =>
          p.nameFr.toLowerCase().includes(qq) ||
          p.nameAr.includes(qq) ||
          p.slug.includes(qq),
      );
      total = items.length;
    }
  }

  function sortHref(value: string) {
    const p = new URLSearchParams();
    if (sp.q) p.set("q", sp.q);
    if (sp.category) p.set("category", sp.category);
    p.set("sort", value);
    return `/shop?${p.toString()}`;
  }

  function categoryHref(slug: string | null) {
    const p = new URLSearchParams();
    if (sp.q) p.set("q", sp.q);
    if (sp.sort) p.set("sort", sp.sort);
    if (slug) p.set("category", slug);
    const q = p.toString();
    return q ? `/shop?${q}` : "/shop";
  }

  const catLabel = (slug: string) => {
    const map: Record<string, string> = {
      interieur: tHome("catInterior"),
      exterieur: tHome("catExterior"),
      performance: tHome("catPerformance"),
      entretien: tHome("catCare"),
    };
    return map[slug] ?? slug;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-12">
      {apiFailed ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-amber-600/40 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <p className="font-medium">{t("apiUnreachable")}</p>
          <p className="mt-1 text-xs text-amber-900/90">
            {apiStatus != null
              ? t("apiErrorStatus", { status: String(apiStatus) })
              : t("apiErrorGeneric")}
          </p>
        </div>
      ) : null}
      {!apiFailed && !usingFallback && total === 0 ? (
        <div
          role="status"
          className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]"
        >
          {t("catalogEmpty")}
        </div>
      ) : null}

      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-headline text-3xl text-[var(--fg)] sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {total} {usingFallback ? t("previewCount") : "SKU"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <aside className="shrink-0 lg:w-56">
          <div className="space-y-8 lg:sticky lg:top-28">
            <form
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm"
              action={locale ? `/${locale}/shop` : "/fr/shop"}
              method="get"
            >
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {t("search")}
              </label>
              <input
                name="q"
                placeholder={t("search")}
                defaultValue={sp.q}
                className="checkout-input mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--press-bg)] px-3 py-2.5 text-sm text-[var(--fg)] placeholder:text-[var(--muted)]"
              />
              {sp.sort ? (
                <input type="hidden" name="sort" value={sp.sort} />
              ) : null}
              {sp.category ? (
                <input type="hidden" name="category" value={sp.category} />
              ) : null}
              <button
                type="submit"
                className="btn-primary mt-3 w-full rounded-xl py-2.5 text-sm font-semibold"
              >
                {t("filters")}
              </button>
            </form>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {t("sidebarCategories")}
              </h2>
              <ul className="mt-3 space-y-1">
                <li>
                  <Link
                    href="/shop"
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-[var(--press-bg)] ${
                      !sp.category ? "bg-[var(--accent-dim)] text-[var(--accent)]" : "text-[var(--fg)]"
                    }`}
                  >
                    {t("allProducts")}
                  </Link>
                </li>
                {CATEGORY_SLUGS.map((slug) => (
                  <li key={slug}>
                    <Link
                      href={categoryHref(slug)}
                      className={`block rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-[var(--press-bg)] ${
                        sp.category === slug
                          ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                          : "text-[var(--fg)]"
                      }`}
                    >
                      {catLabel(slug)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {t("sidebarSort")}
              </h2>
              <ul className="mt-3 space-y-1">
                <li>
                  <Link
                    href={sortHref("popular")}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-[var(--press-bg)] ${
                      (sp.sort ?? "popular") === "popular"
                        ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                        : "text-[var(--fg)]"
                    }`}
                  >
                    {t("sortPopular")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={sortHref("new")}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-[var(--press-bg)] ${
                      sp.sort === "new"
                        ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                        : "text-[var(--fg)]"
                    }`}
                  >
                    {t("sortNew")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={sortHref("price_asc")}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-[var(--press-bg)] ${
                      sp.sort === "price_asc"
                        ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                        : "text-[var(--fg)]"
                    }`}
                  >
                    {t("sortPriceAsc")}
                  </Link>
                </li>
                <li>
                  <Link
                    href={sortHref("price_desc")}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-[var(--press-bg)] ${
                      sp.sort === "price_desc"
                        ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                        : "text-[var(--fg)]"
                    }`}
                  >
                    {t("sortPriceDesc")}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {items.map((p, i) => (
              <ShopProductCard key={p.id} product={p} locale={locale} index={i} />
            ))}
          </div>
          {items.length === 0 ? (
            <p className="py-20 text-center text-[var(--muted)]">{t("empty")}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
