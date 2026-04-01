"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useRouter } from "@/i18n/navigation";
import { clientApiRoot } from "@/lib/api-config";

const TOKEN_KEY = "atlas-admin-jwt";

type OrderDetails = {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  guestEmail: string | null;
  guestPhone: string;
  subtotalMad: string;
  shippingMad: string;
  totalMad: string;
  shippingAddress: unknown;
  createdAt: string;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    unitPriceMad: string;
    titleSnapshot: string;
    product: {
      id: string;
      nameFr: string;
      nameAr: string;
    };
  }>;
};

type ShippingAddressShape = {
  firstName?: string;
  lastName?: string;
  line1?: string;
  quarter?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
};

function asMoney(value: string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return value;
  return num.toFixed(2);
}

function statusBadgeClass(status: string): string {
  if (status === "DELIVERED") return "border-emerald-300/35 bg-emerald-500/15 text-emerald-200";
  if (status === "SHIPPED") return "border-sky-300/35 bg-sky-500/15 text-sky-200";
  if (status === "PROCESSING" || status === "AWAITING_PAYMENT") {
    return "border-amber-300/35 bg-amber-500/15 text-amber-200";
  }
  if (status === "REJECTED" || status === "CANCELLED") {
    return "border-rose-300/35 bg-rose-500/15 text-rose-200";
  }
  return "border-zinc-300/35 bg-zinc-500/15 text-zinc-200";
}

function statusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function paymentLabel(paymentMethod: string): string {
  if (paymentMethod === "CASH_ON_DELIVERY") return "COD";
  return "Card";
}

function parseAddress(raw: unknown): ShippingAddressShape {
  if (!raw || typeof raw !== "object") return {};
  return raw as ShippingAddressShape;
}

function formatOrderDate(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  const date = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${date} - ${time}`;
}

export function AdminOrderDetailsClient({ orderId }: { orderId: string }) {
  const apiRoot = useMemo(() => clientApiRoot(), []);
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const loadOrder = useCallback(
    async (jwt: string) => {
      setLoading(true);
      setMsg(null);
      try {
        const r = await fetch(`${apiRoot}/admin/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${jwt}`,
            "Content-Type": "application/json",
          },
        });
        if (!r.ok) {
          setMsg("Unable to load order details.");
          return;
        }
        const data = (await r.json()) as OrderDetails;
        setOrder(data);
      } catch {
        setMsg("Network error while loading order details.");
      } finally {
        setLoading(false);
      }
    },
    [apiRoot, orderId],
  );

  useEffect(() => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (!t) {
      router.push("/admin");
      return;
    }
    setToken(t);
    loadOrder(t);
  }, [loadOrder, router]);

  async function updateStatus(status: "PROCESSING" | "DELIVERED") {
    if (!token) return;
    setMsg(null);
    const r = await fetch(`${apiRoot}/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) {
      setMsg("Unable to update order status.");
      return;
    }
    await loadOrder(token);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-[var(--muted)]">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="rounded-xl border border-rose-300/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {msg ?? "Order not found."}
        </p>
      </div>
    );
  }

  const addr = parseAddress(order.shippingAddress);
  const customerName =
    `${order.user?.firstName ?? addr.firstName ?? ""} ${order.user?.lastName ?? addr.lastName ?? ""}`.trim() ||
    "Guest customer";
  const customerPhone = order.user?.phone || addr.phone || order.guestPhone || "-";
  const customerEmail = order.user?.email || addr.email || order.guestEmail || "-";
  const addressLine = [addr.line1, addr.quarter].filter(Boolean).join(", ") || "-";
  const city = addr.city || "-";

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Order details</p>
          <h1 className="text-xl font-semibold text-[var(--fg)] md:text-2xl">
            {order.orderNumber}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-sm text-[var(--fg)] transition hover:bg-white/10"
          >
            Back to admin
          </Link>
          <motion.button
            type="button"
            onClick={() => updateStatus("PROCESSING")}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-lg bg-amber-500/20 px-3 py-2 text-sm font-medium text-amber-200"
          >
            Mark as confirmed
          </motion.button>
          <motion.button
            type="button"
            onClick={() => updateStatus("DELIVERED")}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-200"
          >
            Mark as delivered
          </motion.button>
        </div>
      </div>

      {msg ? (
        <p className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-dim)] px-4 py-3 text-sm text-[var(--fg)]">
          {msg}
        </p>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="card-chrome rounded-2xl p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Customer info
          </h2>
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-[var(--fg)]">
              <span className="text-[var(--muted)]">Full name:</span> {customerName}
            </p>
            <p className="text-[var(--fg)]">
              <span className="text-[var(--muted)]">Phone:</span> {customerPhone}
            </p>
            <p className="text-[var(--fg)]">
              <span className="text-[var(--muted)]">Email:</span> {customerEmail}
            </p>
            <p className="text-[var(--fg)]">
              <span className="text-[var(--muted)]">Address:</span> {addressLine}
            </p>
            <p className="text-[var(--fg)]">
              <span className="text-[var(--muted)]">City:</span> {city}
            </p>
          </div>
        </article>

        <article className="card-chrome rounded-2xl p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Order info
          </h2>
          <div className="mt-3 space-y-2 text-sm">
            <p className="text-[var(--fg)]">
              <span className="text-[var(--muted)]">Order ID:</span> {order.id}
            </p>
            <p className="text-[var(--fg)]">
              <span className="text-[var(--muted)]">Date:</span> {formatOrderDate(order.createdAt)}
            </p>
            <p className="text-[var(--fg)]">
              <span className="text-[var(--muted)]">Status:</span>{" "}
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusBadgeClass(order.status)}`}>
                {statusLabel(order.status)}
              </span>
            </p>
            <p className="text-[var(--fg)]">
              <span className="text-[var(--muted)]">Payment:</span> {paymentLabel(order.paymentMethod)}
            </p>
          </div>
        </article>
      </section>

      <section className="card-chrome rounded-2xl p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Products
        </h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)] bg-black/10">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Price</th>
                <th className="p-3">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => {
                const subtotal = Number(item.unitPriceMad) * item.quantity;
                return (
                  <tr key={item.id} className="border-b border-[var(--border)]/60 last:border-b-0">
                    <td className="p-3 text-[var(--fg)]">{item.titleSnapshot || item.product.nameFr}</td>
                    <td className="p-3 text-[var(--fg)]">{item.quantity}</td>
                    <td className="p-3 text-[var(--fg)]">{asMoney(item.unitPriceMad)} MAD</td>
                    <td className="p-3 font-medium text-[var(--fg)]">{subtotal.toFixed(2)} MAD</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card-chrome rounded-2xl p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Summary
        </h2>
        <div className="mt-3 grid gap-2 text-sm">
          <p className="flex items-center justify-between text-[var(--fg)]">
            <span className="text-[var(--muted)]">Total price</span>
            <span>{asMoney(order.subtotalMad)} MAD</span>
          </p>
          <p className="flex items-center justify-between text-[var(--fg)]">
            <span className="text-[var(--muted)]">Delivery fee</span>
            <span>{asMoney(order.shippingMad)} MAD</span>
          </p>
          <p className="mt-1 flex items-center justify-between border-t border-[var(--border)] pt-2 text-base font-semibold text-[var(--fg)]">
            <span>Final total</span>
            <span>{asMoney(order.totalMad)} MAD</span>
          </p>
        </div>
      </section>
    </div>
  );
}

