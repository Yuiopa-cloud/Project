"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { AtlasLogo } from "@/components/atlas-logo";
import { clientApiRoot, logApiFailure } from "@/lib/api-config";
import { Link } from "@/i18n/navigation";

const TOKEN_KEY = "atlas-admin-jwt";
const ORDER_STATUSES = [
  "PENDING_CONFIRMATION",
  "AWAITING_PAYMENT",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REJECTED",
] as const;

type ConfirmationTone = "red" | "green" | "blue" | "neutral";

type Dash = {
  periodDays: number;
  revenueMad: string;
  orders: number;
  customers: number;
  pendingFraudFlags: number;
  conversionRateApprox: number;
  inventoryLow: number;
};

type OrderRow = {
  id: string;
  orderNumber: string;
  status: string;
  totalMad: string;
  guestPhone: string;
  manualConfirmationRequired: boolean;
  fraudFlags?: { decision: string }[];
};

type CustomerRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  locale: string;
  createdAt: string;
  _count: { orders: number };
};

function friendlyNetworkError(err: unknown): string {
  if (!(err instanceof Error)) return "Erreur reseau.";
  const m = err.message.toLowerCase();
  if (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("load failed") ||
    m.includes("network request failed")
  ) {
    return process.env.NODE_ENV === "production"
      ? "Impossible de joindre l'API. Sur Vercel: NEXT_PUBLIC_API_URL ou BACKEND_PROXY_URL + API Railway (FRONTEND_URL / CORS cote API)."
      : "Impossible de joindre l'API (port 4000). À la racine du projet, lancez npm run dev (site + API). Vérifiez DATABASE_URL et PostgreSQL.";
  }
  return err.message;
}

function confirmationStatusMeta(status: string): {
  tone: ConfirmationTone;
  label: string;
} {
  if (status === "CANCELLED" || status === "REJECTED") {
    return { tone: "red", label: "Cancelled / Rejected" };
  }
  if (status === "SHIPPED" || status === "DELIVERED") {
    return { tone: "green", label: "Shipped / Delivered" };
  }
  if (
    status === "PROCESSING" ||
    status === "PENDING_CONFIRMATION" ||
    status === "AWAITING_PAYMENT"
  ) {
    return { tone: "blue", label: "In progress" };
  }
  return { tone: "neutral", label: "Unknown" };
}

function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dotToneClass(tone: ConfirmationTone): string {
  if (tone === "red") {
    return "bg-rose-300 ring-2 ring-rose-300/45 shadow-[0_0_18px_rgba(251,113,133,0.95),0_0_34px_rgba(251,113,133,0.55)]";
  }
  if (tone === "green") {
    return "bg-emerald-300 ring-2 ring-emerald-300/45 shadow-[0_0_18px_rgba(74,222,128,0.95),0_0_34px_rgba(74,222,128,0.55)]";
  }
  if (tone === "blue") {
    return "bg-sky-300 ring-2 ring-sky-300/45 shadow-[0_0_18px_rgba(56,189,248,0.95),0_0_34px_rgba(56,189,248,0.55)]";
  }
  return "bg-zinc-300 ring-2 ring-zinc-300/35 shadow-[0_0_14px_rgba(161,161,170,0.75)]";
}

function toneBadgeClass(tone: ConfirmationTone): string {
  if (tone === "red") return "bg-rose-500/15 text-rose-200 border-rose-300/30";
  if (tone === "green") return "bg-emerald-500/15 text-emerald-200 border-emerald-300/30";
  if (tone === "blue") return "bg-sky-500/15 text-sky-200 border-sky-300/30";
  return "bg-zinc-500/15 text-zinc-200 border-zinc-300/30";
}

function nestErrorMessage(raw: string): string | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const data = JSON.parse(raw) as {
      message?: string | string[];
      error?: string;
    };
    const m = data.message;
    if (Array.isArray(m) && m[0]) return String(m[0]);
    if (typeof m === "string" && m.length) return m;
  } catch {
    /* plain text */
  }
  const t = raw.trim();
  if (t.length > 0 && !t.startsWith("<")) return t.slice(0, 500);
  return undefined;
}

