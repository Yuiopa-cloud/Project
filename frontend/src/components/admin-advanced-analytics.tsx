"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

type Level = "info" | "warning" | "critical";

export type AdvancedAnalyticsPayload = {
  range: {
    mode: "today" | "7d" | "30d" | "custom";
    from: string;
    to: string;
  };
  lastUpdatedAt: string;
  kpis: {
    revenueToday: number;
    revenue7d: number;
    revenue30d: number;
    profitMad: number;
    conversionRate: number;
    averageOrderValueMad: number;
    ordersPerHour: number;
    clvMad: number;
    repeatCustomerRate: number;
  };
  charts: {
    revenueOverTime: Array<{ ts: string; value: number }>;
    ordersOverTime: Array<{ ts: string; value: number }>;
    funnel: { visitors: number; addToCart: number; checkout: number; purchase: number };
    topProducts: Array<{
      productId: string;
      name: string;
      image: string;
      revenue: number;
      units: number;
      trendPct: number;
    }>;
    variantPerformance: Array<{
      key: string;
      label: string;
      revenue: number;
      units: number;
    }>;
  };
  orderTracking: Array<{
    id: string;
    orderNumber: string;
    status: string;
    customer: { name: string; phone: string; email: string | null; city: string };
    items: Array<{ productName: string; variant: string; quantity: number }>;
    timestamps: {
      placedAt: string;
      confirmedAt: string | null;
      processingAt: string | null;
      shippedAt: string | null;
      deliveredAt: string | null;
      cancelledAt: string | null;
      returnedAt: string | null;
      currentStatusAt: string;
    };
    durations: { totalMinutes: number; totalHours: number };
  }>;
  alerts: Array<{ level: Level; title: string; message: string }>;
  insights: string[];
  customers: {
    newVsReturning: { newCustomers: number; returningCustomers: number };
    topCustomers: Array<{
      id: string;
      name: string;
      phone: string;
      email: string | null;
      orders: number;
      spendMad: number;
    }>;
    ordersPerCustomer: number;
    geography: Array<{ city: string; orders: number }>;
  };
};

function tone(level: Level): string {
  if (level === "critical") return "border-rose-500/40 bg-rose-500/10 text-rose-100";
  if (level === "warning") return "border-amber-500/40 bg-amber-500/10 text-amber-100";
  return "border-sky-500/40 bg-sky-500/10 text-sky-100";
}

