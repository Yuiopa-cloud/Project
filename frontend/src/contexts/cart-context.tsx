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
import { clientApiRoot } from "@/lib/api-config";
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
};

export type CartLine = {
  id: string;
  quantity: number;
  product: CartLineProduct;
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
  refresh: () => Promise<void>;
  addItem: (
    productId: string,
    quantity: number,
    snapshot?: CartLineProduct,
  ) => Promise<void>;
  setQty: (productId: string, quantity: number) => Promise<void>;
  /** Nest `/api` root (env, direct URL, or `/api-proxy`). */
  apiRoot: string;
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

export function CartProvider({ children }: { children: ReactNode }) {
  const apiRoot = useMemo(() => clientApiRoot(), []);
  const [serverCart, setServerCart] = useState<CartModel | null>(null);
  const [localLines, setLocalLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);

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
      if (!res.ok)
        throw new Error(
          res.status === 404
            ? "API introuvable — démarrez le backend (port 4000) ou vérifiez NEXT_PUBLIC_API_URL."
            : "panier",
        );
      const data: CartResponse = await res.json();
      if (data.guestToken) {
        localStorage.setItem(STORAGE_KEY, data.guestToken);
      }
      persistGuestToken(data.cart);
      setServerCart(data.cart);
    } catch {
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
    async (productId: string, quantity: number, snapshot?: CartLineProduct) => {
      if (isOfflineProductId(productId)) {
        if (!snapshot) {
          throw new Error("Données produit manquantes pour le panier local.");
        }
        setLocalLines((prev) => {
          const idx = prev.findIndex((l) => l.product.id === productId);
          const lineId = `local-${productId}`;
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
              { id: lineId, quantity, product: snapshot },
            ];
          }
          persistLocalLines(next);
          return next;
        });
        return;
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      const res = await fetch(`${apiRoot}/cart/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity,
          guestToken: stored || undefined,
        }),
      });
      if (!res.ok) {
        const txt = (await res.text()).trim();
        if (res.status === 404 && /product not found/i.test(txt)) {
          throw new Error(
            "Produit inconnu en base — exécutez npm run db:seed (racine du projet) avec l’API arrêtée ou après migrate.",
          );
        }
        throw new Error(txt || "Échec ajout panier");
      }
      const next: CartModel = await res.json();
      if (next.guestToken) {
        localStorage.setItem(STORAGE_KEY, next.guestToken);
      }
      setServerCart(next);
    },
    [apiRoot],
  );

  const setQty = useCallback(
    async (productId: string, quantity: number) => {
      if (isOfflineProductId(productId)) {
        setLocalLines((prev) => {
          let next: CartLine[];
          if (quantity <= 0) {
            next = prev.filter((l) => l.product.id !== productId);
          } else {
            next = prev.map((l) =>
              l.product.id === productId ? { ...l, quantity } : l,
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
          productId,
          quantity,
          guestToken: stored || undefined,
        }),
      });
      if (!res.ok) {
        const txt = (await res.text()).trim();
        throw new Error(txt || "Échec mise à jour panier");
      }
      const next: CartModel = await res.json();
      if (next.guestToken) {
        localStorage.setItem(STORAGE_KEY, next.guestToken);
      }
      setServerCart(next);
    },
    [apiRoot],
  );

  const value: CartContextValue = {
    cart,
    loading,
    itemCount,
    refresh,
    addItem,
    setQty,
    apiRoot,
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
