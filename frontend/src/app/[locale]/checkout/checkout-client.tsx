"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { useCart } from "@/contexts/cart-context";
import { logApiFailure } from "@/lib/api-config";
import { parseNestErrorMessage } from "@/lib/parse-nest-error";
import { isOfflineProductId } from "@/lib/catalog-fallback";
import { MotionLink } from "@/components/motion-link";
import { CheckoutCelebration } from "./checkout-celebration";

type Zone = {
  cityCode: string;
  cityNameFr: string;
  cityNameAr: string;
  shippingCostMad: string;
  freeShippingThresholdMad: string | null;
};

const spring = { type: "spring" as const, stiffness: 400, damping: 30 };
const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.06 },
  },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { ...spring },
  },
};

function formatOrderTotal(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "number") return v.toFixed(2);
  if (
    typeof v === "object" &&
    v !== null &&
    "toFixed" in v &&
    typeof (v as { toFixed: unknown }).toFixed === "function"
  ) {
    return (v as { toFixed: (n: number) => string }).toFixed(2);
  }
  return String(v);
}

export function CheckoutClient() {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const { cart, apiRoot, refresh } = useCart();
  const [zones, setZones] = useState<Zone[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{
    orderNumber: string;
    whatsapp?: string;
    totalMad?: string;
    firstName?: string;
  } | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [quarter, setQuarter] = useState("");
  const [cityCode, setCityCode] = useState("CASA");
  const [postalCode, setPostalCode] = useState("");
  const [phoneConfirmed, setPhoneConfirmed] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [payment, setPayment] = useState<"CASH_ON_DELIVERY" | "STRIPE">(
    "CASH_ON_DELIVERY",
  );

  useEffect(() => {
    const url = `${apiRoot}/delivery-zones`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then(setZones)
      .catch((e) => {
        logApiFailure(`GET ${url}`, e);
        setZones([]);
      });
  }, [apiRoot]);

  const items = cart?.items ?? [];
  const shippableItems = items.filter(
    (l) => !isOfflineProductId(l.product.id),
  );
  const hasOnlyOfflineItems =
    items.length > 0 && shippableItems.length === 0;

  const canSubmit =
    shippableItems.length > 0 &&
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    line1.trim().length >= 3 &&
    quarter.trim().length >= 2 &&
    phone.replace(/\s/g, "").length >= 8;

  const productLabel = (nameFr: string, nameAr: string) =>
    locale === "ar" ? nameAr : nameFr;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!canSubmit) {
      setErr(t("fillRequired"));
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        items: shippableItems.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
        })),
        paymentMethod: payment,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        guestEmail: guestEmail.trim() || undefined,
        phoneConfirmed,
        couponCode: couponCode.trim() || undefined,
        shipping: {
          line1: line1.trim(),
          quarter: quarter.trim(),
          cityCode,
          postalCode: postalCode.trim() || undefined,
          phone: phone.trim(),
        },
      };
      const checkoutUrl = `${apiRoot}/orders/checkout`;
      if (process.env.NODE_ENV === "development") {
        console.log("[checkout] POST", checkoutUrl, body);
      }
      const res = await fetch(checkoutUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        logApiFailure(`POST ${checkoutUrl}`, {
          status: res.status,
          body: txt?.slice?.(0, 500),
        });
        const parsed = parseNestErrorMessage(txt);
        throw new Error(parsed || res.statusText);
      }
      const data = await res.json();
      setDone({
        orderNumber: data.order?.orderNumber ?? "—",
        whatsapp: data.whatsappConfirmUrl,
        totalMad: formatOrderTotal(data.order?.totalMad),
        firstName: firstName.trim() || undefined,
      });
      await refresh();
    } catch (e: unknown) {
      logApiFailure("checkout submit", e);
      const raw = e instanceof Error ? e.message : "";
      const lower = raw.toLowerCase();
      let friendly = t("orderError");
      if (
        lower.includes("delivery zone") ||
        lower.includes("zone de livraison") ||
        lower.includes("livraison inconnue")
      ) {
        friendly = t("errZone");
      } else if (
        lower.includes("products unavailable") ||
        lower.includes("one or more products") ||
        (lower.includes("produit") && lower.includes("indisponible"))
      ) {
        friendly = t("errProducts");
      } else if (
        lower.includes("insufficient stock") ||
        lower.includes("stock insuffisant")
      ) {
        friendly = t("errStock");
      } else if (
        lower.includes("invalid coupon") ||
        (lower.includes("coupon") && lower.includes("invalide"))
      ) {
        friendly = t("errCoupon");
      } else if (raw && raw.length < 400) {
        friendly = raw;
      }
      setErr(friendly);
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0 && !done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="relative overflow-hidden rounded-3xl border border-[var(--accent)]/25 bg-[var(--card)]/80 px-6 py-14 shadow-[0_0_48px_-16px_var(--accent-glow)]"
        >
          <div className="checkout-glow absolute inset-0 opacity-40" aria-hidden />
          <p className="relative text-lg text-[var(--fg)]">{t("emptyCart")}</p>
          <MotionLink
            href="/shop"
            className="btn-primary-motion relative mt-8 inline-block"
          >
            {t("successShopAgain")}
          </MotionLink>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-xl px-4 py-8 md:max-w-2xl md:py-12">
      <div
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--accent-glow-soft), transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-20 h-64 w-64 rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--accent), transparent 65%)",
        }}
        aria-hidden
      />

      <motion.header
        className="relative mb-8 md:mb-10"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
      >
        <motion.h1
          className="text-3xl font-bold tracking-tight text-[var(--fg)] md:text-4xl"
          layout
        >
          {t("title")}
        </motion.h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)] md:text-base">
          {t("subtitle")}
        </p>
        <p className="mt-2 text-xs text-[var(--muted)] md:text-sm">
          {t("phoneNote")}
        </p>
      </motion.header>

      {hasOnlyOfflineItems && !done ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="relative mb-8 overflow-hidden rounded-2xl border border-[var(--accent)]/30 bg-[color-mix(in_srgb,var(--card)_88%,transparent)] p-6 shadow-[0_12px_40px_-24px_var(--accent-glow)]"
        >
          <div className="checkout-glow absolute inset-0 opacity-50" aria-hidden />
          <p className="relative text-sm leading-relaxed text-[var(--fg)] md:text-base">
            {t("offlineHint")}
          </p>
          <MotionLink
            href="/shop"
            className="btn-primary-motion relative mt-6 inline-flex"
          >
            {t("successShopAgain")}
          </MotionLink>
        </motion.div>
      ) : null}

      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="ok"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="relative"
          >
            <CheckoutCelebration
              orderNumber={done.orderNumber}
              totalMad={done.totalMad}
              firstName={done.firstName}
              whatsappUrl={done.whatsapp}
            />
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            onSubmit={submit}
            className="relative space-y-6"
          >
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="card-chrome relative overflow-hidden rounded-2xl p-4 md:p-5"
            >
              <motion.div
                layout
                className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--accent)]/10 blur-2xl"
                aria-hidden
              />
              <div className="relative flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {t("recapTitle")}
                </p>
                <motion.span
                  className="rounded-full bg-[var(--accent-dim)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--accent)]"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, ...spring }}
                >
                  {t("linesOrdered", { count: shippableItems.length })}
                </motion.span>
              </div>
              <ul className="relative mt-3 max-h-44 space-y-2 overflow-y-auto text-sm">
                {shippableItems.map((l, i) => (
                  <motion.li
                    key={l.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.04, ...spring }}
                    className="flex justify-between gap-3 border-b border-[var(--border)]/50 py-2 last:border-0"
                  >
                    <span className="truncate text-[var(--fg)]">
                      {productLabel(l.product.nameFr, l.product.nameAr)} ×{" "}
                      {l.quantity}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.section variants={fadeUp} className="card-chrome rounded-2xl p-4 md:p-5">
                <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-dim)] text-[11px] font-bold text-[var(--fg)]">
                    1
                  </span>
                  {t("stepContact")}
                </p>
                <label className="mb-3 block text-xs text-[var(--muted)]">
                  {t("coupon")}
                  <motion.input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2.5 text-sm text-[var(--fg)]"
                    placeholder="WELCOME10"
                    whileFocus={{ scale: 1.005 }}
                    transition={{ duration: 0.2 }}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs text-[var(--muted)]">
                    {t("firstName")}
                    <motion.input
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2.5 text-sm text-[var(--fg)]"
                      whileFocus={{ scale: 1.005 }}
                      transition={{ duration: 0.2 }}
                    />
                  </label>
                  <label className="block text-xs text-[var(--muted)]">
                    {t("lastName")}
                    <motion.input
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2.5 text-sm text-[var(--fg)]"
                      whileFocus={{ scale: 1.005 }}
                      transition={{ duration: 0.2 }}
                    />
                  </label>
                </div>
                <label className="mt-3 block text-xs text-[var(--muted)]">
                  {t("email")}
                  <motion.input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2.5 text-sm text-[var(--fg)]"
                    whileFocus={{ scale: 1.005 }}
                    transition={{ duration: 0.2 }}
                  />
                </label>
                <label className="mt-3 block text-xs text-[var(--muted)]">
                  {t("phone")}
                  <motion.input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0612345678"
                    className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2.5 text-sm text-[var(--fg)]"
                    whileFocus={{ scale: 1.005 }}
                    transition={{ duration: 0.2 }}
                  />
                </label>
              </motion.section>

              <motion.section
                variants={fadeUp}
                className="card-chrome mt-4 rounded-2xl p-4 md:p-5"
              >
                <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-dim)] text-[11px] font-bold text-[var(--fg)]">
                    2
                  </span>
                  {t("stepAddress")}
                </p>
                <label className="block text-xs text-[var(--muted)]">
                  {t("address.line1")}
                  <motion.input
                    required
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2.5 text-sm text-[var(--fg)]"
                    whileFocus={{ scale: 1.005 }}
                    transition={{ duration: 0.2 }}
                  />
                </label>
                <label className="mt-3 block text-xs text-[var(--muted)]">
                  {t("address.quarter")}
                  <motion.input
                    required
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value)}
                    className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2.5 text-sm text-[var(--fg)]"
                    whileFocus={{ scale: 1.005 }}
                    transition={{ duration: 0.2 }}
                  />
                </label>
                <label className="mt-3 block text-xs text-[var(--muted)]">
                  {t("address.city")}
                  <motion.select
                    value={cityCode}
                    onChange={(e) => setCityCode(e.target.value)}
                    className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2.5 text-sm text-[var(--fg)]"
                  >
                    {zones.length === 0 ? (
                      <option value="CASA">Casablanca (CASA)</option>
                    ) : (
                      zones.map((z) => (
                        <option key={z.cityCode} value={z.cityCode}>
                          {locale === "ar"
                            ? `${z.cityNameAr} (${z.cityCode})`
                            : `${z.cityNameFr} (${z.cityCode})`}
                        </option>
                      ))
                    )}
                  </motion.select>
                </label>
                <label className="mt-3 block text-xs text-[var(--muted)]">
                  {t("address.postal")}
                  <motion.input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2.5 text-sm text-[var(--fg)]"
                    whileFocus={{ scale: 1.005 }}
                    transition={{ duration: 0.2 }}
                  />
                </label>
              </motion.section>

              <motion.section
                variants={fadeUp}
                className="card-chrome mt-4 rounded-2xl p-4 md:p-5"
              >
                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-dim)] text-[11px] font-bold text-[var(--fg)]">
                    3
                  </span>
                  {t("stepPayment")}
                </p>
                <fieldset className="space-y-3">
                  <motion.label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-colors ${
                      payment === "CASH_ON_DELIVERY"
                        ? "border-[var(--accent)]/60 bg-[var(--accent-dim)]/35"
                        : "border-[var(--border)] bg-black/15"
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <input
                      type="radio"
                      name="pay"
                      checked={payment === "CASH_ON_DELIVERY"}
                      onChange={() => setPayment("CASH_ON_DELIVERY")}
                      className="accent-[var(--accent)]"
                    />
                    {t("cod")}
                  </motion.label>
                  <motion.label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-colors ${
                      payment === "STRIPE"
                        ? "border-[var(--accent)]/60 bg-[var(--accent-dim)]/35"
                        : "border-[var(--border)] bg-black/15 opacity-90"
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <input
                      type="radio"
                      name="pay"
                      checked={payment === "STRIPE"}
                      onChange={() => setPayment("STRIPE")}
                      className="accent-[var(--accent)]"
                    />
                    <span>
                      {t("stripe")}{" "}
                      <span className="text-xs text-[var(--muted)]">
                        {t("stripeHint")}
                      </span>
                    </span>
                  </motion.label>
                </fieldset>

                <motion.label
                  className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-[var(--fg)]"
                  whileHover={{ x: 2 }}
                  transition={spring}
                >
                  <input
                    type="checkbox"
                    checked={phoneConfirmed}
                    onChange={(e) => setPhoneConfirmed(e.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  {t("phoneConfirmed")}
                </motion.label>
              </motion.section>
            </motion.div>

            {err ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="whitespace-pre-wrap rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
              >
                {err}
              </motion.p>
            ) : null}

            <motion.div
              className="pt-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, ...spring }}
            >
              <motion.button
                type="submit"
                disabled={busy || !canSubmit}
                whileHover={{
                  scale: busy || !canSubmit ? 1 : 1.03,
                  y: busy || !canSubmit ? 0 : -3,
                  boxShadow:
                    busy || !canSubmit
                      ? undefined
                      : "0 20px 40px -12px var(--accent-glow)",
                }}
                whileTap={{ scale: 0.97 }}
                transition={spring}
                className="relative w-full overflow-hidden rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hot)] py-3.5 text-sm font-bold text-slate-900 shadow-[0_10px_32px_-10px_var(--accent-glow)] disabled:opacity-45"
              >
                {!busy && canSubmit ? (
                  <motion.span
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                    aria-hidden
                  />
                ) : null}
                <span className="relative">
                  {busy ? t("submitting") : t("placeOrder")}
                </span>
              </motion.button>
            </motion.div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
