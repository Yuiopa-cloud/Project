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
  const res = await fetch(`${root}${p}`, {
    ...rest,
    headers,
  });
  if (!res.ok) {
    const err = await res.text();
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
