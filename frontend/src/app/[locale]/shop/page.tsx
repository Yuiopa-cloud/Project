import { getTranslations } from "next-intl/server";
import { ShopProductCard } from "./shop-product-card";
import type { ProductList } from "@/lib/api";
import { ALL_FALLBACK_PRODUCTS } from "@/lib/catalog-fallback";
import { serverFetchApiJson } from "@/lib/server-fetch-api";

export const dynamic = "force-dynamic";

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-12">
      {apiFailed ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-amber-600/40 bg-amber-500/[0.12] px-4 py-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
        >
          <p className="font-medium">{t("apiUnreachable")}</p>
          <p className="mt-1 text-xs text-amber-900/85 dark:text-amber-200/90">
            {apiStatus != null
              ? t("apiErrorStatus", { status: String(apiStatus) })
              : t("apiErrorGeneric")}
          </p>
        </div>
      ) : null}
      {!apiFailed && !usingFallback && total === 0 ? (
        <div
          role="status"
          className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 px-4 py-3 text-sm text-[var(--muted)]"
        >
          {t("catalogEmpty")}
        </div>
      ) : null}
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="section-headline text-3xl text-[var(--fg)] sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            {total} {usingFallback ? t("previewCount") : "SKU"}
          </p>
        </div>
        <form
          className="card-chrome flex w-full max-w-2xl flex-col gap-3 rounded-2xl p-4 sm:max-w-none sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center md:max-w-none md:justify-end md:p-5"
          action={locale ? `/${locale}/shop` : "/fr/shop"}
          method="get"
        >
          <input
            name="q"
            placeholder={t("search")}
            defaultValue={sp.q}
            className="checkout-input min-h-11 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--press-bg)] px-3 py-2.5 text-base text-[var(--fg)] placeholder:text-[var(--muted)] sm:min-w-[180px] sm:flex-1 sm:text-sm"
          />
          <select
            name="sort"
            defaultValue={sp.sort ?? "popular"}
            className="checkout-input min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--press-bg)] px-3 py-2.5 text-base text-[var(--fg)] sm:w-auto sm:min-w-[9.5rem] sm:text-sm"
          >
            <option value="new">New</option>
            <option value="popular">Popular</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
          </select>
          <button
            type="submit"
            className="btn-primary-motion min-h-11 w-full rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hot)] px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_8px_28px_-12px_var(--accent-glow)] sm:w-auto"
          >
            {t("filters")}
          </button>
        </form>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {items.map((p, i) => (
          <ShopProductCard key={p.id} product={p} locale={locale} index={i} />
        ))}
      </div>

      {items.length === 0 ? (
        <p className="py-20 text-center text-[var(--muted)]">{t("empty")}</p>
      ) : null}
    </div>
  );
}
