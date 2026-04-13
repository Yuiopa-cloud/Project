"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useCart } from "@/contexts/cart-context";
import { ProductImage } from "@/components/product-image";
import { MotionLink } from "@/components/motion-link";
import { formatSar, parseAmount } from "@/lib/price";

const springPanel = {
  type: "spring" as const,
  stiffness: 420,
  damping: 34,
  mass: 0.78,
};

function IconClose({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function CartDrawer() {
  const t = useTranslations("cart");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const {
    cart,
    loading,
    drawerOpen,
    closeDrawer,
    setQty,
    refresh,
  } = useCart();
  const [mounted, setMounted] = useState(false);

  const isRtl = locale === "ar";
  const lines = cart?.items ?? [];

  const { subtotal, count } = useMemo(() => {
    let sum = 0;
    let c = 0;
    for (const line of lines) {
      const unit = parseAmount(line.product.priceMad);
      sum += unit * line.quantity;
      c += line.quantity;
    }
    return { subtotal: sum, count: c };
  }, [lines]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  if (!mounted) return null;

  const slideX = isRtl ? "-100%" : "100%";
  const panelFrom = reduceMotion
    ? { x: 0, opacity: 1, scale: 1 }
    : { x: slideX, opacity: 0.9, scale: 0.96 };
  const panelTo = { x: 0, opacity: 1, scale: 1 };
  const panelExit = reduceMotion
    ? { opacity: 0 }
    : { x: slideX, opacity: 0.88, scale: 0.98 };

  const node = (
    <AnimatePresence mode="sync">
      {drawerOpen ? (
        <>
          <motion.button
            key="cart-drawer-backdrop"
            type="button"
            aria-label={tNav("closeMenu")}
            className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-[3px]"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.32 }}
            onClick={closeDrawer}
          />
          <motion.aside
            key="cart-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
            className="fixed top-0 bottom-0 end-0 z-[101] flex max-h-dvh w-[min(100%,420px)] flex-col overflow-hidden rounded-s-3xl border border-[var(--border)] border-e-0 border-s-2 bg-[var(--card)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_14%,transparent),0_28px_90px_-24px_rgba(15,23,42,0.38),0_0_100px_-28px_color-mix(in_srgb,var(--accent)_28%,transparent)]"
            style={{
              borderInlineStartColor:
                "color-mix(in srgb, var(--accent) 42%, var(--border))",
            }}
            initial={panelFrom}
            animate={panelTo}
            exit={panelExit}
            transition={reduceMotion ? { duration: 0.2 } : springPanel}
          >
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
              aria-hidden
            >
              <motion.div
                className="absolute -inset-1/2 opacity-[0.07]"
                style={{
                  background:
                    "conic-gradient(from 120deg at 50% 50%, var(--accent), var(--accent-hot), var(--primary-mid), var(--accent))",
                }}
                animate={
                  reduceMotion
                    ? {}
                    : { rotate: [0, 360] }
                }
                transition={{
                  duration: 28,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </div>

            <header className="relative flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
              <div>
                <p
                  id="cart-drawer-title"
                  className="text-lg font-bold tracking-tight text-[var(--fg)]"
                >
                  {t("drawerTitle")}
                </p>
                <p className="text-xs text-[var(--muted)]">{t("drawerHint")}</p>
              </div>
              <motion.button
                type="button"
                onClick={closeDrawer}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.92 }}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--press-bg)] text-[var(--fg)] shadow-sm"
                aria-label={tNav("closeMenu")}
              >
                <IconClose className="h-5 w-5" />
              </motion.button>
            </header>

            <div className="relative flex min-h-0 flex-1 flex-col">
              {loading && !cart ? (
                <div className="flex-1 space-y-3 p-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-24 rounded-xl" />
                  ))}
                </div>
              ) : lines.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
                  <motion.span
                    className="text-5xl"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={springPanel}
                    aria-hidden
                  >
                    🛒
                  </motion.span>
                  <p className="text-sm font-medium text-[var(--muted)]">
                    {t("empty")}
                  </p>
                  <MotionLink
                    href="/shop"
                    onClick={closeDrawer}
                    className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_var(--accent-glow)]"
                  >
                    {t("continueShopping")}
                  </MotionLink>
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4">
                    <ul className="space-y-3">
                      {lines.map((line, i) => {
                        const p = line.product;
                        const title =
                          locale === "ar" ? p.nameAr : p.nameFr;
                        const variantHint =
                          locale === "ar"
                            ? p.variantLabelAr ?? p.variantLabelFr
                            : p.variantLabelFr ?? p.variantLabelAr;
                        const price =
                          typeof p.priceMad === "string"
                            ? p.priceMad
                            : String(p.priceMad);
                        return (
                          <motion.li
                            key={line.id}
                            layout
                            initial={
                              reduceMotion
                                ? {}
                                : { opacity: 0, y: 14, scale: 0.97 }
                            }
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                              ...springPanel,
                              delay: reduceMotion ? 0 : i * 0.045,
                            }}
                            className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,var(--accent-dim))] p-3 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.12)]"
                          >
                            <MotionLink
                              href={`/product/${p.slug}`}
                              onClick={closeDrawer}
                              className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-[var(--press-bg)] ring-1 ring-[var(--border)]"
                            >
                              <ProductImage
                                src={p.images?.[0]}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </MotionLink>
                            <div className="min-w-0 flex-1">
                              <MotionLink
                                href={`/product/${p.slug}`}
                                onClick={closeDrawer}
                                className="line-clamp-2 text-sm font-bold leading-snug text-[var(--fg)] hover:text-[var(--accent)]"
                              >
                                {title}
                              </MotionLink>
                              {variantHint ? (
                                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                                  {variantHint}
                                </p>
                              ) : null}
                              <p className="mt-1 text-xs font-semibold tabular-nums text-[var(--accent)]">
                                {formatSar(price, locale)}
                              </p>
                              <div className="mt-2 flex items-center gap-1.5">
                                <motion.button
                                  type="button"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--press-bg)] text-base font-bold"
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() =>
                                    void setQty(
                                      line.id,
                                      Math.max(0, line.quantity - 1),
                                    )
                                  }
                                >
                                  −
                                </motion.button>
                                <span className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums">
                                  {line.quantity}
                                </span>
                                <motion.button
                                  type="button"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--press-bg)] text-base font-bold"
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() =>
                                    void setQty(line.id, line.quantity + 1)
                                  }
                                >
                                  +
                                </motion.button>
                              </div>
                            </div>
                          </motion.li>
                        );
                      })}
                    </ul>
                  </div>

                  <footer className="relative border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_95%,var(--accent-dim))] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {t("estimatedTotal")}
                      </span>
                      <span className="text-xl font-bold tabular-nums text-[var(--fg)]">
                        {formatSar(subtotal, locale)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--muted)]">
                      {t("itemsCount", { count })}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {t("shippingNote")}
                    </p>
                    <motion.div
                      className="mt-4 flex flex-col gap-2"
                      initial={reduceMotion ? {} : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...springPanel, delay: 0.06 }}
                    >
                      <MotionLink
                        href="/checkout"
                        onClick={closeDrawer}
                        className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hot)] text-sm font-bold text-white shadow-[0_14px_40px_-14px_var(--accent-glow)]"
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {t("checkout")}
                      </MotionLink>
                      <MotionLink
                        href="/cart"
                        onClick={closeDrawer}
                        className="flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--press-bg)] text-xs font-semibold text-[var(--fg)]"
                        whileTap={{ scale: 0.98 }}
                      >
                        {t("viewFullCart")}
                      </MotionLink>
                      <motion.button
                        type="button"
                        onClick={() => void refresh()}
                        className="text-center text-xs font-medium text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2"
                        whileTap={{ scale: 0.98 }}
                      >
                        {t("refresh")}
                      </motion.button>
                    </motion.div>
                  </footer>
                </>
              )}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(node, document.body);
}
