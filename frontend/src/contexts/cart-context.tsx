"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clientApiRoot, logApiFailure } from "@/lib/api-config";
import { isOfflineProductId } from "@/lib/catalog-fallback";

const STORAGE_KEY = "atlas-cart-guest";
const LOCAL_LINES_KEY = "atlas-cart-local-lines";

export type CartLineProduct = {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  priceMad: string | number;
  images: string[];
  stock: number;
  /** When true, server requires variantId on add-to-cart / checkout. */
  requiresVariant?: boolean;
  variantLabelFr?: string;
  variantLabelAr?: string;
};

export type CartLine = {
  id: string;
  quantity: number;
  product: CartLineProduct;
  variantId: string | null;
};

export type CartModel = {
  id: string;
  guestToken?: string | null;
  items: CartLine[];
};

type CartResponse = { cart: CartModel; guestToken: string | null };

type CartContextValue = {
  cart: CartModel | null;
  loading: boolean;
  itemCount: number;
  /** Increments after each successful add — drive cart icon micro-animation. */
  addBumpSeq: number;
  refresh: () => Promise<void>;
  addItem: (
    productId: string,
    quantity: number,
    snapshot?: CartLineProduct,
    variantId?: string | null,
  ) => Promise<void>;
  setQty: (cartItemId: string, quantity: number) => Promise<void>;
  /** Nest `/api` root (env, direct URL, or `/api-proxy`). */
  apiRoot: string;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function persistGuestToken(cart: CartModel | null) {
  if (typeof window === "undefined" || !cart?.guestToken) return;
  localStorage.setItem(STORAGE_KEY, cart.guestToken);
}

function readLocalLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_LINES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLocalLines(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_LINES_KEY, JSON.stringify(lines));
}

function decimalStr(v: unknown): string {
  if (v == null) return "0";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (
    typeof v === "object" &&
    v !== null &&
    "toString" in v &&
    typeof (v as { toString: () => string }).toString === "function"
  ) {
    return (v as { toString: () => string }).toString();
  }
  return String(v);
}

function normalizeCartItem(raw: Record<string, unknown>): CartLine {
  const product = raw.product as Record<string, unknown>;
  const variant = raw.variant as Record<string, unknown> | null | undefined;
  const variantsEnabled = Boolean(product?.variantsEnabled);
  const vSelections = variant?.selections as
    | Array<{
        option: { sortOrder?: number };
        optionValue: { valueFr: string; valueAr: string };
      }>
    | undefined;
  let variantLabelFr: string | undefined;
  let variantLabelAr: string | undefined;
  if (vSelections?.length) {
    const sorted = [...vSelections].sort(
      (a, b) => (a.option.sortOrder ?? 0) - (b.option.sortOrder ?? 0),
    );
    variantLabelFr = sorted.map((s) => s.optionValue.valueFr).join(" · ");
    variantLabelAr = sorted.map((s) => s.optionValue.valueAr).join(" · ");
  }
  const useVariant = Boolean(variantsEnabled && variant && variant.id);
  const vStock =
    typeof variant?.stock === "number" ? (variant.stock as number) : 0;
  const pStock =
    typeof product?.stock === "number" ? Number(product.stock) : 0;
  const stock = useVariant ? vStock : pStock;
  const vImages = Array.isArray(variant?.images)
    ? (variant.images as string[])
    : [];
  const pImages = Array.isArray(product?.images)
    ? (product.images as string[])
    : [];
  const images =
    useVariant && vImages.length > 0 ? [...vImages] : [...pImages];
  const rawPrice =
    useVariant && variant?.priceMad != null
      ? variant.priceMad
      : product?.priceMad;
  const priceMad = decimalStr(rawPrice);

  return {
    id: String(raw.id),
    quantity: Number(raw.quantity) || 0,
    variantId: raw.variantId ? String(raw.variantId) : null,
    product: {
      id: String(product.id),
      slug: String(product.slug),
      nameFr: String(product.nameFr ?? ""),
      nameAr: String(product.nameAr ?? ""),
      priceMad,
      images,
      stock,
      requiresVariant: variantsEnabled || undefined,
      variantLabelFr: variantLabelFr || undefined,
      variantLabelAr: variantLabelAr || undefined,
    },
  };
}

