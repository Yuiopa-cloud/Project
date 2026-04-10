"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useRouter } from "@/i18n/navigation";
import { AtlasLogo } from "@/components/atlas-logo";
import { clientApiRoot, logApiFailure } from "@/lib/api-config";
import { compressImageFile } from "@/lib/admin-image-compress";

const TOKEN_KEY = "atlas-admin-jwt";

type CategoryRow = {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
};

type AdminProductDetail = {
  id: string;
  slug: string;
  sku: string;
  nameFr: string;
  nameAr: string;
  descriptionFr: string;
  descriptionAr: string;
  priceMad: string;
  compareAtMad: string | null;
  stock: number;
  images: string[];
  isActive: boolean;
  categoryId: string;
  category: { id: string; nameFr: string; slug: string };
};

function friendlyNetworkError(err: unknown): string {
  if (!(err instanceof Error)) return "Network error.";
  const m = err.message.toLowerCase();
  if (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("load failed")
  ) {
    return "Cannot reach the API. Check that the backend is running and CORS/proxy is configured.";
  }
  return err.message;
}

export function ProductEditorClient({
  mode,
  productId,
}: {
  mode: "new" | "edit";
  productId?: string;
}) {
  const apiRoot = useMemo(() => clientApiRoot(), []);
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [nameFr, setNameFr] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descriptionFr, setDescriptionFr] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priceMad, setPriceMad] = useState("");
  const [compareAtMad, setCompareAtMad] = useState("");
  const [stock, setStock] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [skuReadonly, setSkuReadonly] = useState("");
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [showArabic, setShowArabic] = useState(false);
  const [showSlug, setShowSlug] = useState(false);

  useEffect(() => {
    setToken(sessionStorage.getItem(TOKEN_KEY));
  }, []);

  const authHeaders = useCallback(
    (): HeadersInit => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token],
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${apiRoot}/categories`);
        if (!r.ok) return;
        const data = (await r.json()) as CategoryRow[];
        if (!cancelled) setCategories(data);
      } catch (e) {
        logApiFailure("admin categories", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiRoot, token]);

  useEffect(() => {
    if (!token || mode !== "edit" || !productId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const r = await fetch(`${apiRoot}/admin/products/${productId}`, {
          headers: authHeaders(),
        });
        if (!r.ok) {
          setMsg(await r.text());
          setLoading(false);
          return;
        }
        const p = (await r.json()) as AdminProductDetail;
        if (cancelled) return;
        setNameFr(p.nameFr);
        setNameAr(p.nameAr);
        setDescriptionFr(p.descriptionFr);
        setDescriptionAr(p.descriptionAr);
        setSlug(p.slug);
        setCategoryId(p.categoryId);
        setPriceMad(p.priceMad);
        setCompareAtMad(p.compareAtMad ?? "");
        setStock(String(p.stock));
        setIsActive(p.isActive);
        setImages([...p.images]);
        setSkuReadonly(p.sku);
        setShowArabic(
          p.nameAr !== p.nameFr || p.descriptionAr !== p.descriptionFr,
        );
      } catch (e) {
        logApiFailure("admin product load", e);
        setMsg(friendlyNetworkError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiRoot, authHeaders, mode, productId, token]);

  async function onPickImages(files: FileList | null) {
    if (!files?.length) return;
    setMsg(null);
    const next: string[] = [];
    for (let i = 0; i < files.length; i += 1) {
      const f = files.item(i);
      if (!f || !f.type.startsWith("image/")) continue;
      if (f.size > 12 * 1024 * 1024) {
        setMsg(`Skipped "${f.name}" (max 12 MB before compression).`);
        continue;
      }
      try {
        next.push(await compressImageFile(f));
      } catch (e) {
        logApiFailure("compress image", e);
        setMsg(`Could not process "${f.name}".`);
      }
    }
    if (next.length) setImages((prev) => [...prev, ...next]);
  }

  function addImageUrl() {
    const u = imageUrlDraft.trim();
    if (!u) return;
    if (!/^https?:\/\//i.test(u)) {
      setMsg("Image URL must start with http:// or https://");
      return;
    }
    setImages((prev) => [...prev, u]);
    setImageUrlDraft("");
    setMsg(null);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setMsg("Not signed in.");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      if (mode === "new") {
        const body: Record<string, unknown> = {
          nameFr: nameFr.trim(),
          descriptionFr: descriptionFr.trim(),
          categoryId,
          priceMad: priceMad.trim().replace(",", "."),
          stock: parseInt(stock, 10) || 0,
          isActive,
          images,
        };
        const na = nameAr.trim();
        const da = descriptionAr.trim();
        if (na) body.nameAr = na;
        if (da) body.descriptionAr = da;
        const sl = slug.trim();
        if (sl) body.slug = sl;
        const cmp = compareAtMad.trim();
        if (cmp) body.compareAtMad = cmp.replace(",", ".");

        const r = await fetch(`${apiRoot}/admin/products`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        const raw = await r.text();
        if (!r.ok) {
          setMsg(raw.slice(0, 800));
          return;
        }
        router.push("/admin?tab=products");
        return;
      }

      if (!productId) return;
      const body: Record<string, unknown> = {
        nameFr: nameFr.trim(),
        nameAr: nameAr.trim(),
        descriptionFr: descriptionFr.trim(),
        descriptionAr: descriptionAr.trim(),
        slug: slug.trim(),
        categoryId,
        priceMad: priceMad.trim().replace(",", "."),
        stock: parseInt(stock, 10) || 0,
        isActive,
        images,
      };
      const cmp = compareAtMad.trim();
      body.compareAtMad = cmp;

      const r = await fetch(`${apiRoot}/admin/products/${productId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const raw = await r.text();
      if (!r.ok) {
        setMsg(raw.slice(0, 800));
        return;
      }
      router.push("/admin?tab=products");
    } catch (err) {
      logApiFailure("admin save product", err);
      setMsg(friendlyNetworkError(err));
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-[var(--muted)]">
          Sign in from the{" "}
          <Link href="/admin" className="text-[var(--accent)] underline">
            admin home
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-[var(--muted)]">
        Loading product…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin?tab=products"
          className="text-sm text-[var(--muted)] transition hover:text-[var(--fg)]"
        >
          ← Back to products
        </Link>
        <div className="flex items-center gap-2">
          <AtlasLogo size={32} />
          <span className="text-sm font-semibold text-[var(--fg)]">
            {mode === "new" ? "New product" : "Edit product"}
          </span>
        </div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={onSubmit}
        className="card-chrome space-y-5 rounded-3xl p-5 md:p-7"
      >
        {mode === "edit" && skuReadonly ? (
          <div className="rounded-xl border border-[var(--border)] bg-black/20 px-3 py-2 text-sm">
            <span className="text-[var(--muted)]">SKU (auto): </span>
            <span className="font-mono text-[var(--fg)]">{skuReadonly}</span>
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)]">
            SKU will be generated automatically (e.g. ATL-XXXXXXXXXX).
          </p>
        )}

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Product name (French) *
          </span>
          <input
            required
            value={nameFr}
            onChange={(e) => setNameFr(e.target.value)}
            className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/25 px-3 py-2.5 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Description (French) *
          </span>
          <textarea
            required
            rows={5}
            value={descriptionFr}
            onChange={(e) => setDescriptionFr(e.target.value)}
            className="checkout-input mt-1 w-full resize-y rounded-xl border border-[var(--border)] bg-black/25 px-3 py-2.5 text-sm"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Price (MAD) *
            </span>
            <input
              required
              inputMode="decimal"
              value={priceMad}
              onChange={(e) => setPriceMad(e.target.value)}
              className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/25 px-3 py-2.5 text-sm tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Compare-at (MAD)
            </span>
            <input
              inputMode="decimal"
              value={compareAtMad}
              onChange={(e) => setCompareAtMad(e.target.value)}
              placeholder="Optional — shown as “was” price"
              className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/25 px-3 py-2.5 text-sm tabular-nums"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Category *
          </span>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/25 px-3 py-2.5 text-sm"
          >
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameFr}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Stock
            </span>
            <input
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/25 px-3 py-2.5 text-sm tabular-nums"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 pt-7">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)]"
            />
            <span className="text-sm text-[var(--fg)]">Active on storefront</span>
          </label>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-black/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Images
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Upload files (compressed in the browser) or paste an image URL. The
            first image is the main photo on the product page.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="btn-secondary cursor-pointer rounded-xl px-3 py-2 text-xs">
              Upload pictures
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  void onPickImages(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <input
              type="url"
              value={imageUrlDraft}
              onChange={(e) => setImageUrlDraft(e.target.value)}
              placeholder="https://…"
              className="checkout-input min-w-[12rem] flex-1 rounded-xl border border-[var(--border)] bg-black/25 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addImageUrl}
              className="btn-secondary rounded-xl px-3 py-2 text-xs"
            >
              Add URL
            </button>
          </div>
          {images.length > 0 ? (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((src, i) => (
                <li
                  key={`${i}-${src.slice(0, 40)}`}
                  className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-black/30"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                  <div className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-[10px] text-white">
                    {i === 0 ? "Main" : `#${i + 1}`}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute bottom-1 right-1 rounded bg-rose-600/90 px-2 py-0.5 text-[10px] font-medium text-white"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setShowArabic((v) => !v)}
          className="text-xs font-medium text-[var(--accent)]"
        >
          {showArabic ? "Hide Arabic fields" : "Arabic title & description (optional)"}
        </button>
        {showArabic ? (
          <div className="space-y-3 border-l-2 border-[var(--accent)]/40 pl-4">
            <label className="block">
              <span className="text-xs text-[var(--muted)]">Name (Arabic)</span>
              <input
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                dir="rtl"
                className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/25 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-[var(--muted)]">
                Description (Arabic)
              </span>
              <textarea
                rows={4}
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                dir="rtl"
                className="checkout-input mt-1 w-full resize-y rounded-xl border border-[var(--border)] bg-black/25 px-3 py-2.5 text-sm"
              />
            </label>
            <p className="text-xs text-[var(--muted)]">
              Leave empty when creating: French text is copied automatically.
            </p>
          </div>
        ) : null}

        {mode === "edit" ? (
          <label className="block">
            <span className="text-xs text-[var(--muted)]">
              Store URL handle — changing it changes the product link on the site.
            </span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/25 px-3 py-2.5 font-mono text-sm"
            />
          </label>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowSlug((v) => !v)}
              className="text-xs font-medium text-[var(--accent)]"
            >
              {showSlug ? "Hide URL handle" : "Custom store URL (optional)"}
            </button>
            {showSlug ? (
              <label className="block">
                <span className="text-xs text-[var(--muted)]">
                  Leave empty to generate from the French title.
                </span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="checkout-input mt-1 w-full rounded-xl border border-[var(--border)] bg-black/25 px-3 py-2.5 font-mono text-sm"
                />
              </label>
            ) : null}
          </>
        )}

        {msg ? (
          <p className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {msg}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-2">
          <motion.button
            type="submit"
            disabled={saving}
            whileHover={{ y: saving ? 0 : -1 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hot)] px-5 py-2.5 text-sm font-semibold text-slate-900"
          >
            {saving ? "Saving…" : mode === "new" ? "Create product" : "Save changes"}
          </motion.button>
          <Link
            href="/admin?tab=products"
            className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm text-[var(--fg)]"
          >
            Cancel
          </Link>
        </div>
      </motion.form>
    </div>
  );
}
