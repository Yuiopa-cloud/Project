"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MotionLink } from "@/components/motion-link";
import { useRouter } from "@/i18n/navigation";
import { ProductImage } from "@/components/product-image";
import { MiniSpinner } from "@/components/mini-spinner";
import { useCart, type CartLineProduct } from "@/contexts/cart-context";
import { setBuyNow } from "@/lib/buy-now";

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
  const { addItem } = useCart();
  const main = product.images[img] ?? product.images[0];

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

      <div className="grid gap-8 sm:gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <motion.button
            type="button"
            onClick={() => setZoom(true)}
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-zinc-900 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.75)] sm:aspect-square sm:rounded-3xl sm:shadow-[0_32px_100px_-28px_rgba(0,0,0,0.8)]"
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
        <div>
          <h1 className="text-2xl font-semibold leading-tight text-[var(--fg)] sm:text-3xl">
            {title}
          </h1>
          <p className="mt-4 text-2xl font-medium text-[var(--accent-hot)]">
            {product.priceMad}{" "}
            <span className="text-sm text-[var(--muted)]">MAD</span>
          </p>
          {product.lowStock ? (
            <p className="mt-2 text-sm text-rose-400">{labels.lowStock}</p>
          ) : null}
          <p className="mt-2 text-xs text-[var(--muted)]">{labels.boughtBy}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--accent)]/35 bg-[var(--accent-dim)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]">
              {labels.trustCod ?? "COD"}
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--press-bg)] px-3 py-1 text-[11px] font-medium text-[var(--muted)]">
              {labels.trustDelivery ?? ""}
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--press-bg)] px-3 py-1 text-[11px] font-medium text-[var(--muted)]">
              {labels.trustClients ?? ""}
            </span>
          </div>
          <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-[var(--muted)]">
            {description}
          </p>
          {err ? (
            <p className="mt-4 text-sm text-rose-400 whitespace-pre-wrap">
              {err}
            </p>
          ) : null}
          <motion.div
            layout
            className="mt-8 flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--bg)]/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl fixed inset-x-0 bottom-0 z-40 md:static md:border-0 md:bg-transparent md:p-0 md:pb-0 md:backdrop-blur-0"
          >
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-stretch">
              <motion.button
                type="button"
                onClick={() => void handleAdd()}
                disabled={adding || product.stock < 1}
                animate={
                  addedPulse
                    ? {
                        scale: [1, 1.04, 1],
                        boxShadow: [
                          "0 0 0 0 rgba(45,212,191,0.35)",
                          "0 0 0 14px rgba(45,212,191,0)",
                          "0 0 0 0 rgba(45,212,191,0)",
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
                className="btn-primary-motion min-h-[52px] flex-1 rounded-2xl bg-gradient-to-r from-[var(--primary-from)] via-[var(--primary-mid)] to-[var(--primary-to)] px-6 py-3.5 text-sm font-semibold text-[#f8fafc] disabled:opacity-40"
              >
                {adding ? (
                  <MiniSpinner
                    className="h-5 w-5 border-2 border-[#f8fafc]/85 border-t-transparent"
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
                className="min-h-[52px] flex-1 rounded-2xl border-2 border-[color-mix(in_srgb,var(--primary-mid)_55%,var(--glass-border))] bg-[var(--glass-bg)] px-6 py-3.5 text-sm font-semibold text-[var(--fg)] shadow-[0_0_24px_-10px_color-mix(in_srgb,var(--primary-mid)_25%,transparent)] backdrop-blur-md disabled:opacity-40"
              >
                {labels.buyNow ?? "Buy now"}
              </motion.button>
            </div>
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
