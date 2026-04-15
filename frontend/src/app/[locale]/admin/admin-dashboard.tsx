"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { AtlasLogo } from "@/components/atlas-logo";
import { clientApiRoot, logApiFailure } from "@/lib/api-config";
import { Link } from "@/i18n/navigation";
import {
  AdminAdvancedAnalytics,
  type AdvancedAnalyticsPayload,
} from "@/components/admin-advanced-analytics";

const TOKEN_KEY = "atlas-admin-jwt";
const ORDER_STATUSES = [
  "PENDING_CONFIRMATION",
  "AWAITING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REJECTED",
] as const;

type ConfirmationTone = "red" | "green" | "blue" | "neutral";

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

type ProductRow = {
  id: string;
  slug: string;
  sku: string;
  nameFr: string;
  nameAr: string;
  priceMad: string;
  compareAtMad: string | null;
  stock: number;
  lowStockThreshold: number;
  purchaseCount: number;
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: { id: string; nameFr: string; slug: string };
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

type AdminTab = "dash" | "orders" | "products" | "members";

const ADMIN_PLACEHOLDERS: Record<
  string,
  { title: string; body: string }
> = {
  upsells: {
    title: "Ventes additionnelles",
    body: "Gérez les suggestions et bundles après panier. Cette section sera branchée sur vos règles de vente croisée.",
  },
  coupons: {
    title: "Coupons",
    body: "Créez et suivez les codes promo (pourcentage ou montant MAD). Bientôt : liste, création et stats d’usage.",
  },
  invoices: {
    title: "Factures",
    body: "Export PDF / numérotation — à connecter à vos commandes et TVA.",
  },
  apps: {
    title: "Applications",
    body: "Intégrations tierces (livraison, compta, marketing).",
  },
  affiliate: {
    title: "Affiliation",
    body: "Suivi des affiliés et commissions — lié au programme déjà prévu côté API.",
  },
  support: {
    title: "Support",
    body: "Centre d’aide interne : tickets et base de connaissances (à venir).",
  },
  settings: {
    title: "Paramètres",
    body: "Préférences boutique, devises, zones, notifications — bientôt ici.",
  },
  insights: {
    title: "Insights",
    body: "Rapports détaillés, trafic et entonnoir — en cours. En attendant, la vue d’ensemble agrège CA et commandes sur la période choisie.",
  },
};

function AdminPlaceholderPanel({
  title,
  body,
  onBack,
}: {
  title: string;
  body: string;
  onBack: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] px-8 py-12 text-center shadow-sm"
    >
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--accent-dim)] text-[var(--accent)]">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </div>
      <h2 className="font-display text-xl font-semibold text-[var(--fg)]">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
      <button
        type="button"
        onClick={onBack}
        className="mt-6 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hot)] px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm"
      >
        Retour au tableau de bord
      </button>
    </motion.div>
  );
}