function normalizeCartPayload(raw: Record<string, unknown>): CartModel {
  const itemsRaw = raw.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((it) => normalizeCartItem(it as Record<string, unknown>))
    : [];
  return {
    id: String(raw.id ?? "cart"),
    items,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const apiRoot = useMemo(() => clientApiRoot(), []);
  const [serverCart, setServerCart] = useState<CartModel | null>(null);
  const [localLines, setLocalLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [addBumpSeq, setAddBumpSeq] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((v) => !v), []);

  const bumpCart = useCallback(() => {
    setAddBumpSeq((n) => n + 1);
  }, []);

  useEffect(() => {
    setLocalLines(readLocalLines());
  }, []);

  const cart = useMemo((): CartModel | null => {
    const serverItems = serverCart?.items ?? [];
    if (serverItems.length === 0 && localLines.length === 0) return null;
    return {
      id: serverCart?.id ?? "local",
      guestToken: serverCart?.guestToken ?? null,
      items: [...serverItems, ...localLines],
    };
  }, [serverCart, localLines]);

  const refresh = useCallback(async () => {
    try {
      const stored =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      const url = stored
        ? `${apiRoot}/cart?guestToken=${encodeURIComponent(stored)}`
        : `${apiRoot}/cart`;
      const res = await fetch(url);
      if (!res.ok) {
        const hint404 =
          process.env.NODE_ENV === "production"
            ? "API inaccessible — vérifiez NEXT_PUBLIC_API_URL / BACKEND_PROXY_URL sur Vercel et que l’API Railway tourne."
            : "API introuvable — démarrez le backend (port 4000) ou vérifiez NEXT_PUBLIC_API_URL.";
        throw new Error(res.status === 404 ? hint404 : "panier");
      }
      const data: CartResponse = await res.json();
      if (data.guestToken) {
        localStorage.setItem(STORAGE_KEY, data.guestToken);
      }
      const normalized = normalizeCartPayload(
        data.cart as unknown as Record<string, unknown>,
      );
      const merged: CartModel = {
        ...normalized,
        guestToken: data.guestToken ?? null,
      };
      persistGuestToken(merged);
      setServerCart(merged);
    } catch (e) {
      logApiFailure("cart refresh", e);
      setServerCart(null);
    } finally {
      setLoading(false);
    }
  }, [apiRoot]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const itemCount = useMemo(
    () => cart?.items.reduce((n, l) => n + l.quantity, 0) ?? 0,
    [cart],
  );

  const addItem = useCallback(
    async (
      productId: string,
      quantity: number,
      snapshot?: CartLineProduct,
      variantId?: string | null,
    ) => {
      if (isOfflineProductId(productId)) {
        if (!snapshot) {
          throw new Error("Données produit manquantes pour le panier local.");
        }
        const v = variantId ?? null;
        setLocalLines((prev) => {
          const idx = prev.findIndex(
            (l) =>
              l.product.id === productId && (l.variantId ?? null) === v,
          );
          const lineId = v ? `local-${productId}-v-${v}` : `local-${productId}`;
          let next: CartLine[];
          if (idx >= 0) {
            next = [...prev];
            next[idx] = {
              ...next[idx],
              quantity: next[idx].quantity + quantity,
            };
          } else {
            next = [
              ...prev,
              { id: lineId, quantity, variantId: v, product: snapshot },
            ];
          }
          persistLocalLines(next);
          return next;
        });
        bumpCart();
        return;
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      const res = await fetch(`${apiRoot}/cart/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity,
          variantId: variantId?.trim() || undefined,
          guestToken: stored || undefined,
        }),
      });
      if (!res.ok) {
        const txt = (await res.text()).trim();
        logApiFailure("POST /cart/items", { status: res.status, txt: txt.slice(0, 300) });
        if (res.status === 404 && /product not found/i.test(txt)) {
          throw new Error(
            "Produit inconnu en base — exécutez npm run db:seed (racine du projet) avec l’API arrêtée ou après migrate.",
          );
        }
        throw new Error(txt || "Échec ajout panier");
      }
      const raw = (await res.json()) as Record<string, unknown>;
      const normalized = normalizeCartPayload(raw);
      setServerCart((prev) => ({
        ...normalized,
        guestToken: prev?.guestToken ?? stored ?? null,
      }));
      bumpCart();
    },
    [apiRoot, bumpCart],
  );

  const setQty = useCallback(
    async (cartItemId: string, quantity: number) => {
      if (cartItemId.startsWith("local-")) {
        setLocalLines((prev) => {
          let next: CartLine[];
          if (quantity <= 0) {
            next = prev.filter((l) => l.id !== cartItemId);
          } else {
            next = prev.map((l) =>
              l.id === cartItemId ? { ...l, quantity } : l,
            );
          }
          persistLocalLines(next);
          return next;
        });
        return;
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      const res = await fetch(`${apiRoot}/cart/items/qty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItemId,
          quantity,
          guestToken: stored || undefined,
        }),
      });
      if (!res.ok) {
        const txt = (await res.text()).trim();
        logApiFailure("POST /cart/items/qty", { status: res.status, txt: txt.slice(0, 300) });
        throw new Error(txt || "Échec mise à jour panier");
      }
      const raw = (await res.json()) as Record<string, unknown>;
      const normalized = normalizeCartPayload(raw);
      setServerCart((prev) => ({
        ...normalized,
        guestToken: prev?.guestToken ?? stored ?? null,
      }));
    },
    [apiRoot],
  );

  const value: CartContextValue = {
    cart,
    loading,
    itemCount,
    addBumpSeq,
    refresh,
    addItem,
    setQty,
    apiRoot,
    drawerOpen,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  };

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart needs CartProvider");
  return ctx;
}
