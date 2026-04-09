import type { ProductList } from "./api";

/** Offline demo ids — cart/checkout need a running API + seeded DB. */
export const OFFLINE_ID_PREFIX = "offline-";

export type FallbackProductDetail = ProductList["items"][number] & {
  descriptionFr: string;
  descriptionAr: string;
};

/** Empty: no demo products when API is offline (catalog cleared intentionally). */
const raw: FallbackProductDetail[] = [];

/** Strip description for list type */
export const ALL_FALLBACK_PRODUCTS: ProductList["items"] = raw.map(
  ({ descriptionFr: _a, descriptionAr: _b, ...list }) => list,
);

export const TRENDING_FALLBACK: ProductList["items"] = [...ALL_FALLBACK_PRODUCTS]
  .sort((a, b) => b.purchaseCount - a.purchaseCount)
  .slice(0, 4);

export function getFallbackProductDetail(
  slug: string,
): (FallbackProductDetail & { reviews: [] }) | null {
  const p = raw.find((x) => x.slug === slug);
  if (!p) return null;
  return { ...p, reviews: [] };
}

export function isOfflineProductId(id: string) {
  return id.startsWith(OFFLINE_ID_PREFIX);
}
