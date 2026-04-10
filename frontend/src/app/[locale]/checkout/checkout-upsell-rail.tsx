"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { useCart, type CartLineProduct } from "@/contexts/cart-context";
import { useCartFly } from "@/contexts/cart-fly-context";
import { ProductImage } from "@/components/product-image";
import { clearBuyNow, type BuyNowPayload } from "@/lib/buy-now";
import { isOfflineProductId } from "@/lib/catalog-fallback";
import { logApiFailure } from "@/lib/api-config";
import type { ProductList } from "@/lib/api";
import { MotionLink } from "@/components/motion-link";
import { MiniSpinner } from "@/components/mini-spinner";

const SCROLL_PX_PER_FRAME = 0.28;
const RESUME_AUTO_MS = 3400;

type Props = {
  apiRoot: string;
  /** Sorted comma-separated product ids in the current checkout — stable string avoids refetch noise */
  excludeProductKey: string;
  buyNowActive: boolean;
  /** When set, merging into the real cart before adding an upsell line (express checkout) */
  buyNowMerge: BuyNowPayload | null;
  onExitBuyNow: () => void;
};

export function CheckoutUpsellRail({
  apiRoot,
  excludeProductKey,
  buyNowActive,
  buyNowMerge,
  onExitBuyNow,
}: Props) {
  const t = useTranslations("checkout");
  const reduceMotion = useReducedMotion();
  const [items, setItems] = useState<ProductList["items"]>([]);
  const [loadErr, setLoadErr] = useState(false);

  useEffect(() => {
    const excludeSet = new Set(
      excludeProductKey.split(",").filter((id) => id.length > 0),
    );
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set("take", "32");
        params.set("sort", "popular");
        const r = await fetch(`${apiRoot}/products?${params}`);
        if (!r.ok) throw new Error(String(r.status));
        const data = (await r.json()) as ProductList;
        if (cancelled) return;
        const filtered = data.items.filter(
          (p) =>
            !excludeSet.has(p.id) &&
            p.stock >= 1 &&
            !isOfflineProductId(p.id),
        );
        setItems(filtered.slice(0, 16));
        setLoadErr(false);
      } catch (e) {
        logApiFailure("checkout upsell products", e);
        if (!cancelled) setLoadErr(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiRoot, excludeProductKey]);

  if (loadErr || items.length === 0) return null;

  return (
    <motion.aside
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 }}
      className="card-chrome relative overflow-hidden rounded-2xl border border-[var(--accent)]/25 bg-[var(--card)]/95 shadow-[0_14px_44px_-30px_var(--accent-glow)]"
      aria-label={t("upsellAria")}
    >
      <div className="border-b border-[var(--border)]/80 bg-[var(--accent-dim)]/20 px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          {t("upsellTitle")}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">
          {t("upsellHint")}
        </p>
      </div>
      <AutoScrollBand
        items={items}
        reduceMotion={!!reduceMotion}
        buyNowActive={buyNowActive}
        buyNowMerge={buyNowMerge}
        onExitBuyNow={onExitBuyNow}
      />
    </motion.aside>
  );
}

