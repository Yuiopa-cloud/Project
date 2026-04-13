import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProductClient } from "./product-client";
import {
  ALL_FALLBACK_PRODUCTS,
  getFallbackProductDetail,
} from "@/lib/catalog-fallback";
import { serverFetchApiJson } from "@/lib/server-fetch-api";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations("product");

  const primary = await serverFetchApiJson<Record<string, unknown>>(
    `/products/${encodeURIComponent(slug)}`,
  );

  let product: Record<string, unknown>;
  let demoMode = false;

  if (primary.ok) {
    product = primary.data;
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
      serverFetchApiJson<unknown[]>(
        `/recommendations/product/${encodeURIComponent(pid)}/bundles`,
      ),
      serverFetchApiJson<unknown[]>(
        `/recommendations/product/${encodeURIComponent(pid)}/related`,
      ),
    ]);
    bundles = bundlesResult.ok ? bundlesResult.data : [];
    related = relatedResult.ok ? relatedResult.data : [];

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
          buyNow: t("buyNow"),
          reviews: t("reviews"),
          upsell: t("upsell"),
          related: t("related"),
          lowStock: t("lowStock"),
          boughtBy: t("boughtBy", {
            count: Number(product.purchaseCount ?? 0),
          }),
          shippingFreeHint: t("shippingFreeHint"),
          trustCod: t("trustCod"),
          trustDelivery: t("trustDelivery"),
          trustClients: t("trustClients"),
          benefit1: t("benefit1"),
          benefit2: t("benefit2"),
          benefit3: t("benefit3"),
          inStock: t("inStock"),
          outOfStock: t("outOfStock"),
          secureCheckout: t("secureCheckout"),
          descriptionSpotlight: t("descriptionSpotlight"),
        }}
      />
    </div>
  );
}
