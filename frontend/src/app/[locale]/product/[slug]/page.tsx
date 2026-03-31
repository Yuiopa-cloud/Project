import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProductClient } from "./product-client";
import {
  ALL_FALLBACK_PRODUCTS,
  getFallbackProductDetail,
} from "@/lib/catalog-fallback";
import { getServerApiRoot } from "@/lib/get-server-api-root";

export const dynamic = "force-dynamic";

async function safeFetchJson(
  url: string,
): Promise<{ ok: true; data: unknown } | { ok: false }> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, data };
  } catch {
    /* ECONNREFUSED, DNS, aborted, etc. — Node fetch throws */
    return { ok: false };
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations("product");
  const base = await getServerApiRoot();

  const primary = await safeFetchJson(`${base}/products/${slug}`);

  let product: Record<string, unknown>;
  let demoMode = false;

  if (primary.ok) {
    product = primary.data as Record<string, unknown>;
  } else {
    const fb = getFallbackProductDetail(slug);
    if (!fb) notFound();
    product = fb as unknown as Record<string, unknown>;
    demoMode = true;
  }

  const pid = String(product.id);
  let bundles: unknown[] = [];
  let related: unknown[] = [];

  if (!demoMode) {
    const [bundlesResult, relatedResult] = await Promise.all([
      safeFetchJson(`${base}/recommendations/product/${pid}/bundles`),
      safeFetchJson(`${base}/recommendations/product/${pid}/related`),
    ]);
    bundles = bundlesResult.ok ? (bundlesResult.data as unknown[]) : [];
    related = relatedResult.ok ? (relatedResult.data as unknown[]) : [];

    if (!bundles.length && !related.length) {
      const others = ALL_FALLBACK_PRODUCTS.filter((p) => p.slug !== slug);
      bundles = others.slice(0, 4);
      related = others.slice(4, 9);
    }
  } else {
    const others = ALL_FALLBACK_PRODUCTS.filter((p) => p.slug !== slug);
    bundles = others.slice(0, 4);
    related = others.slice(4, 9);
  }

  const title =
    locale === "ar" ? String(product.nameAr) : String(product.nameFr);
  const desc =
    locale === "ar"
      ? String(product.descriptionAr)
      : String(product.descriptionFr);

  return (
    <div className="mx-auto max-w-6xl px-3 pb-28 pt-8 sm:px-4 md:pb-10 md:pt-10">
      <ProductClient
        product={product as never}
        locale={locale}
        title={title}
        description={desc}
        bundles={bundles as never}
        related={related as never}
        demoMode={demoMode}
        labels={{
          addToCart: t("addToCart"),
          reviews: t("reviews"),
          upsell: t("upsell"),
          related: t("related"),
          lowStock: t("lowStock"),
          boughtBy: t("boughtBy", {
            count: Number(product.purchaseCount ?? 0),
          }),
          shippingFreeHint: t("shippingFreeHint"),
        }}
      />
    </div>
  );
}