function AutoScrollBand({
  items,
  reduceMotion,
  buyNowActive,
  buyNowMerge,
  onExitBuyNow,
}: {
  items: ProductList["items"];
  reduceMotion: boolean;
  buyNowActive: boolean;
  buyNowMerge: BuyNowPayload | null;
  onExitBuyNow: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const loopHeightRef = useRef(0);
  const autoPausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markUserInteraction = useCallback(() => {
    autoPausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      autoPausedRef.current = false;
    }, RESUME_AUTO_MS);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || items.length === 0 || reduceMotion) return;
    const measure = () => {
      const a = el.querySelector("[data-upsell-loop='a']");
      if (a) loopHeightRef.current = (a as HTMLElement).offsetHeight;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    let raf = 0;
    const tick = () => {
      const h = loopHeightRef.current;
      if (
        h > 0 &&
        !autoPausedRef.current &&
        el.scrollHeight > el.clientHeight + 4
      ) {
        el.scrollTop += SCROLL_PX_PER_FRAME;
        if (el.scrollTop >= h - 0.5) {
          el.scrollTop = Math.max(0, el.scrollTop - h);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [items.length, reduceMotion]);

  return (
    <div
      ref={scrollRef}
      className="checkout-upsell-scroll max-h-[min(38vh,300px)] min-h-[188px] overflow-y-auto overscroll-y-contain px-2 py-2 [-webkit-overflow-scrolling:touch] sm:max-h-[min(40vh,340px)] sm:min-h-[220px]"
      onWheel={markUserInteraction}
      onTouchStart={markUserInteraction}
      onPointerDown={markUserInteraction}
    >
      <div data-upsell-loop="a" className="space-y-2 px-0.5">
        {items.map((p) => (
          <UpsellCard
            key={`a-${p.id}`}
            product={p}
            buyNowActive={buyNowActive}
            buyNowMerge={buyNowMerge}
            onExitBuyNow={onExitBuyNow}
          />
        ))}
      </div>
      <div data-upsell-loop="b" className="space-y-2 px-0.5" aria-hidden>
        {items.map((p) => (
          <UpsellCard
            key={`b-${p.id}`}
            product={p}
            buyNowActive={buyNowActive}
            buyNowMerge={buyNowMerge}
            onExitBuyNow={onExitBuyNow}
          />
        ))}
      </div>
    </div>
  );
}

function UpsellCard({
  product,
  buyNowActive,
  buyNowMerge,
  onExitBuyNow,
}: {
  product: ProductList["items"][number];
  buyNowActive: boolean;
  buyNowMerge: BuyNowPayload | null;
  onExitBuyNow: () => void;
}) {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const { addItem, refresh } = useCart();
  const { flyToCart } = useCartFly();
  const [busy, setBusy] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);

  const title = locale === "ar" ? product.nameAr : product.nameFr;

  function snapshot(): CartLineProduct {
    return {
      id: product.id,
      slug: product.slug,
      nameFr: product.nameFr,
      nameAr: product.nameAr,
      priceMad: product.priceMad,
      images: product.images ?? [],
      stock: product.stock,
    };
  }

  async function onAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock < 1 || busy) return;
    setBusy(true);
    try {
      if (buyNowActive && buyNowMerge) {
        clearBuyNow();
        onExitBuyNow();
        await addItem(
          buyNowMerge.productId,
          buyNowMerge.quantity,
          buyNowMerge.snapshot,
        );
      }
      await addItem(product.id, 1, snapshot());
      void refresh();
      flyToCart({
        imageSrc: product.images?.[0] ?? null,
        sourceEl: addBtnRef.current ?? undefined,
      });
    } catch {
      /* silent */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2.5 rounded-xl border border-[var(--border)]/70 bg-[var(--press-bg)]/55 p-2">
      <MotionLink
        href={`/product/${product.slug}`}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-black/20"
      >
        <ProductImage
          src={product.images?.[0]}
          alt={title}
          className="h-full w-full object-cover"
        />
      </MotionLink>
      <div className="min-w-0 flex-1">
        <MotionLink
          href={`/product/${product.slug}`}
          className="line-clamp-2 text-left text-xs font-medium leading-snug text-[var(--fg)] hover:text-[var(--accent)]"
        >
          {title}
        </MotionLink>
        <p className="mt-0.5 text-[11px] tabular-nums text-[var(--muted)]">
          {String(product.priceMad)} MAD
        </p>
        <button
          type="button"
          ref={addBtnRef}
          disabled={product.stock < 1 || busy}
          onClick={(e) => void onAdd(e)}
          className="mt-1.5 flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
        >
          {busy ? <MiniSpinner className="h-3.5 w-3.5" /> : null}
          {t("upsellAdd")}
        </button>
      </div>
    </div>
  );
}
