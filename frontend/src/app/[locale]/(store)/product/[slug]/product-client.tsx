"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MotionLink } from "@/components/motion-link";
import { useRouter } from "@/i18n/navigation";
import { ProductImage } from "@/components/product-image";
import { MiniSpinner } from "@/components/mini-spinner";
import { useCart, type CartLineProduct } from "@/contexts/cart-context";
import { useCartFly } from "@/contexts/cart-fly-context";
import { setBuyNow } from "@/lib/buy-now";
import { formatSar, parseAmount } from "@/lib/price";
import { ProductOfferCountdown } from "@/components/product-offer-countdown";
import { PDP_URGENCY_COUNTDOWN_MS } from "@/lib/offer-deadline";

type ProductOptionVal = {
  id: string;
  valueFr: string;
  valueAr: string;
  valueKey?: string | null;
  colorHex?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
};

function isVideoMedia(url: string | null | undefined): boolean {
  if (!url) return false;
  const u = url.trim().toLowerCase();
  return (
    u.startsWith("data:video/") ||
    u.endsWith(".mp4") ||
    u.endsWith(".webm") ||
    u.endsWith(".ogg") ||
    u.endsWith(".mov")
  );
}

type ProductOptionDef = {
  id: string;
  nameFr: string;
  nameAr: string;
  sortOrder?: number;
  values: ProductOptionVal[];
};

type ProductVariantRow = {
  id: string;
  sku: string;
  color?: string | null;
  colorKey?: string | null;
  stock: number;
  priceMad: string;
  compareAtMad: string | null;
  images: string[];
  isDefault: boolean;
  selection: Record<string, string>;
  labelFr: string;
  labelAr: string;
};

type Product = {
  id: string;
  slug: string;
  nameFr?: string;
  nameAr?: string;
  images: string[];
  priceMad: string;
  compareAtMad?: string | null;
  stock: number;
  purchaseCount: number;
  lowStock?: boolean;
  variantsEnabled?: boolean;
  options?: ProductOptionDef[];
  variants?: ProductVariantRow[];
  reviews: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    user: { firstName: string; lastName: string };
  }[];
};

