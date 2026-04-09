"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useCustomerAuth } from "@/contexts/customer-auth-context";
import { MotionLink } from "@/components/motion-link";

function friendlyErr(raw: string): string {
  try {
    const j = JSON.parse(raw) as { message?: string | string[] };
    const m = j.message;
    if (Array.isArray(m) && m[0]) return String(m[0]);
    if (typeof m === "string") return m;
  } catch {
    /* ignore */
  }
  const t = raw.trim();
  if (t && !t.startsWith("<") && t.length < 400) return t;
  return "تعذر إتمام الطلب. تحقق من الاتصال أو البيانات.";
}

export function DashboardClient() {
  const t = useTranslations("dashboard");
  const {
    profile,
    loading,
    profileLoading,
    register,
    login,
    logout,
    token,
  } = useCustomerAuth();
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const pointsDisplay = useMemo(() => {
    if (!profile) return "0";
    return new Intl.NumberFormat("ar-SA-u-nu-latn", {
      maximumFractionDigits: 0,
    }).format(profile.loyaltyPoints);
  }, [profile]);

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await register({
        phone,
        password,
        firstName,
        lastName,
        email: email.trim() || undefined,
      });
    } catch (e: unknown) {
      setErr(
        friendlyErr(e instanceof Error ? e.message : "خطأ غير متوقع"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(phone, password);
    } catch (e: unknown) {
      setErr(
        friendlyErr(e instanceof Error ? e.message : "خطأ غير متوقع"),
      );
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-1 w-full min-h-11 rounded-xl border border-[var(--border)] bg-[var(--press-bg)] px-3 py-2.5 text-sm text-[var(--fg)] outline-none";

  return (
    <div className="mx-auto max-w-lg px-4 py-10 md:max-w-xl md:py-14">
      {loading || (token && profileLoading) ? (
        <div className="space-y-4">
          <div className="skeleton h-10 w-3/4 rounded-lg" />
          <div className="skeleton h-40 rounded-2xl" />
        </div>
      ) : profile ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="member-space-breathe rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-[0_20px_50px_-24px_rgba(124,45,18,0.2)]"
        >
          <p className="text-sm font-semibold text-[var(--accent)]">
            {t("memberKicker")}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--fg)] md:text-3xl">
            {t("memberWelcome", {
              name: `${profile.firstName} ${profile.lastName}`.trim(),
            })}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            {t("memberBody")}
          </p>
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--press-bg)]/80 p-4">
            <p className="text-xs font-medium text-[var(--muted)]">
              {t("loyaltyLabel")}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--fg)]">
              {pointsDisplay}{" "}
              <span className="text-base font-semibold text-[var(--accent)]">
                {t("loyaltyUnit")}
              </span>
            </p>
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">{profile.phone}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <MotionLink
              href="/shop"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-6 text-sm font-semibold text-white"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t("ctaShop")}
            </MotionLink>
            <motion.button
              type="button"
              onClick={() => logout()}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 text-sm font-semibold text-[var(--fg)]"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t("logout")}
            </motion.button>
          </div>
          <p className="mt-6 text-xs text-[var(--muted)]">{t("memberHint")}</p>
        </motion.div>
      ) : (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:p-8"
        >
          <div className="flex gap-2 rounded-xl bg-[var(--press-bg)] p-1">
            <button
              type="button"
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-[var(--card)] text-[var(--fg)] shadow-sm"
                  : "text-[var(--muted)]"
              }`}
              onClick={() => {
                setMode("register");
                setErr(null);
              }}
            >
              {t("tabJoin")}
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-[var(--card)] text-[var(--fg)] shadow-sm"
                  : "text-[var(--muted)]"
              }`}
              onClick={() => {
                setMode("login");
                setErr(null);
              }}
            >
              {t("tabLogin")}
            </button>
          </div>

          <h1 className="mt-6 text-xl font-bold text-[var(--fg)] md:text-2xl">
            {mode === "register" ? t("titleRegister") : t("titleLogin")}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{t("lead")}</p>

          {mode === "register" ? (
            <form onSubmit={onRegister} className="mt-6 space-y-3">
              <label className="block text-xs font-medium text-[var(--muted)]">
                {t("firstName")}
                <input
                  className={inputClass}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="given-name"
                />
              </label>
              <label className="block text-xs font-medium text-[var(--muted)]">
                {t("lastName")}
                <input
                  className={inputClass}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="family-name"
                />
              </label>
              <label className="block text-xs font-medium text-[var(--muted)]">
                {t("phone")}
                <input
                  className={inputClass}
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  required
                  minLength={8}
                  autoComplete="tel"
                />
              </label>
              <label className="block text-xs font-medium text-[var(--muted)]">
                {t("emailOptional")}
                <input
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
              <label className="block text-xs font-medium text-[var(--muted)]">
                {t("password")}
                <input
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <motion.button
                type="submit"
                disabled={busy}
                whileTap={{ scale: 0.98 }}
                className="mt-2 w-full min-h-11 rounded-xl bg-[var(--accent)] text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? t("submitting") : t("submitRegister")}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={onLogin} className="mt-6 space-y-3">
              <label className="block text-xs font-medium text-[var(--muted)]">
                {t("phone")}
                <input
                  className={inputClass}
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="tel"
                />
              </label>
              <label className="block text-xs font-medium text-[var(--muted)]">
                {t("password")}
                <input
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </label>
              <motion.button
                type="submit"
                disabled={busy}
                whileTap={{ scale: 0.98 }}
                className="mt-2 w-full min-h-11 rounded-xl bg-[var(--accent)] text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? t("submitting") : t("submitLogin")}
              </motion.button>
            </form>
          )}

          {err ? (
            <p className="mt-4 rounded-xl border border-rose-300/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-100">
              {err}
            </p>
          ) : null}

          <p className="mt-6 text-xs text-[var(--muted)]">{t("priceNote")}</p>
        </motion.div>
      )}
    </div>
  );
}
