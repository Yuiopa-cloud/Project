"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MotionLink } from "@/components/motion-link";
import { useRouter } from "@/i18n/navigation";
import { ProductImage } from "@/components/product-image";
import { MiniSpinner } from "@/components/mini-spinner";
import { useCart, type CartLineProduct } from "@/contexts/cart-context";
import { useCartFly } from "@/contexts/cart-fly-context";
import { setBuyNow } from "@/lib/buy-now";
import { formatSar } from "@/lib/price";
import { ProductOfferCountdown } from "@/components/product-offer-countdown";
import { resolveOfferCountdownEndMs } from "@/lib/offer-deadline";

type Product = {
  id: string;
  slug: string;
  nameFr?: string;
  nameAr?: string;
  images: string[];
  priceMad: string;
  stock: number;
  purchaseCount: number;
  lowStock?: boolean;
  metadata?: Record<string, unknown> | null;
  reviews: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    user: { firstName: string; lastName: string };
  }[];
};

type ShortProduct = {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  priceMad: string;
  images: string[];
};

export function ProductClient({
  product,
  locale,
  title,
  description,
  bundles,
  related,
  labels,
  demoMode,
}: {
  product: Product;
  locale: string;
  title: string;
  description: string;
  bundles: ShortProduct[];
  related: ShortProduct[];
  labels: Record<string, string>;
  demoMode: boolean;
}) {
  const router = useRouter();
  const [img, setImg] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addedPulse, setAddedPulse] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mainImageRef = useRef<HTMLButtonElement>(null);
  const addToCartBtnRef = useRef<HTMLButtonElement>(null);
  const { addItem } = useCart();
  const { flyToCart } = useCartFly();
  const main = product.images[img] ?? product.images[0];

  const offerCountdown = useMemo(
    () => resolveOfferCountdownEndMs(product.metadata),
    [product.metadata],
  );

  function lineSnapshot(): CartLineProduct {
    return {
      id: product.id,
      slug: product.slug,
      nameFr: product.nameFr ?? title,
      nameAr: product.nameAr ?? title,
      priceMad: product.priceMad,
      images: product.images,
      stock: product.stock,
    };
  }

  async function handleAdd() {
    setErr(null);
    setAdding(true);
    try {
      await addItem(product.id, 1, lineSnapshot());
      flyToCart({
        imageSrc: main,
        sourceEl:
          addToCartBtnRef.current ?? mainImageRef.current ?? undefined,
      });
      setAddedPulse(true);
      setTimeout(() => setAddedPulse(false), 1200);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erreur panier");
    } finally {
      setAdding(false);
    }
  }

  function handleBuyNow() {
    setErr(null);
    if (product.stock < 1) return;
    setBuyNow({
      productId: product.id,
      quantity: 1,
      snapshot: lineSnapshot(),
    });
    router.push("/checkout");
  }

  return (
    <>
      {demoMode ? (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-[var(--accent)]/35 bg-[var(--accent-dim)] px-4 py-3 text-sm text-[var(--fg)]"
        >
          Mode aperçu — catalogue de secours. Vous pouvez ajouter au panier en
          local ; pour payer en ligne, lancez l’API + base et{" "}
          <span className="font-mono text-xs">npm run db:seed</span>.
        </motion.div>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-4">
          <motion.button
            ref={mainImageRef}
            type="button"
            onClick={() => setZoom(true)}
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="relative aspect-square w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--press-bg)] shadow-sm sm:rounded-3xl"
          >
            <ProductImage
              src={main}
              alt={title}
              fill
              priority
              className="object-cover transition duration-700 hover:scale-[1.06]"
            />
          </motion.button>
          <div className="-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1">
            {product.images.map((url, i) => (
              <motion.button
                key={url}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setImg(i)}
                className={`relative h-[3.25rem] w-[3.25rem] shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-16 sm:w-16 ${
                  i === img
                    ? "border-[var(--accent)] shadow-[0_0_14px_var(--accent-glow)]"
                    : "border-transparent opacity-75 hover:opacity-100"
                }`}
              >
                <ProductImage src={url} alt="" fill className="object-cover" />
              </motion.button>
            ))}
          </div>
        </div>
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold leading-tight text-[var(--fg)] sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-3xl font-bold tabular-nums text-[var(--fg)] sm:text-4xl">
            {formatSar(product.priceMad, locale)}
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--accent)]">
            {product.stock < 1
              ? labels.outOfStock
              : product.lowStock
                ? labels.lowStock
                : labels.inStock}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">{labels.boughtBy}</p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="product-description-spotlight mt-5"
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            <p className="product-description-spotlight__title">
              <span aria-hidden>✨</span>
              {labels.descriptionSpotlight}
            </p>
            <p className="product-description-text whitespace-pre-line">
              {description}
            </p>
          </motion.div>
          <ul className="mt-6 space-y-2 border-t border-[var(--border)] pt-6 text-sm text-[var(--fg)]">
            <li className="flex gap-2">
              <span className="text-[var(--accent)]" aria-hidden>
                ✓
              </span>
              {labels.benefit1}
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--accent)]" aria-hidden>
                ✓
              </span>
              {labels.benefit2}
            </li>
            <li className="flex gap-2">
              <span className="text-[var(--accent)]" aria-hidden>
                ✓
              </span>
              {labels.benefit3}
            </li>
          </ul>
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--press-bg)]/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {labels.secureCheckout}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-dim)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)]">
                {labels.trustCod}
              </span>
              <span className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">
                {labels.trustDelivery}
              </span>
              <span className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted)]">
                {labels.trustClients}
              </span>
            </div>
          </div>
          {err ? (
            <p className="mt-4 text-sm text-rose-400 whitespace-pre-wrap">
              {err}
            </p>
          ) : null}
          <motion.div
            layout
            className="mt-8 flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--card)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.08)] fixed inset-x-0 bottom-0 z-40 md:static md:rounded-2xl md:border md:p-5 md:shadow-sm"
          >
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch">
              <motion.button
                ref={addToCartBtnRef}
                type="button"
                onClick={() => void handleAdd()}
                disabled={adding || product.stock < 1}
                animate={
                  addedPulse
                    ? {
                        scale: [1, 1.03, 1],
                        boxShadow: [
                          "0 0 0 0 rgba(22,163,74,0.35)",
                          "0 0 0 12px rgba(22,163,74,0)",
                          "0 0 0 0 rgba(22,163,74,0)",
                        ],
                      }
                    : {}
                }
                transition={{ duration: 0.5 }}
                whileHover={{
                  scale: adding || product.stock < 1 ? 1 : 1.02,
                  y: adding || product.stock < 1 ? 0 : -1,
                }}
                whileTap={{ scale: 0.97 }}
                className="min-h-[52px] flex-1 rounded-xl bg-[var(--accent)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(22,163,74,0.4)] disabled:opacity-40"
              >
                {adding ? (
                  <MiniSpinner
                    className="h-5 w-5 border-2 border-white/85 border-t-transparent"
                    label={String(labels.addToCart)}
                  />
                ) : (
                  labels.addToCart
                )}
              </motion.button>
              <motion.button
                type="button"
                onClick={handleBuyNow}
                disabled={product.stock < 1}
                whileHover={{ scale: product.stock < 1 ? 1 : 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="min-h-[52px] flex-1 rounded-xl border-2 border-[var(--accent)] bg-[var(--card)] px-6 py-3.5 text-sm font-semibold text-[var(--accent)] disabled:opacity-40"
              >
                {labels.buyNow ?? "Buy now"}
              </motion.button>
            </div>
            {offerCountdown.showExpired || offerCountdown.endMs != null ? (
              <ProductOfferCountdown
                endMs={offerCountdown.endMs}
                showExpired={offerCountdown.showExpired}
                labels={{
                  title: labels.offerCountdownTitle,
                  endsIn: labels.offerCountdownEndsIn,
                  expired: labels.offerCountdownExpired,
                  unitD: labels.offerUnitD,
                  unitH: labels.offerUnitH,
                  unitM: labels.offerUnitM,
                  unitS: labels.offerUnitS,
                }}
              />
            ) : null}
            <span className="text-center text-xs text-[var(--muted)] md:text-start">
              {labels.shippingFreeHint}
            </span>
          </motion.div>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="mb-4 text-lg font-semibold text-[var(--fg)]">
          {labels.reviews}
        </h2>
        <div className="space-y-4">
          {product.reviews?.length ? (
            product.reviews.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="card-chrome rounded-xl p-4"
              >
                <p className="text-sm font-medium text-[var(--fg)]">
                  {r.user.firstName} · {r.rating}/5
                </p>
                {r.body ? (
                  <p className="mt-2 text-sm text-[var(--muted)]">{r.body}</p>
                ) : null}
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-[var(--muted)]">—</p>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-[var(--fg)]">
          {labels.upsell}
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {bundles.map((b) => (
            <motion.div key={b.id} whileHover={{ y: -4 }}>
              <MotionLink
                href={`/product/${b.slug}`}
                className="card-chrome block w-44 shrink-0 overflow-hidden rounded-xl"
              >
                <div className="relative h-28">
                  <ProductImage
                    src={b.images?.[0]}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="p-2 text-xs text-[var(--fg)]">
                  {locale === "ar" ? b.nameAr : b.nameFr}
                </p>
              </MotionLink>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-[var(--fg)]">
          {labels.related}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {related.map((b) => (
            <motion.div key={b.id} whileHover={{ y: -3 }}>
              <MotionLink
                href={`/product/${b.slug}`}
                className="card-chrome block overflow-hidden rounded-xl"
              >
                <div className="relative h-32">
                  <ProductImage
                    src={b.images?.[0]}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="p-2 text-xs text-[var(--fg)]">
                  {locale === "ar" ? b.nameAr : b.nameFr}
                </p>
              </MotionLink>
            </motion.div>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {zoom && main ? (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/92 p-4"
            onClick={() => setZoom(false)}
          >
            <ProductImage
              src={main}
              alt={title}
              className="max-h-[90vh] w-auto max-w-full object-contain"
            />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </>
  );
}