function normalizeColorValue(input: string | null | undefined): string {
  return (input ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

function isColorOption(opt: ProductOptionDef): boolean {
  return /colou?r|color|couleur|teinte|لون|اللون/i.test(
    `${opt.nameFr} ${opt.nameAr}`,
  );
}

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
  const [manualMainImage, setManualMainImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addedPulse, setAddedPulse] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mainImageRef = useRef<HTMLButtonElement>(null);
  const addToCartBtnRef = useRef<HTMLButtonElement>(null);
  const { addItem } = useCart();
  const { flyToCart } = useCartFly();

  /** Per-visit decorative timer — resets on mount or when `product.id` changes. */
  const urgencyAnchorRef = useRef<{
    productId: string;
    endMs: number;
  } | null>(null);
  if (
    urgencyAnchorRef.current === null ||
    urgencyAnchorRef.current.productId !== product.id
  ) {
    urgencyAnchorRef.current = {
      productId: product.id,
      endMs: Date.now() + PDP_URGENCY_COUNTDOWN_MS,
    };
  }
  const urgencyEndMs = urgencyAnchorRef.current.endMs;

  const variantsActive = Boolean(
    product.variantsEnabled &&
      product.options?.length &&
      product.variants?.length,
  );

  const sortedOptions = useMemo(() => {
    const o = product.options ?? [];
    return [...o].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [product.options]);

  const [picked, setPicked] = useState<Record<string, string>>({});
  const [lastChangedOptionId, setLastChangedOptionId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!variantsActive || !product.variants?.length) return;
    const def =
      product.variants.find((v) => v.isDefault) ?? product.variants[0];
    if (!def?.selection) return;
    const next: Record<string, string> = {};
    for (const opt of sortedOptions) {
      const selectedId = def.selection[opt.id];
      if (!selectedId) continue;
      const selectedVal = opt.values.find((v) => v.id === selectedId);
      if (!selectedVal) continue;
      next[opt.id] = isColorOption(opt)
        ? normalizeColorValue(def.colorKey ?? selectedVal.valueKey ?? selectedVal.valueFr)
        : selectedId;
    }
    setPicked(next);
  }, [product.id, variantsActive, product.variants]);

  const variantTokenForOption = useMemo(() => {
    return (v: ProductVariantRow, opt: ProductOptionDef): string | null => {
      const selectedId = v.selection[opt.id];
      if (!selectedId) return null;
      const selectedVal = opt.values.find((x) => x.id === selectedId);
      if (!selectedVal) return null;
      if (isColorOption(opt)) {
        return normalizeColorValue(
          v.colorKey ?? selectedVal.valueKey ?? selectedVal.valueFr,
        );
      }
      return selectedId;
    };
  }, []);

  const isValueAvailable = (optionId: string, valueToken: string) => {
    const vars = product.variants ?? [];
    if (!vars.length) return true;
    const option = sortedOptions.find((o) => o.id === optionId);
    if (!option) return true;
    return vars.some((v) => {
      if (variantTokenForOption(v, option) !== valueToken) return false;
      return sortedOptions.every((o) => {
        if (o.id === optionId) return true;
        const p = picked[o.id];
        if (!p) return true;
        return variantTokenForOption(v, o) === p;
      });
    });
  };

  const compatibleVariants = useMemo(() => {
    const vars = product.variants ?? [];
    if (!variantsActive) return vars;
    return vars.filter((v) =>
      sortedOptions.every((o) => {
        const p = picked[o.id];
        if (!p) return true;
        return variantTokenForOption(v, o) === p;
      }),
    );
  }, [variantsActive, product.variants, picked, sortedOptions, variantTokenForOption]);

  const activeVariant = useMemo(() => {
    if (!variantsActive || !product.variants?.length) return null;
    if (!sortedOptions.length) return null;
    const allPicked = sortedOptions.every((o) => picked[o.id]);
    if (!allPicked) return null;
    return (
      product.variants.find((v) =>
        sortedOptions.every((o) => variantTokenForOption(v, o) === picked[o.id]),
      ) ?? null
    );
  }, [variantsActive, product.variants, picked, sortedOptions, variantTokenForOption]);

  const previewVariant = useMemo(() => {
    if (!variantsActive || !product.variants?.length) return null;
    if (activeVariant) return activeVariant;
    if (lastChangedOptionId && picked[lastChangedOptionId]) {
      const changedOpt = sortedOptions.find((o) => o.id === lastChangedOptionId);
      if (!changedOpt) return compatibleVariants[0] ?? product.variants[0] ?? null;
      const pref = compatibleVariants.find(
        (v) => variantTokenForOption(v, changedOpt) === picked[lastChangedOptionId],
      );
      if (pref) return pref;
    }
    return compatibleVariants[0] ?? product.variants[0] ?? null;
  }, [
    variantsActive,
    product.variants,
    activeVariant,
    compatibleVariants,
    lastChangedOptionId,
    picked,
    sortedOptions,
    variantTokenForOption,
  ]);

  const galleryImages = useMemo(() => {
    // Thumbnails below the main image must stay from product-level Images & media only.
    return product.images?.length ? product.images : [];
  }, [product.images]);

  const mainImages = useMemo(() => {
    // Main display follows selected variant first (color click updates image).
    const src =
      previewVariant?.images?.length && previewVariant.images.length > 0
        ? previewVariant.images
        : galleryImages;
    return src?.length ? src : [];
  }, [previewVariant, galleryImages]);

  const displayPrice = previewVariant?.priceMad ?? product.priceMad;
  const displayCompareAt =
    previewVariant?.compareAtMad ?? product.compareAtMad ?? null;
  const showCompareAt =
    displayCompareAt != null &&
    String(displayCompareAt).trim() !== "" &&
    parseAmount(displayCompareAt) > parseAmount(displayPrice);
  const displayStock = previewVariant?.stock ?? product.stock;
  const displayLowStock = variantsActive
    ? displayStock > 0 && displayStock <= 5
    : Boolean(product.lowStock);

  useEffect(() => {
    // On variant change (e.g. clicking a color), reset manual thumbnail override.
    setManualMainImage(null);
  }, [mainImages.join("|")]);

  // Thumbnail click can manually override the hero until next option change.
  const main = manualMainImage ?? mainImages[0] ?? galleryImages[0];

  function pickValue(option: ProductOptionDef, value: ProductOptionVal) {
    setManualMainImage(null);
    const token = isColorOption(option)
      ? normalizeColorValue(value.valueKey ?? value.valueFr)
      : value.id;
    setLastChangedOptionId(option.id);
    if (isColorOption(option)) {
      console.log("Selected color:", token);
      console.log("Variants:", product.variants);
      const found = (product.variants ?? []).some(
        (v) => variantTokenForOption(v, option) === token,
      );
      if (!found) {
        console.warn("No variant found for selected color:", token);
      }
    }
    setPicked((prev) => {
      const next = { ...prev, [option.id]: token };
      const oi = sortedOptions.findIndex((o) => o.id === option.id);
      for (let j = oi + 1; j < sortedOptions.length; j += 1) {
        delete next[sortedOptions[j].id];
      }
      return next;
    });
  }

  function lineSnapshot(variantId: string | null): CartLineProduct {
    const v = variantId
      ? product.variants?.find((x) => x.id === variantId)
      : null;
    const price = v?.priceMad ?? product.priceMad;
    const imgs =
      v?.images?.length && v.images.length > 0 ? v.images : product.images;
    const st = v?.stock ?? product.stock;
    return {
      id: product.id,
      slug: product.slug,
      nameFr: product.nameFr ?? title,
      nameAr: product.nameAr ?? title,
      priceMad: price,
      images: imgs,
      stock: st,
      requiresVariant: variantsActive || undefined,
      variantLabelFr: v?.labelFr,
      variantLabelAr: v?.labelAr,
    };
  }

  async function handleAdd() {
    setErr(null);
    setAdding(true);
    try {
      if (variantsActive) {
        if (!activeVariant) {
          setErr(
            locale === "ar"
              ? "يرجى اختيار كل الخيارات (اللون، المقاس، …)."
              : "Choisissez toutes les options (couleur, taille, …).",
          );
          return;
        }
        await addItem(
          product.id,
          1,
          lineSnapshot(activeVariant.id),
          activeVariant.id,
        );
      } else {
        await addItem(product.id, 1, lineSnapshot(null), null);
      }
      flyToCart({
        imageSrc: main ?? product.images[0],
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
    if (variantsActive) {
      if (!activeVariant || activeVariant.stock < 1) {
        setErr(
          locale === "ar"
            ? "اختر كل الخيارات وتأكد من التوفر."
            : "Choisissez toutes les options et vérifiez la disponibilité.",
        );
        return;
      }
      setBuyNow({
        productId: product.id,
        quantity: 1,
        variantId: activeVariant.id,
        snapshot: lineSnapshot(activeVariant.id),
      });
    } else {
      if (product.stock < 1) return;
      setBuyNow({
        productId: product.id,
        quantity: 1,
        snapshot: lineSnapshot(null),
      });
    }
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
            {galleryImages.map((url, i) => (
              <motion.button
                key={`${url}-${i}`}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setManualMainImage(url)}
                className={`relative h-[3.25rem] w-[3.25rem] shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-16 sm:w-16 ${
                  (manualMainImage ? manualMainImage === url : main === url)
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
          <div className="mt-4 flex flex-col items-start gap-0.5">
            <p className="text-3xl font-bold tabular-nums leading-tight text-[var(--fg)] sm:text-4xl">
              {formatSar(displayPrice, locale)}
            </p>
            {showCompareAt ? (
              <p className="text-base font-normal tabular-nums leading-tight text-[var(--muted)] line-through decoration-[var(--muted)] decoration-2 sm:text-lg">
                {formatSar(displayCompareAt, locale)}
              </p>
            ) : null}
          </div>
          <p className="mt-2 text-sm font-medium text-[var(--accent)]">
            {displayStock < 1
              ? labels.outOfStock
              : displayLowStock
                ? labels.lowStock
                : labels.inStock}
          </p>
          {variantsActive ? (
            <div className="mt-4 space-y-4">
              {sortedOptions.map((opt) => (
                <div key={opt.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {locale === "ar" ? opt.nameAr : opt.nameFr}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {opt.values.map((val) => {
                      const valueToken = isColorOption(opt)
                        ? normalizeColorValue(val.valueKey ?? val.valueFr)
                        : val.id;
                      const available = isValueAvailable(opt.id, valueToken);
                      const selected = picked[opt.id] === valueToken;
                      const label =
                        locale === "ar" ? val.valueAr : val.valueFr;
                      return (
                        <button
                          key={val.id}
                          type="button"
                          data-color={isColorOption(opt) ? valueToken : undefined}
                          disabled={!available}
                          onClick={() => pickValue(opt, val)}
                          className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${
                            selected
                              ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--fg)] shadow-[0_0_12px_var(--accent-glow)]"
                              : "border-[var(--border)] bg-[var(--card)] text-[var(--fg)] hover:border-[var(--accent)]/40"
                          }`}
                        >
                          {val.imageUrl ? (
                            <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-[var(--border)]">
                              {isVideoMedia(val.imageUrl) ? (
                                <video
                                  src={val.imageUrl}
                                  className="h-full w-full object-cover"
                                  muted
                                  playsInline
                                  loop
                                  autoPlay
                                />
                              ) : (
                                <ProductImage
                                  src={val.imageUrl}
                                  alt=""
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </span>
                          ) : val.colorHex ? (
                            <span
                              className="h-5 w-5 shrink-0 rounded-full border border-[var(--border)] shadow-inner"
                              style={{ backgroundColor: val.colorHex }}
                              aria-hidden
                            />
                          ) : null}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-sm text-[var(--muted)]">
                {activeVariant
                  ? locale === "ar"
                    ? activeVariant.labelAr
                    : activeVariant.labelFr
                  : locale === "ar"
                    ? "اختر كل الخيارات لإضافة المنتج."
                    : "Sélectionnez toutes les options pour ajouter au panier."}
              </p>
            </div>
          ) : null}
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
                disabled={
                  adding ||
                  (variantsActive
                    ? !activeVariant || activeVariant.stock < 1
                    : product.stock < 1)
                }
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
                  scale:
                    adding ||
                    (variantsActive
                      ? !activeVariant || activeVariant.stock < 1
                      : product.stock < 1)
                      ? 1
                      : 1.02,
                  y:
                    adding ||
                    (variantsActive
                      ? !activeVariant || activeVariant.stock < 1
                      : product.stock < 1)
                      ? 0
                      : -1,
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
                disabled={
                  variantsActive
                    ? !activeVariant || activeVariant.stock < 1
                    : product.stock < 1
                }
                whileHover={{
                  scale:
                    variantsActive
                      ? !activeVariant || activeVariant.stock < 1
                        ? 1
                        : 1.02
                      : product.stock < 1
                        ? 1
                        : 1.02,
                }}
                whileTap={{ scale: 0.97 }}
                className="min-h-[52px] flex-1 rounded-xl border-2 border-[var(--accent)] bg-[var(--card)] px-6 py-3.5 text-sm font-semibold text-[var(--accent)] disabled:opacity-40"
              >
                {labels.buyNow ?? "Buy now"}
              </motion.button>
            </div>
            <ProductOfferCountdown
              endMs={urgencyEndMs}
              labels={{
                title: labels.offerCountdownTitle,
                endsIn: labels.offerCountdownEndsIn,
                unitD: labels.offerUnitD,
                unitH: labels.offerUnitH,
                unitM: labels.offerUnitM,
                unitS: labels.offerUnitS,
              }}
            />
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