function fmtMad(n: number): string {
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} MAD`;
}

function MiniLineChart({
  title,
  points,
  colorClass,
}: {
  title: string;
  points: Array<{ ts: string; value: number }>;
  colorClass: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = useMemo(() => Math.max(1, ...points.map((p) => p.value)), [points]);
  const h = 180;
  const w = 520;
  const path = useMemo(() => {
    if (!points.length) return "";
    return points
      .map((p, i) => {
        const x = (i / Math.max(1, points.length - 1)) * (w - 24) + 12;
        const y = h - 14 - (p.value / max) * (h - 28);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }, [points, max]);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-sm font-semibold text-[var(--fg)]">{title}</p>
      <div className="relative mt-3">
        <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full">
          <path d={path} fill="none" className={colorClass} strokeWidth="3" strokeLinecap="round" />
          {points.map((p, i) => {
            const x = (i / Math.max(1, points.length - 1)) * (w - 24) + 12;
            const y = h - 14 - (p.value / max) * (h - 28);
            return (
              <circle
                key={`${p.ts}-${i}`}
                cx={x}
                cy={y}
                r={hover === i ? 5 : 3}
                className={colorClass}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>
        {hover != null && points[hover] ? (
          <div className="absolute right-2 top-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--fg)] shadow">
            <div>{new Date(points[hover].ts).toLocaleString()}</div>
            <div className="font-semibold">{points[hover].value.toLocaleString()}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminAdvancedAnalytics({
  data,
  range,
  onChangeRange,
}: {
  data: AdvancedAnalyticsPayload;
  range: "today" | "7d" | "30d";
  onChangeRange: (next: "today" | "7d" | "30d") => void;
}) {
  const k = data.kpis;
  const topVariant = data.charts.variantPerformance[0];
  const weakVariant = data.charts.variantPerformance[data.charts.variantPerformance.length - 1];
  const funnel = data.charts.funnel;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-[var(--fg)]">
            Advanced Analytics & Tracking
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Last updated {new Date(data.lastUpdatedAt).toLocaleTimeString()} · Auto refresh enabled
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--press-bg)] p-1">
          {([
            ["today", "Today"],
            ["7d", "7d"],
            ["30d", "30d"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onChangeRange(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                range === key
                  ? "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hot)] text-slate-900"
                  : "text-[var(--muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Revenue (Today)", fmtMad(k.revenueToday)],
          ["Revenue (7d)", fmtMad(k.revenue7d)],
          ["Revenue (30d)", fmtMad(k.revenue30d)],
          ["Profit", fmtMad(k.profitMad)],
          ["Conversion", `${(k.conversionRate * 100).toFixed(2)}%`],
          ["Average order value", fmtMad(k.averageOrderValueMad)],
          ["Orders / hour", k.ordersPerHour.toFixed(2)],
          ["CLV", fmtMad(k.clvMad)],
          ["Repeat customers", `${(k.repeatCustomerRate * 100).toFixed(1)}%`],
        ].map(([name, value]) => (
          <div key={name} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-[11px] uppercase tracking-wide text-[var(--muted)]">{name}</p>
            <p className="mt-1 text-xl font-semibold text-[var(--fg)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MiniLineChart
          title="Revenue over time"
          points={data.charts.revenueOverTime}
          colorClass="stroke-emerald-400 fill-emerald-400"
        />
        <MiniLineChart
          title="Orders over time"
          points={data.charts.ordersOverTime}
          colorClass="stroke-sky-400 fill-sky-400"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 lg:col-span-1">
          <p className="text-sm font-semibold text-[var(--fg)]">Conversion funnel</p>
          {[
            ["Visitors", funnel.visitors],
            ["Add to cart", funnel.addToCart],
            ["Checkout", funnel.checkout],
            ["Purchase", funnel.purchase],
          ].map(([label, value], i) => (
            <div key={label} className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-[var(--muted)]">{label}</span>
                <span className="font-semibold text-[var(--fg)]">{value.toLocaleString()}</span>
              </div>
              <div className="h-2 rounded-full bg-black/15">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hot)]"
                  style={{
                    width: `${Math.max(
                      6,
                      Math.min(100, ((Number(value) || 0) / Math.max(1, funnel.visitors)) * 100),
                    )}%`,
                    opacity: 1 - i * 0.08,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 lg:col-span-2">
          <p className="text-sm font-semibold text-[var(--fg)]">Top products</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.charts.topProducts.slice(0, 6).map((p) => (
              <div key={p.productId} className="rounded-xl border border-[var(--border)] bg-white/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 overflow-hidden rounded-lg border border-[var(--border)] bg-black/10">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--fg)]">{p.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {p.units} units · {fmtMad(p.revenue)}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ${p.trendPct >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {p.trendPct >= 0 ? "▲" : "▼"} {Math.abs(p.trendPct).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm font-semibold text-[var(--fg)]">Variant analytics</p>
          <div className="mt-3 space-y-2">
            {data.charts.variantPerformance.slice(0, 8).map((v) => (
              <div key={v.key} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                <p className="truncate text-sm text-[var(--fg)]">{v.label}</p>
                <p className="text-xs text-[var(--muted)]">
                  {v.units} units · {fmtMad(v.revenue)}
                </p>
              </div>
            ))}
          </div>
          {topVariant && weakVariant ? (
            <p className="mt-3 text-xs text-[var(--muted)]">
              Best: <span className="font-semibold text-emerald-300">{topVariant.label}</span> · Worst:{" "}
              <span className="font-semibold text-rose-300">{weakVariant.label}</span>
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm font-semibold text-[var(--fg)]">Insights engine</p>
          <div className="mt-3 space-y-2">
            {data.insights.map((insight, i) => (
              <div key={`${insight}-${i}`} className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-sm text-[var(--fg)]">
                {insight}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 lg:col-span-2">
          <p className="text-sm font-semibold text-[var(--fg)]">Real-time order lifecycle tracking</p>
          <div className="mt-3 max-h-72 overflow-auto space-y-2">
            {data.orderTracking.map((o) => (
              <div key={o.id} className="rounded-xl border border-[var(--border)] bg-white/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--fg)]">{o.orderNumber}</p>
                  <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    {o.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {o.customer.name} · {o.customer.phone} · {o.customer.city}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {o.items[0]?.productName ?? "No items"} ({o.items[0]?.variant ?? "Default"}) ·{" "}
                  {o.durations.totalHours.toFixed(2)}h in lifecycle
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm font-semibold text-[var(--fg)]">Alerts</p>
          <div className="mt-3 space-y-2">
            {data.alerts.length ? (
              data.alerts.map((a, i) => (
                <div key={`${a.title}-${i}`} className={`rounded-lg border px-3 py-2 text-sm ${tone(a.level)}`}>
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-xs opacity-90">{a.message}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--muted)]">No critical alerts right now.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm font-semibold text-[var(--fg)]">Customer analytics</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            New: {data.customers.newVsReturning.newCustomers} · Returning:{" "}
            {data.customers.newVsReturning.returningCustomers} · Orders / customer:{" "}
            {data.customers.ordersPerCustomer.toFixed(2)}
          </p>
          <div className="mt-3 space-y-2">
            {data.customers.topCustomers.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                <span className="text-sm text-[var(--fg)]">{c.name}</span>
                <span className="text-xs text-[var(--muted)]">
                  {c.orders} orders · {fmtMad(c.spendMad)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm font-semibold text-[var(--fg)]">Geographic distribution</p>
          <div className="mt-3 space-y-2">
            {data.customers.geography.map((g) => (
              <div key={g.city} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                <span className="text-[var(--fg)]">{g.city}</span>
                <span className="text-[var(--muted)]">{g.orders} orders</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
