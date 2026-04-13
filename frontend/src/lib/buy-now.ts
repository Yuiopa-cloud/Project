import type { CartLineProduct } from "@/contexts/cart-context";

const STORAGE_KEY = "atlas-buy-now";

export type BuyNowPayload = {
  productId: string;
  quantity: number;
  /** Set when the product uses variants (size, color, …). */
  variantId?: string | null;
  snapshot: CartLineProduct;
};

export function setBuyNow(payload: BuyNowPayload): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function getBuyNow(): BuyNowPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as BuyNowPayload;
    if (
      !p?.productId ||
      typeof p.quantity !== "number" ||
      p.quantity < 1 ||
      !p.snapshot?.id
    ) {
      return null;
    }
    const snap = p.snapshot as CartLineProduct & { requiresVariant?: boolean };
    if (snap.requiresVariant && !(p.variantId && String(p.variantId).trim())) {
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearBuyNow(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
