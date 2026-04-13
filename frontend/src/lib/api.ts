import { getServerApiRoot } from "./get-server-api-root";

export async function api<T>(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (init?.token) headers.set("Authorization", `Bearer ${init.token}`);
  const { token: _t, ...rest } = init ?? {};
  const p = path.startsWith("/") ? path : `/${path}`;
  const root = await getServerApiRoot();
  const url = `${root}${p}`;
  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers });
  } catch (e) {
    console.error("[api] fetch failed", url, e);
    throw e;
  }
  if (!res.ok) {
    const err = await res.text();
    console.error("[api] HTTP error", url, res.status, err?.slice?.(0, 500));
    throw new Error(err || res.statusText);
  }
  return res.json() as Promise<T>;
}

export type ProductList = {
  items: {
    id: string;
    slug: string;
    nameFr: string;
    nameAr: string;
    priceMad: string;
    images: string[];
    purchaseCount: number;
    stock: number;
    lowStock?: boolean;
    variantsEnabled?: boolean;
    ratingAvg: number | null;
    category: { slug: string; nameFr: string; nameAr: string };
  }[];
  total: number;
};

export type DeliveryZone = {
  id: string;
  cityCode: string;
  cityNameFr: string;
  cityNameAr: string;
  shippingCostMad: string;
  freeShippingThresholdMad: string | null;
};