export function AdminDashboard() {
  const tAdmin = useTranslations("admin");
  const searchParams = useSearchParams();
  const apiRoot = useMemo(() => clientApiRoot(), []);
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<AdminTab>("dash");
  const [sidebarExtra, setSidebarExtra] = useState<{ slug: string } | null>(
    null,
  );
  const [advanced, setAdvanced] = useState<AdvancedAnalyticsPayload | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [members, setMembers] = useState<CustomerRow[]>([]);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [dashboardEditorProductId, setDashboardEditorProductId] = useState<
    string | null
  >(null);
  const [productQuery, setProductQuery] = useState("");
  const [productStatus, setProductStatus] = useState<"all" | "active" | "draft">(
    "all",
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dashRange, setDashRange] = useState<"today" | "7d" | "30d">("30d");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [orderQuery, setOrderQuery] = useState("");
  const [confirmationFilter, setConfirmationFilter] = useState<
    "ALL" | "red" | "green" | "blue"
  >("ALL");

  useEffect(() => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "products") {
      setSidebarExtra(null);
      setTab("products");
    }
    if (t === "orders") {
      setSidebarExtra(null);
      setTab("orders");
    }
  }, [searchParams]);

  const authHeaders = useCallback(
    (): HeadersInit => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token],
  );

  const loadAdvanced = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${apiRoot}/admin/analytics/advanced?range=${dashRange}`, {
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
      setAdvanced(await r.json());
    } catch (e) {
      logApiFailure("admin advanced dashboard", e);
      setMsg(friendlyNetworkError(e));
    }
  }, [apiRoot, token, authHeaders, dashRange]);

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

  const loadProducts = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      params.set("take", "200");
      const q = productQuery.trim();
      if (q) params.set("q", q);
      if (productStatus !== "all") params.set("status", productStatus);
      const r = await fetch(`${apiRoot}/admin/products?${params}`, {
        headers: authHeaders(),
      });
      if (!r.ok) {
        const txt = await r.text();
        setMsg(
          txt && !txt.startsWith("<")
            ? txt
            : process.env.NODE_ENV === "production"
              ? "Erreur API (produits)."
              : "API introuvable — lancez npm run dev.",
        );
        return;
      }
      setProductRows(await r.json());
    } catch (e) {
      logApiFailure("admin products", e);
      setMsg(friendlyNetworkError(e));
    }
  }, [apiRoot, token, authHeaders, productQuery, productStatus]);

  useEffect(() => {
    if (!token) return;
    setMsg(null);
    if (tab === "dash") loadAdvanced();
    else if (tab === "orders") loadOrders();
    else if (tab === "members") loadMembers();
  }, [token, tab, loadAdvanced, loadOrders, loadMembers]);

  useEffect(() => {
    if (!token || tab !== "dash") return;
    const id = window.setInterval(() => {
      void loadAdvanced();
    }, 15000);
    return () => window.clearInterval(id);
  }, [token, tab, loadAdvanced]);

  useEffect(() => {
    if (!token || tab !== "products") return;
    setMsg(null);
    const delay = productQuery.trim() ? 360 : 0;
    const id = setTimeout(() => {
      void loadProducts();
    }, delay);
    return () => clearTimeout(id);
  }, [token, tab, productQuery, productStatus, loadProducts]);

  const patchProduct = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      setMsg(null);
      try {
        const r = await fetch(`${apiRoot}/admin/products/${id}`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        if (!r.ok) setMsg(await r.text());
        else await loadProducts();
      } catch (e) {
        logApiFailure("admin patch product", e);
        setMsg(friendlyNetworkError(e));
      }
    },
    [apiRoot, authHeaders, loadProducts],
  );

  const removeProduct = useCallback(
    async (id: string, displayName: string) => {
      const ok = window.confirm(
        `Delete “${displayName}”? This cannot be undone.\n\nIf this product was ever ordered, deletion will be blocked — use Draft (inactive) to hide it instead.`,
      );
      if (!ok) return;
      setMsg(null);
      try {
        const r = await fetch(`${apiRoot}/admin/products/${id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        const txt = await r.text();
        if (!r.ok) {
          const parsed = nestErrorMessage(txt) ?? txt.slice(0, 500);
          setMsg(parsed);
          return;
        }
        setMsg("Product deleted.");
        await loadProducts();
      } catch (e) {
        logApiFailure("admin delete product", e);
        setMsg(friendlyNetworkError(e));
      }
    },
    [apiRoot, authHeaders, loadProducts],
  );

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
    setAdvanced(null);
    setOrders([]);
    setMembers([]);
    setProductRows([]);
    setDashboardEditorProductId(null);
    setSidebarExtra(null);
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

  const tabTitle = sidebarExtra
    ? ADMIN_PLACEHOLDERS[sidebarExtra.slug]?.title ?? "Section"
    : tab === "dash"
      ? "Vue d’ensemble"
      : tab === "orders"
        ? "Commandes"
        : tab === "products"
          ? "Produits"
          : "Clients";

  const navBtn = (
    active: boolean,
    content: ReactNode,
    props: ComponentProps<typeof motion.button>,
  ) => (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
        active
          ? "border-l-2 border-[var(--accent)] bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
          : "border-l-2 border-transparent text-slate-300/90 hover:bg-white/5 hover:text-white"
      }`}
      {...props}
    >
      {content}
    </motion.button>
  );

  const NavButtons = ({ onPick }: { onPick?: () => void }) => {
    const ic = (active: boolean) => (active ? "text-[var(--accent)]" : "text-slate-400");
    const goTab = (t: AdminTab) => {
      setSidebarExtra(null);
      setTab(t);
      onPick?.();
    };
    const goSoon = (slug: string) => {
      setSidebarExtra({ slug });
      onPick?.();
    };
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <nav className="space-y-0.5 px-2 py-2">
          {navBtn(
            !sidebarExtra && tab === "dash",
            <>
              <svg className={ic(!sidebarExtra && tab === "dash")} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Tableau de bord
            </>,
            { onClick: () => goTab("dash") },
          )}
          {navBtn(
            !sidebarExtra && tab === "orders",
            <>
              <svg className={ic(!sidebarExtra && tab === "orders")} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              Commandes
            </>,
            { onClick: () => goTab("orders") },
          )}
          {navBtn(
            !sidebarExtra && tab === "products",
            <>
              <svg className={ic(!sidebarExtra && tab === "products")} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              Produits
            </>,
            { onClick: () => goTab("products") },
          )}
          {navBtn(
            sidebarExtra?.slug === "upsells",
            <>
              <svg className={ic(sidebarExtra?.slug === "upsells")} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="m18 15-6-6-6 6" />
                <path d="m18 9-6-6-6 6" />
              </svg>
              Ventes additionnelles
            </>,
            { onClick: () => goSoon("upsells") },
          )}
          {navBtn(
            sidebarExtra?.slug === "coupons",
            <>
              <svg className={ic(sidebarExtra?.slug === "coupons")} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M2.5 8.5 8.5 2.5" />
                <path d="M14 2 2 14" />
                <path d="M21.5 15.5 15.5 21.5" />
                <path d="M22 10 10 22" />
                <path d="M8.5 2.5 12 6l-4 4L2.5 8.5z" />
                <path d="M15.5 15.5 19 19l-4 4-2.5-4.5z" />
              </svg>
              Coupons
            </>,
            { onClick: () => goSoon("coupons") },
          )}
          {navBtn(
            !sidebarExtra && tab === "members",
            <>
              <svg className={ic(!sidebarExtra && tab === "members")} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Clients
            </>,
            { onClick: () => goTab("members") },
          )}
          <Link
            href="/shop"
            onClick={() => onPick?.()}
            className="flex w-full items-center gap-3 rounded-xl border-l-2 border-transparent px-3 py-2.5 text-left text-sm font-medium text-slate-300/90 transition hover:bg-white/5 hover:text-white"
          >
            <svg className="text-slate-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 9 12 2l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
              <path d="M9 22V12h6v10" />
            </svg>
            Boutique (site)
          </Link>
        </nav>
        <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Analyse
        </p>
        <nav className="space-y-0.5 px-2 pb-2">
          {navBtn(
            sidebarExtra?.slug === "insights",
            <>
              <svg className={ic(sidebarExtra?.slug === "insights")} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M3 3v18h18" />
                <path d="M18 17V9" />
                <path d="M13 17V5" />
                <path d="M8 17v-3" />
              </svg>
              Insights
            </>,
            { onClick: () => goSoon("insights") },
          )}
          {navBtn(
            sidebarExtra?.slug === "invoices",
            <>
              <svg className={ic(sidebarExtra?.slug === "invoices")} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
              Factures
            </>,
            { onClick: () => goSoon("invoices") },
          )}
          {navBtn(
            sidebarExtra?.slug === "apps",
            <>
              <svg className={ic(sidebarExtra?.slug === "apps")} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Apps
            </>,
            { onClick: () => goSoon("apps") },
          )}
        </nav>

        <div className="mx-2 my-3 space-y-2 border-y border-white/10 py-3">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Actions rapides
          </p>
          <motion.button
            type="button"
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              setSidebarExtra(null);
              setTab("orders");
              setConfirmationFilter("blue");
              onPick?.();
            }}
            className="relative w-full rounded-xl bg-slate-700/80 px-3 py-2.5 text-left text-xs font-semibold text-white shadow-sm ring-1 ring-white/10 hover:bg-slate-600/90"
          >
            <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-md bg-amber-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200">
              New
            </span>
            File de confirmation
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              setSidebarExtra(null);
              setTab("orders");
              setConfirmationFilter("green");
              onPick?.();
            }}
            className="relative w-full rounded-xl bg-slate-700/80 px-3 py-2.5 text-left text-xs font-semibold text-white shadow-sm ring-1 ring-white/10 hover:bg-slate-600/90"
          >
            <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-md bg-amber-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200">
              New
            </span>
            Expéditions / livrées
          </motion.button>
        </div>

        <nav className="mt-auto space-y-0.5 border-t border-white/10 px-2 py-3">
          {navBtn(
            sidebarExtra?.slug === "affiliate",
            <>
              <svg className={ic(sidebarExtra?.slug === "affiliate")} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="m8.59 13.51 6.83 3.98" />
                <path d="m15.41 6.51-6.82 3.98" />
              </svg>
              Affiliation
            </>,
            { onClick: () => goSoon("affiliate") },
          )}
          {navBtn(
            sidebarExtra?.slug === "support",
            <>
              <svg className={ic(sidebarExtra?.slug === "support")} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h3" />
                <path d="M21 11h-3a2 2 0 0 0-2-2V6a2 2 0 0 0-2-2H9" />
              </svg>
              Support
            </>,
            { onClick: () => goSoon("support") },
          )}
          {navBtn(
            sidebarExtra?.slug === "settings",
            <>
              <svg className={ic(sidebarExtra?.slug === "settings")} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
              Paramètres
            </>,
            { onClick: () => goSoon("settings") },
          )}
        </nav>
      </div>
    );
  };

  return (
    <div className="flex min-h-dvh flex-col gap-3 px-3 py-3 md:flex-row md:gap-0 md:px-4 md:py-4">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Fermer le menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,90vw)] max-h-dvh -translate-x-full flex-col border border-slate-700/80 bg-gradient-to-b from-slate-900 via-slate-900 to-[#0f172a] text-slate-100 shadow-2xl transition-transform duration-200 md:static md:z-0 md:max-h-[min(100dvh-2rem,56rem)] md:w-56 md:translate-x-0 md:rounded-2xl md:shadow-xl lg:w-60 ${
          mobileNavOpen ? "translate-x-0" : ""
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-3 md:px-4 md:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fffdf9]/95 shadow-sm">
              <AtlasLogo size={24} />
            </div>
            <div className="min-w-0">
              <p className="font-display truncate text-base font-semibold tracking-tight text-white">
                Easy Handles
              </p>
              <p className="truncate text-[10px] uppercase tracking-[0.14em] text-slate-400">
                Admin
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 md:hidden"
            aria-label="Fermer"
            onClick={() => setMobileNavOpen(false)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <NavButtons onPick={() => setMobileNavOpen(false)} />
        <div className="shrink-0 space-y-1 border-t border-white/10 p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Voir la boutique
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-200/90 hover:bg-rose-500/15"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_12px_40px_-24px_rgba(60,30,15,0.35)] md:ml-3 md:rounded-3xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_92%,var(--accent-dim))] px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--fg)] shadow-sm md:hidden"
              aria-label="Menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-semibold text-[var(--fg)] md:text-xl">
                {tabTitle}
              </h1>
              <p className="truncate text-xs text-[var(--muted)]">{tAdmin("title")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <motion.button
              type="button"
              onClick={() => {
                setSidebarExtra(null);
                if (tab === "dash") loadAdvanced();
                else if (tab === "orders") loadOrders();
                else if (tab === "members") loadMembers();
                else void loadProducts();
              }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-semibold text-[var(--fg)] shadow-sm hover:bg-[var(--accent-dim)]"
            >
              Actualiser
            </motion.button>
            <motion.button
              type="button"
              onClick={logout}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="hidden rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hot)] px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm sm:inline-flex"
            >
              Déconnexion
            </motion.button>
          </div>
        </header>

        <div className="flex-1 overflow-auto px-4 py-5 md:px-6">
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

      {sidebarExtra ? (
        <AdminPlaceholderPanel
          title={
            ADMIN_PLACEHOLDERS[sidebarExtra.slug]?.title ?? "Bientôt disponible"
          }
          body={
            ADMIN_PLACEHOLDERS[sidebarExtra.slug]?.body ??
            "Cette section sera ajoutée dans une prochaine version."
          }
          onBack={() => {
            setSidebarExtra(null);
            setTab("dash");
          }}
        />
      ) : (
        <>
      {tab === "dash" ? (
        advanced ? (
          <AdminAdvancedAnalytics
            data={advanced}
            range={dashRange}
            onChangeRange={setDashRange}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--accent-dim)]" />
            ))}
          </div>
        )
      ) : null}

      {tab === "orders" ? (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="card-chrome flex flex-wrap items-center gap-2 rounded-2xl p-3 md:p-4">
            <input
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="Search order number, phone or status..."
              className="checkout-input min-h-11 min-w-[15rem] flex-1 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_96%,var(--accent-dim))] px-3 text-sm"
            />
            <select
              value={confirmationFilter}
              onChange={(e) =>
                setConfirmationFilter(
                  e.target.value as "ALL" | "red" | "green" | "blue",
                )
              }
              className="checkout-input min-h-11 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_96%,var(--accent-dim))] px-3 text-sm"
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

          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="sticky top-0 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,var(--muted)_12%)] text-xs uppercase tracking-wider text-[var(--muted)] backdrop-blur">
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
                      className="border-b border-[var(--border)]/60 transition hover:bg-[var(--accent-dim)]"
                    >
                      <td className="p-3 font-mono text-xs text-[var(--fg)]">{o.orderNumber}</td>
                      <td className="p-3">
                        <span className="rounded-lg border border-[var(--border)] bg-[var(--press-bg)] px-2 py-1 text-xs text-[var(--fg)]">
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
                            className="rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,var(--muted)_12%)] px-2 py-1 text-xs"
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

      {tab === "products" ? (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--fg)]">
                All products
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {productRows.length} shown · search by title, SKU, or handle
              </p>
            </div>
            <Link
              href="/admin/products/new"
              className="rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hot)] px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_10px_26px_-14px_var(--accent-glow)]"
            >
              Add product
            </Link>
          </div>

          <div className="card-chrome flex flex-wrap items-center gap-2 rounded-2xl p-3 md:p-4">
            <input
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Filter products…"
              className="checkout-input min-h-11 min-w-[14rem] flex-1 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_96%,var(--accent-dim))] px-3 text-sm"
              aria-label="Filter products"
            />
            <select
              value={productStatus}
              onChange={(e) =>
                setProductStatus(e.target.value as "all" | "active" | "draft")
              }
              className="checkout-input min-h-11 rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_96%,var(--accent-dim))] px-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft (inactive)</option>
            </select>
            <motion.button
              type="button"
              onClick={() => {
                setProductQuery("");
                setProductStatus("all");
              }}
              className="btn-secondary min-h-11 rounded-xl px-3 text-sm"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
            >
              Reset
            </motion.button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="sticky top-0 z-[1] border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_85%,var(--muted)_15%)] text-xs uppercase tracking-wider text-[var(--muted)] backdrop-blur">
                <tr>
                  <th className="p-3 pl-4">Product</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Inventory</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Variants</th>
                  <th className="p-3">Sales</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3">Edit</th>
                  <th className="p-3">Delete</th>
                  <th className="p-3 pr-4">Store</th>
                </tr>
              </thead>
              <tbody>
                {productRows.map((p) => {
                  const thumb = p.images[0];
                  const low =
                    p.stock <= p.lowStockThreshold && p.isActive;
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-[var(--border)]/60 transition hover:bg-[var(--accent-dim)]"
                    >
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--press-bg)]">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={thumb}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--muted)]">
                                —
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[var(--fg)]">
                              {p.nameFr}
                            </p>
                            <p className="truncate text-xs text-[var(--muted)]">
                              {p.category.nameFr} ·{" "}
                              <span className="font-mono">{p.slug}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 align-middle">
                        <select
                          className="rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,var(--muted)_12%)] px-2 py-1.5 text-xs"
                          value={p.isActive ? "active" : "draft"}
                          onChange={(e) => {
                            const active = e.target.value === "active";
                            if (active !== p.isActive) {
                              void patchProduct(p.id, { isActive: active });
                            }
                          }}
                        >
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                        </select>
                      </td>
                      <td className="p-3 align-middle">
                        <div className="flex flex-col gap-1">
                          <input
                            type="number"
                            min={0}
                            defaultValue={p.stock}
                            key={`${p.id}-stock-${p.stock}`}
                            className="w-24 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,var(--muted)_12%)] px-2 py-1.5 text-xs tabular-nums text-[var(--fg)]"
                            onBlur={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (Number.isNaN(v) || v < 0) return;
                              if (v !== p.stock)
                                void patchProduct(p.id, { stock: v });
                            }}
                          />
                          {low ? (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-amber-300/90">
                              Low stock
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-3 align-middle font-mono text-xs text-[var(--fg)]">
                        {p.sku}
                      </td>
                      <td className="p-3 align-middle">
                        <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={p.priceMad}
                          key={`${p.id}-price-${p.priceMad}`}
                          className="w-[6.5rem] rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,var(--muted)_12%)] px-2 py-1.5 text-xs tabular-nums text-[var(--fg)]"
                          onBlur={(e) => {
                            const raw = e.target.value.trim().replace(",", ".");
                            if (raw === p.priceMad) return;
                            if (!/^\d+(\.\d{1,2})?$/.test(raw)) return;
                            void patchProduct(p.id, { priceMad: raw });
                          }}
                        />
                        <span className="ml-1 text-xs text-[var(--muted)]">
                          MAD
                        </span>
                      </td>
                      <td className="p-3 align-middle">
                        <button
                          type="button"
                          onClick={() => setDashboardEditorProductId(p.id)}
                          className="inline-flex rounded-md border border-[var(--border)] bg-white/5 px-2 py-1 text-xs font-medium text-[var(--fg)] transition hover:bg-white/10"
                        >
                          Manage variants
                        </button>
                      </td>
                      <td className="p-3 align-middle tabular-nums text-[var(--fg)]">
                        {new Intl.NumberFormat("en-SA-u-nu-latn", {
                          maximumFractionDigits: 0,
                        }).format(p.purchaseCount)}
                      </td>
                      <td className="p-3 align-middle text-xs text-[var(--muted)]">
                        {new Intl.DateTimeFormat("en-GB", {
                          numberingSystem: "latn",
                          dateStyle: "medium",
                        }).format(new Date(p.updatedAt))}
                      </td>
                      <td className="p-3 align-middle">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="inline-flex rounded-md border border-[var(--border)] bg-white/5 px-2 py-1 text-xs font-medium text-[var(--fg)] transition hover:bg-white/10"
                        >
                          Edit
                        </Link>
                      </td>
                      <td className="p-3 align-middle">
                        <motion.button
                          type="button"
                          onClick={() => removeProduct(p.id, p.nameFr)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="rounded-md border border-rose-500/45 bg-rose-500/15 px-2 py-1 text-xs font-medium text-rose-200"
                        >
                          Delete
                        </motion.button>
                      </td>
                      <td className="p-3 pr-4 align-middle">
                        <Link
                          href={`/product/${p.slug}`}
                          className="inline-flex rounded-md border border-[var(--border)] bg-white/5 px-2 py-1 text-xs font-medium text-[var(--fg)] transition hover:bg-white/10"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {productRows.length === 0 ? (
              <p className="p-6 text-center text-sm text-[var(--muted)]">
                No products match your filters.
              </p>
            ) : null}
          </div>
        </motion.section>
      ) : null}

      {tab === "members" ? (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,var(--muted)_12%)] text-xs uppercase tracking-wider text-[var(--muted)] backdrop-blur">
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
                    className="border-b border-[var(--border)]/60 transition hover:bg-[var(--accent-dim)]"
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
      <AnimatePresence>
        {dashboardEditorProductId ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/55 p-3 md:p-6"
          >
            <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--fg)]">
                    Product editor (variants, colors, sizes)
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    Save inside the editor, then close this panel.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/products/${dashboardEditorProductId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--fg)] transition hover:bg-white/10"
                  >
                    Open in new tab
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setDashboardEditorProductId(null);
                      void loadProducts();
                    }}
                    className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--fg)] transition hover:bg-white/10"
                  >
                    Close
                  </button>
                </div>
              </div>
              <iframe
                title="Dashboard product editor"
                src={`/admin/products/${dashboardEditorProductId}`}
                className="h-full w-full border-0"
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
        </>
      )}
        </div>
      </div>
    </div>
  );
}
