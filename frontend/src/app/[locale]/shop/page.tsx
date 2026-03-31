import { getTranslations } from "next-intl/server";
import { ShopProductCard } from "./shop-product-card";
import type { ProductList } from "@/lib/api";
import { ALL_FALLBACK_PRODUCTS } from "@/lib/catalog-fallback";
import { getServerApiRoot } from "@/lib/get-server-api-root";

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
  try {
    const base = await getServerApiRoot();
    const res = await fetch(`${base}/products?${qs}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data: ProductList = await res.json();
      items = data.items;
      total = data.total;
    }
  } catch {
    items = [];
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
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--fg)]">{t("title")}</h1>
          <p className="text-sm text-[var(--muted)]">
            {total} {usingFallback ? "produits (aperçu)" : "SKU"}
          </p>
        </div>
        <form
          className="flex w-full flex-col gap-2 sm:max-w-none sm:flex-row sm:flex-wrap"
          action={locale ? `/${locale}/shop` : "/fr/shop"}
          method="get"
        >
          <input
            name="q"
            placeholder={t("search")}
            defaultValue={sp.q}
            className="min-h-11 w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--press-bg)] px-3 py-2.5 text-base text-[var(--fg)] placeholder:text-[var(--muted)] sm:min-w-[200px] sm:flex-1 sm:text-sm"
          />
          <select
            name="sort"
            defaultValue={sp.sort ?? "popular"}
            className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--press-bg)] px-3 py-2.5 text-base text-[var(--fg)] sm:w-auto sm:min-w-[9.5rem] sm:text-sm"
          >
            <option value="new">New</option>
            <option value="popular">Popular</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
          </select>
          <button
            type="submit"
            className="btn-primary-motion min-h-11 w-full rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hot)] px-4 py-2.5 text-sm font-semibold text-slate-900 sm:w-auto"
          >
            {t("filters")}
          </button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