export function AdminDashboard() {
  const tAdmin = useTranslations("admin");
  const apiRoot = useMemo(() => clientApiRoot(), []);
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"dash" | "orders" | "members">("dash");
  const [dash, setDash] = useState<Dash | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [members, setMembers] = useState<CustomerRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [orderQuery, setOrderQuery] = useState("");
  const [confirmationFilter, setConfirmationFilter] = useState<
    "ALL" | "red" | "green" | "blue"
  >("ALL");

  useEffect(() => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (t) setToken(t);
  }, []);

  const authHeaders = useCallback(
    (): HeadersInit => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token],
  );

  const loadDash = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${apiRoot}/admin/dashboard`, {
        headers: authHeaders(),
      });
      if (!r.ok) {
        const txt = await r.text();
        setMsg(
          txt && !txt.startsWith("<")
            ? txt
            : process.env.NODE_ENV === "production"
              ? "Erreur API (dashboard). Vérifiez les variables Vercel et Railway."
              : "API introuvable — lancez npm run dev à la racine (API port 4000).",
        );
        return;
      }
      setDash(await r.json());
    } catch (e) {
      logApiFailure("admin dashboard", e);
      setMsg(friendlyNetworkError(e));
    }
  }, [apiRoot, token, authHeaders]);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${apiRoot}/admin/orders?take=120`, {
        headers: authHeaders(),
      });
      if (!r.ok) {
        const txt = await r.text();
        setMsg(
          txt && !txt.startsWith("<")
            ? txt
            : process.env.NODE_ENV === "production"
              ? "Erreur API (dashboard). Vérifiez les variables Vercel et Railway."
              : "API introuvable — lancez npm run dev à la racine (API port 4000).",
        );
        return;
      }
      setOrders(await r.json());
    } catch (e) {
      logApiFailure("admin orders", e);
      setMsg(friendlyNetworkError(e));
    }
  }, [apiRoot, token, authHeaders]);

  const loadMembers = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${apiRoot}/admin/customers?take=300`, {
        headers: authHeaders(),
      });
      if (!r.ok) {
        const txt = await r.text();
        setMsg(
          txt && !txt.startsWith("<")
            ? txt
            : process.env.NODE_ENV === "production"
              ? "Erreur API (membres)."
              : "API introuvable — lancez npm run dev.",
        );
        return;
      }
      setMembers(await r.json());
    } catch (e) {
      logApiFailure("admin customers", e);
      setMsg(friendlyNetworkError(e));
    }
  }, [apiRoot, token, authHeaders]);

  useEffect(() => {
    if (!token) return;
    setMsg(null);
    if (tab === "dash") loadDash();
    else if (tab === "orders") loadOrders();
    else loadMembers();
  }, [token, tab, loadDash, loadOrders, loadMembers]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const apiDownMsg =
      process.env.NODE_ENV === "production"
        ? "L'API ne répond pas (502/503/504). Vérifiez Railway et les URLs Vercel (proxy)."
        : "Aucune API sur le port 4000 — à la racine du dépôt, relancez: npm run dev (site + API).";
    try {
      const r = await fetch(`${apiRoot}/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const rawText = await r.text();
      let data: {
        message?: string | string[];
        user?: { role?: string };
        accessToken?: string;
      } = {};
      try {
        data = rawText ? (JSON.parse(rawText) as typeof data) : {};
      } catch {
        data = {};
      }
      if (!r.ok) {
        const apiMsg = nestErrorMessage(rawText) ?? (typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message[0] : undefined);
        const hasNestJson = typeof apiMsg === "string" && apiMsg.length > 0;
        if ([500, 502, 503, 504].includes(r.status) && !hasNestJson) {
          setMsg(apiDownMsg);
          return;
        }
        throw new Error(
          typeof apiMsg === "string" ? apiMsg : "Mot de passe incorrect",
        );
      }
      if (data.user?.role !== "ADMIN") {
        throw new Error("Session admin invalide.");
      }
      const access = data.accessToken;
      if (!access) throw new Error("Pas de jeton");
      sessionStorage.setItem(TOKEN_KEY, access);
      setToken(access);
      setPassword("");
    } catch (e: unknown) {
      logApiFailure("admin-login", e);
      setMsg(friendlyNetworkError(e));
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setDash(null);
    setOrders([]);
    setMembers([]);
  }

  async function fraudDecision(orderId: string, decision: "APPROVED" | "REJECTED") {
    setMsg(null);
    const r = await fetch(`${apiRoot}/admin/orders/${orderId}/fraud-decision`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ decision }),
    });
    if (!r.ok) setMsg(await r.text());
    else {
      setMsg(`OK - ${decision}`);
      loadOrders();
    }
  }

  async function setStatus(orderId: string, status: string) {
    const r = await fetch(`${apiRoot}/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!r.ok) setMsg(await r.text());
    else loadOrders();
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const conf = confirmationStatusMeta(o.status);
      const passTone =
        confirmationFilter === "ALL" ? true : conf.tone === confirmationFilter;
      const q = orderQuery.trim().toLowerCase();
      const passQuery =
        q.length === 0 ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.guestPhone.toLowerCase().includes(q) ||
        o.status.toLowerCase().includes(q);
      return passTone && passQuery;
    });
  }, [orders, orderQuery, confirmationFilter]);

  const toneCounts = useMemo(() => {
    const acc = { red: 0, green: 0, blue: 0 };
    for (const o of orders) {
      const t = confirmationStatusMeta(o.status).tone;
      if (t === "red" || t === "green" || t === "blue") acc[t] += 1;
    }
    return acc;
  }, [orders]);

  if (!token) {
    return (
      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-10">
        <div className="pointer-events-none absolute inset-0 bg-[#050810]" />
        <div className="pointer-events-none absolute -left-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-emerald-400/30 blur-[120px]" />
        <div className="pointer-events-none absolute right-[-6rem] top-[20%] h-72 w-72 rounded-full bg-fuchsia-500/30 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-5rem] right-[20%] h-64 w-64 rounded-full bg-red-500/30 blur-[120px]" />
        <div className="pointer-events-none absolute left-[32%] top-[12%] h-56 w-56 rounded-full bg-indigo-500/25 blur-[120px]" />

        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative z-10 w-full max-w-sm rounded-[28px] border border-white/20 bg-white/10 p-7 shadow-[0_25px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        >
          <div className="mb-5 flex justify-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-white/80 text-slate-900 shadow-sm">
              <AtlasLogo size={26} />
            </div>
          </div>

          <h1 className="text-center text-3xl font-semibold tracking-tight text-white">
            Vault Access
          </h1>
          <p className="mt-1 text-center text-xs tracking-wide text-white/55">
            Quantum encrypted authentication
          </p>

          <form onSubmit={login} className="mt-6 space-y-3">
            <input
              type="text"
              value="admin"
              readOnly
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white/70 outline-none placeholder:text-white/35"
              aria-label="Username"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35"
              placeholder={tAdmin("loginPlaceholder")}
              autoComplete="current-password"
            />
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01, y: loading ? 0 : -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="mt-1 w-full rounded-xl bg-white py-3 text-xs font-bold tracking-[0.22em] text-slate-900 shadow-[0_10px_30px_rgba(255,255,255,0.16)]"
            >
              {loading ? tAdmin("loginLoading") : "ENTER SYSTEM"}
            </motion.button>
          </form>

          {msg ? (
            <p className="mt-4 rounded-lg border border-rose-300/45 bg-rose-500/15 px-3 py-2 text-center text-sm text-rose-100">
              {msg}
            </p>
          ) : null}

          <p className="mt-5 text-center text-xs text-white/45">
            Forgotten?{" "}
            <span className="font-semibold text-cyan-300">Recover Access</span>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-chrome relative overflow-hidden rounded-3xl p-5 md:p-6"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[var(--accent)]/12 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 top-0 h-44 w-44 rounded-full bg-[var(--accent-hot)]/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AtlasLogo size={42} />
            <div>
              <h1 className="text-xl font-semibold text-[var(--fg)] md:text-2xl">Atlas Admin</h1>
              <p className="text-xs text-[var(--muted)] md:text-sm">
                Live monitoring - orders, fraud checks, fulfillment status.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <motion.button
              type="button"
              onClick={() => {
                if (tab === "dash") loadDash();
                else if (tab === "orders") loadOrders();
                else loadMembers();
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="btn-secondary rounded-lg px-3 py-2 text-xs"
            >
              Refresh
            </motion.button>
            <motion.button
              type="button"
              onClick={logout}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="btn-ghost rounded-lg px-3 py-2 text-xs"
            >
              Deconnexion
            </motion.button>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap gap-2">
          {(["dash", "orders", "members"] as const).map((x) => (
            <motion.button
              key={x}
              type="button"
              onClick={() => setTab(x)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 450, damping: 28 }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === x
                  ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hot)] text-slate-900 shadow-[0_10px_26px_-14px_var(--accent-glow)]"
                  : "text-[var(--muted)] hover:bg-[var(--press-bg)]"
              }`}
            >
              {x === "dash"
                ? "Dashboard"
                : x === "orders"
                  ? "Orders"
                  : "Members"}
            </motion.button>
          ))}
        </div>
      </motion.section>

      <AnimatePresence mode="wait">
        {msg ? (
          <motion.p
            key="msg"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-dim)] px-3 py-2 text-sm text-[var(--fg)]"
          >
            {msg}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {tab === "dash" && dash ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[
            { k: `Revenue (${dash.periodDays}j)`, v: `${dash.revenueMad} MAD`, tone: "text-[var(--accent)]" },
            { k: "Orders", v: String(dash.orders), tone: "text-[var(--fg)]" },
            { k: "Customers", v: String(dash.customers), tone: "text-[var(--fg)]" },
            { k: "Fraud Pending", v: String(dash.pendingFraudFlags), tone: "text-amber-200" },
            { k: "Low Stock", v: String(dash.inventoryLow), tone: "text-rose-200" },
            { k: "Conversion", v: `${(dash.conversionRateApprox * 100).toFixed(1)}%`, tone: "text-[var(--accent-hot)]" },
          ].map((item, i) => (
            <motion.div
              key={item.k}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card-chrome rounded-2xl p-4"
            >
              <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{item.k}</p>
              <p className={`mt-2 text-2xl font-semibold ${item.tone}`}>{item.v}</p>
            </motion.div>
          ))}
        </motion.div>
      ) : null}

      {tab === "orders" ? (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-7 space-y-4"
        >
          <div className="card-chrome flex flex-wrap items-center gap-2 rounded-2xl p-3 md:p-4">
            <input
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="Search order number, phone or status..."
              className="checkout-input min-h-11 min-w-[15rem] flex-1 rounded-xl border border-[var(--border)] bg-black/25 px-3 text-sm"
            />
            <select
              value={confirmationFilter}
              onChange={(e) =>
                setConfirmationFilter(
                  e.target.value as "ALL" | "red" | "green" | "blue",
                )
              }
              className="checkout-input min-h-11 rounded-xl border border-[var(--border)] bg-black/25 px-3 text-sm"
            >
              <option value="ALL">All lights</option>
              <option value="green">Green only</option>
              <option value="blue">Blue only</option>
              <option value="red">Red only</option>
            </select>
            <motion.button
              type="button"
              onClick={() => {
                setOrderQuery("");
                setConfirmationFilter("ALL");
              }}
              className="btn-secondary min-h-11 rounded-xl px-3 text-sm"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
            >
              Reset
            </motion.button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ["Blue", toneCounts.blue, "blue"],
              ["Green", toneCounts.green, "green"],
              ["Red", toneCounts.red, "red"],
            ] as const).map(([label, count, tone]) => (
              <div key={label} className="card-chrome rounded-xl p-3">
                <p className="text-xs uppercase tracking-wider text-[var(--muted)]">{label} lights</p>
                <p className="mt-1 text-xl font-semibold text-[var(--fg)]">{count}</p>
                <div className="mt-2 inline-flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${dotToneClass(tone)}`} />
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-black/15">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="sticky top-0 border-b border-[var(--border)] bg-black/45 text-xs uppercase tracking-wider text-[var(--muted)] backdrop-blur">
                <tr>
                  <th className="p-3">Order #</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Confirmation status</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => {
                  const c = confirmationStatusMeta(o.status);
                  return (
                    <tr
                      key={o.id}
                      className="border-b border-[var(--border)]/60 transition hover:bg-white/[0.03]"
                    >
                      <td className="p-3 font-mono text-xs text-[var(--fg)]">{o.orderNumber}</td>
                      <td className="p-3">
                        <span className="rounded-lg border border-[var(--border)] bg-black/20 px-2 py-1 text-xs text-[var(--fg)]">
                          {statusLabel(o.status)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${toneBadgeClass(c.tone)}`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full animate-pulse ${dotToneClass(c.tone)}`} />
                          {c.label}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-[var(--fg)]">{o.totalMad} MAD</td>
                      <td className="p-3 text-xs text-[var(--muted)]">{o.guestPhone}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {o.manualConfirmationRequired ||
                          o.fraudFlags?.some((f) => f.decision === "PENDING") ? (
                            <>
                              <motion.button
                                type="button"
                                className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-200"
                                whileHover={{ scale: 1.04, y: -1 }}
                                whileTap={{ scale: 0.94 }}
                                onClick={() => fraudDecision(o.id, "APPROVED")}
                              >
                                Approve Fraud
                              </motion.button>
                              <motion.button
                                type="button"
                                className="rounded-md bg-rose-500/20 px-2 py-1 text-xs font-medium text-rose-200"
                                whileHover={{ scale: 1.04, y: -1 }}
                                whileTap={{ scale: 0.94 }}
                                onClick={() => fraudDecision(o.id, "REJECTED")}
                              >
                                Reject
                              </motion.button>
                            </>
                          ) : null}
                          <select
                            className="rounded-lg border border-[var(--border)] bg-black/45 px-2 py-1 text-xs"
                            value={o.status}
                            onChange={(e) => setStatus(o.id, e.target.value)}
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {statusLabel(s)}
                              </option>
                            ))}
                          </select>
                          <Link
                            href={`/admin/orders/${o.id}`}
                            className="rounded-md border border-[var(--border)] bg-white/5 px-2 py-1 text-xs font-medium text-[var(--fg)] transition hover:bg-white/10"
                          >
                            View details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredOrders.length === 0 ? (
              <p className="p-6 text-center text-sm text-[var(--muted)]">
                No orders match your filters.
              </p>
            ) : null}
          </div>
        </motion.section>
      ) : null}

      {tab === "members" ? (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-7"
        >
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-black/15">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 border-b border-[var(--border)] bg-black/45 text-xs uppercase tracking-wider text-[var(--muted)] backdrop-blur">
                <tr>
                  <th className="p-3">Member</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Orders</th>
                  <th className="p-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-[var(--border)]/60 transition hover:bg-white/[0.03]"
                  >
                    <td className="p-3 font-medium text-[var(--fg)]">
                      {m.firstName} {m.lastName}
                    </td>
                    <td className="p-3 font-mono text-xs text-[var(--fg)]">
                      {m.phone}
                    </td>
                    <td className="p-3 text-xs text-[var(--muted)]">
                      {m.email ?? "—"}
                    </td>
                    <td className="p-3 tabular-nums text-[var(--fg)]">
                      {new Intl.NumberFormat("en-SA-u-nu-latn", {
                        maximumFractionDigits: 0,
                      }).format(m._count.orders)}
                    </td>
                    <td className="p-3 text-xs text-[var(--muted)]">
                      {new Intl.DateTimeFormat("en-GB", {
                        numberingSystem: "latn",
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(m.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {members.length === 0 ? (
              <p className="p-6 text-center text-sm text-[var(--muted)]">
                No customer accounts yet.
              </p>
            ) : null}
          </div>
        </motion.section>
      ) : null}
    </div>
  );
}
