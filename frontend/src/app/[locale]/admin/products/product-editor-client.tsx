"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { AtlasLogo } from "@/components/atlas-logo";
import { clientApiRoot, logApiFailure } from "@/lib/api-config";
import { parseNestErrorMessage } from "@/lib/parse-nest-error";
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
  lowStockThreshold?: number;
  images: string[];
  isActive: boolean;
  variantsEnabled?: boolean;
  categoryId: string;
  category: { id: string; nameFr: string; slug: string };
  metadata?: Record<string, unknown> | null;
  options?: Array<{
    id: string;
    nameFr: string;
    nameAr: string;
    values: Array<{
      id: string;
      valueFr: string;
      valueAr: string;
      colorHex?: string | null;
      imageUrl?: string | null;
    }>;
  }>;
  variants?: Array<{
    id: string;
    sku: string;
    priceMad: string | null;
    compareAtMad: string | null;
    stock: number;
    images: string[];
    isDefault: boolean;
    valueIndexes: number[];
  }>;
};

type VeOption = {
  nameFr: string;
  nameAr: string;
  values: Array<{
    valueFr: string;
    valueAr: string;
    colorHex: string;
    imageUrl: string;
  }>;
};

type VeVariant = {
  id?: string;
  sku: string;
  priceMad: string;
  compareAtMad: string;
  stock: number;
  media: string[];
  isDefault: boolean;
  valueIndexes: number[];
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

function slugifyClient(s: string): string {
  const t = s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return t || "product";
}

function readMetaStr(
  m: Record<string, unknown> | null | undefined,
  key: string,
): string {
  const v = m?.[key];
  return typeof v === "string" ? v : "";
}

function readMetaBool(
  m: Record<string, unknown> | null | undefined,
  key: string,
  fallback: boolean,
): boolean {
  const v = m?.[key];
  return typeof v === "boolean" ? v : fallback;
}

function readTagsLine(
  m: Record<string, unknown> | null | undefined,
): string {
  const v = m?.tags;
  if (!Array.isArray(v)) return "";
  return v.filter((x): x is string => typeof x === "string").join(", ");
}

function isVideoMime(type: string): boolean {
  return type.startsWith("video/");
}

function isVideoUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return (
    u.startsWith("data:video/") ||
    u.endsWith(".mp4") ||
    u.endsWith(".webm") ||
    u.endsWith(".ogg") ||
    u.endsWith(".mov")
  );
}

function isColorOptionName(option: VeOption): boolean {
  const combined = `${option.nameFr} ${option.nameAr}`.toLowerCase();
  return /color|couleur|لون/.test(combined);
}

function isSizeOptionName(option: VeOption): boolean {
  const combined = `${option.nameFr} ${option.nameAr}`.toLowerCase();
  return /\b(size|sizes|taille|tailles|pointure|pointures|dimension|dimensions|measure|مقاس|المقاس)\b/.test(
    combined,
  );
}

/** Display / matrix column order for apparel sizes */
const STANDARD_SIZE_LABELS = ["S", "M", "L", "XL", "XXL", "XXXL"] as const;

function normalizeSizeLabel(s: string): string {
  const t = s.trim().toUpperCase().replace(/\s+/g, "");
  if (t === "2XL") return "XXL";
  if (t === "3XL") return "XXXL";
  return t;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result ?? ""));
    fr.onerror = () => reject(fr.error ?? new Error("File read failed."));
    fr.readAsDataURL(file);
  });
}

function insertAroundSelection(
  el: HTMLTextAreaElement,
  before: string,
  after: string,
  setter: (v: string) => void,
  current: string,
) {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = current.slice(start, end);
  const next =
    current.slice(0, start) + before + selected + after + current.slice(end);
  setter(next);
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + before.length + selected.length + after.length;
    el.setSelectionRange(pos, pos);
  });
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 shadow-sm backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-[var(--fg)]"
      >
        <span>{title}</span>
        <span
          className={`text-[var(--muted)] transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▼
        </span>
      </button>
      {open ? (
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function inputClass(short?: boolean) {
  return `mt-1 w-full rounded-xl border border-[var(--border)] bg-white/90 px-3 py-2.5 text-sm text-[var(--fg)] shadow-inner shadow-black/5 placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25 dark:bg-black/20 ${short ? "tabular-nums" : ""}`;
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
  const locale = useLocale();
  const descRef = useRef<HTMLTextAreaElement>(null);

  const [token, setToken] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [nameFr, setNameFr] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [descriptionFr, setDescriptionFr] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [priceMad, setPriceMad] = useState("");
  const [compareAtMad, setCompareAtMad] = useState("");
  const [costMad, setCostMad] = useState("");
  const [stock, setStock] = useState("0");
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [isActive, setIsActive] = useState(true);
  const [trackInventory, setTrackInventory] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [skuReadonly, setSkuReadonly] = useState("");
  const [barcode, setBarcode] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [seoTitleFr, setSeoTitleFr] = useState("");
  const [seoDescriptionFr, setSeoDescriptionFr] = useState("");
  const [seoTitleAr, setSeoTitleAr] = useState("");
  const [seoDescriptionAr, setSeoDescriptionAr] = useState("");
  const [tagsLine, setTagsLine] = useState("");
  const [vendorNote, setVendorNote] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [showArabic, setShowArabic] = useState(false);

  const [veEnabled, setVeEnabled] = useState(false);
  const [veOptions, setVeOptions] = useState<VeOption[]>([]);
  const [veVariants, setVeVariants] = useState<VeVariant[]>([]);
  const variantOptionGroups = useMemo(() => {
    const colorIdx: number[] = [];
    const sizeIdx: number[] = [];
    const otherIdx: number[] = [];
    veOptions.forEach((o, i) => {
      if (isColorOptionName(o)) colorIdx.push(i);
      else if (isSizeOptionName(o)) sizeIdx.push(i);
      else otherIdx.push(i);
    });
    return { colorIdx, sizeIdx, otherIdx };
  }, [veOptions]);

  const colorSizeMatrix = useMemo(() => {
    if (
      variantOptionGroups.colorIdx.length !== 1 ||
      variantOptionGroups.sizeIdx.length !== 1 ||
      variantOptionGroups.otherIdx.length !== 0
    ) {
      return null;
    }
    const colorIx = variantOptionGroups.colorIdx[0]!;
    const sizeIx = variantOptionGroups.sizeIdx[0]!;
    const colorOpt = veOptions[colorIx];
    const sizeOpt = veOptions[sizeIx];
    if (!colorOpt?.values.length || !sizeOpt) return null;

    const sizeLabelToIndex = new Map<string, number>();
    sizeOpt.values.forEach((v, i) => {
      const key = normalizeSizeLabel(v.valueFr || v.valueAr);
      if (key && !sizeLabelToIndex.has(key)) sizeLabelToIndex.set(key, i);
    });

    const columns = STANDARD_SIZE_LABELS.map((label) => ({
      label,
      valueIndex: sizeLabelToIndex.get(label) ?? null,
    }));

    const colorRows = colorOpt.values.map((_v, ci) => ({
      colorIndex: ci,
      label:
        colorOpt.values[ci]?.valueFr?.trim() ||
        colorOpt.values[ci]?.valueAr?.trim() ||
        `Color ${ci + 1}`,
      swatch: colorOpt.values[ci]?.colorHex?.trim() || "",
    }));

    return { colorIx, sizeIx, columns, colorRows };
  }, [veOptions, variantOptionGroups]);

  const appendMissingStandardSizes = useCallback(() => {
    const sizeIx = variantOptionGroups.sizeIdx[0];
    if (sizeIx == null || sizeIx < 0) {
      setMsg("Add a Size option first.");
      return;
    }
    setVeOptions((prev) => {
      const opt = prev[sizeIx];
      if (!opt) return prev;
      const map = new Map<string, number>();
      opt.values.forEach((v, i) => {
        const k = normalizeSizeLabel(v.valueFr || v.valueAr);
        if (k && !map.has(k)) map.set(k, i);
      });
      let nextValues = [...opt.values];
      for (const label of STANDARD_SIZE_LABELS) {
        if (!map.has(label)) {
          map.set(label, nextValues.length);
          nextValues = [
            ...nextValues,
            {
              valueFr: label,
              valueAr: label,
              colorHex: "",
              imageUrl: "",
            },
          ];
        }
      }
      return prev.map((o, i) => (i === sizeIx ? { ...o, values: nextValues } : o));
    });
    setMsg(null);
  }, [variantOptionGroups.sizeIdx]);

  const setColorSizePairOffered = useCallback(
    (colorValueIndex: number, sizeValueIndex: number, offered: boolean) => {
      if (!colorSizeMatrix) return;
      const { colorIx, sizeIx } = colorSizeMatrix;
      setVeVariants((prev) => {
        const match = (r: VeVariant) =>
          r.valueIndexes[colorIx] === colorValueIndex &&
          r.valueIndexes[sizeIx] === sizeValueIndex;
        const idx = prev.findIndex(match);
        if (offered) {
          if (idx >= 0) return prev;
          const base = (skuReadonly || slug || "VAR")
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 24);
          const valueIndexes = veOptions.map((_, oi) => {
            if (oi === colorIx) return colorValueIndex;
            if (oi === sizeIx) return sizeValueIndex;
            return 0;
          });
          const colorVal = veOptions[colorIx]?.values[colorValueIndex];
          const media =
            colorVal?.imageUrl?.trim() ? [colorVal.imageUrl.trim()] : [];
          const nextRow: VeVariant = {
            sku: `${base || "VAR"}-${prev.length + 1}`,
            priceMad: "",
            compareAtMad: "",
            stock: 0,
            media,
            isDefault: prev.length === 0,
            valueIndexes,
          };
          return [...prev, nextRow];
        }
        if (idx < 0) return prev;
        const wasDefault = prev[idx]!.isDefault;
        let next = prev.filter((_, i) => i !== idx);
        if (wasDefault && next.length > 0) {
          next = next.map((r, i) => ({ ...r, isDefault: i === 0 }));
        }
        return next;
      });
    },
    [colorSizeMatrix, veOptions, skuReadonly, slug],
  );

  const productUrlPrefix = useMemo(() => {
    if (typeof window === "undefined") return `/${locale}/product/`;
    return `${window.location.origin}/${locale}/product/`;
  }, [locale]);

  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.nameFr.toLowerCase().includes(q) ||
        c.nameAr.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    );
  }, [categories, categoryQuery]);

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

  function buildMetadataPatch(): Record<string, unknown> {
    const tags = tagsLine
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    return {
      costMad: costMad.trim() || null,
      barcode: barcode.trim() || null,
      weightKg: weightKg.trim() || null,
      lengthCm: lengthCm.trim() || null,
      widthCm: widthCm.trim() || null,
      heightCm: heightCm.trim() || null,
      videoUrl: videoUrl.trim() || null,
      seoTitleFr: seoTitleFr.trim() || null,
      seoDescriptionFr: seoDescriptionFr.trim() || null,
      seoTitleAr: seoTitleAr.trim() || null,
      seoDescriptionAr: seoDescriptionAr.trim() || null,
      vendorNote: vendorNote.trim() || null,
      internalNotes: internalNotes.trim() || null,
      trackInventory,
      tags: tags.length ? tags : null,
    };
  }

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
        const meta =
          p.metadata && typeof p.metadata === "object" && !Array.isArray(p.metadata)
            ? (p.metadata as Record<string, unknown>)
            : null;

        setNameFr(p.nameFr);
        setNameAr(p.nameAr);
        setDescriptionFr(p.descriptionFr);
        setDescriptionAr(p.descriptionAr);
        setSlug(p.slug);
        setSlugTouched(true);
        setCategoryId(p.categoryId);
        setPriceMad(p.priceMad);
        setCompareAtMad(p.compareAtMad ?? "");
        setStock(String(p.stock));
        setIsActive(p.isActive);
        setImages([...p.images]);
        setSkuReadonly(p.sku);
        setLowStockThreshold(String(p.lowStockThreshold ?? 5));
        setCostMad(readMetaStr(meta, "costMad"));
        setBarcode(readMetaStr(meta, "barcode"));
        setWeightKg(readMetaStr(meta, "weightKg"));
        setLengthCm(readMetaStr(meta, "lengthCm"));
        setWidthCm(readMetaStr(meta, "widthCm"));
        setHeightCm(readMetaStr(meta, "heightCm"));
        setVideoUrl(readMetaStr(meta, "videoUrl"));
        setSeoTitleFr(readMetaStr(meta, "seoTitleFr"));
        setSeoDescriptionFr(readMetaStr(meta, "seoDescriptionFr"));
        setSeoTitleAr(readMetaStr(meta, "seoTitleAr"));
        setSeoDescriptionAr(readMetaStr(meta, "seoDescriptionAr"));
        setVendorNote(readMetaStr(meta, "vendorNote"));
        setInternalNotes(readMetaStr(meta, "internalNotes"));
        setTagsLine(readTagsLine(meta));
        setTrackInventory(readMetaBool(meta, "trackInventory", true));
        setShowArabic(
          p.nameAr !== p.nameFr || p.descriptionAr !== p.descriptionFr,
        );
        setVariantsFromAdminDetail(p);
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

  useEffect(() => {
    if (mode !== "new" || slugTouched) return;
    if (!nameFr.trim()) return;
    setSlug(slugifyClient(nameFr));
  }, [mode, nameFr, slugTouched]);

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

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadOptionValueMedia(
    optionIndex: number,
    valueIndex: number,
    file: File | null,
  ) {
    if (!file) return;
    setMsg(null);
    try {
      const media = isVideoMime(file.type)
        ? await fileToDataUrl(file)
        : await compressImageFile(file);
      setVeOptions((prev) =>
        prev.map((o, oi) =>
          oi !== optionIndex
            ? o
            : {
                ...o,
                values: o.values.map((v, vi) =>
                  vi === valueIndex ? { ...v, imageUrl: media } : v,
                ),
              },
        ),
      );
    } catch (e) {
      logApiFailure("upload option value media", e);
      setMsg(`Could not upload "${file.name}".`);
    }
  }

  async function uploadVariantRowMedia(rowIndex: number, files: FileList | null) {
    if (!files?.length) return;
    setMsg(null);
    const next: string[] = [];
    for (let i = 0; i < files.length; i += 1) {
      const file = files.item(i);
      if (!file) continue;
      try {
        if (isVideoMime(file.type)) {
          if (file.size > 25 * 1024 * 1024) {
            setMsg(`Skipped "${file.name}" (max 25 MB for video).`);
            continue;
          }
          next.push(await fileToDataUrl(file));
        } else if (file.type.startsWith("image/")) {
          if (file.size > 12 * 1024 * 1024) {
            setMsg(`Skipped "${file.name}" (max 12 MB before compression).`);
            continue;
          }
          next.push(await compressImageFile(file));
        }
      } catch (e) {
        logApiFailure("upload variant media", e);
        setMsg(`Could not process "${file.name}".`);
      }
    }
    if (!next.length) return;
    setVeVariants((prev) =>
      prev.map((r, i) => {
        if (i !== rowIndex) return r;
        // Keep a single media per row so each row stays specific to one variant.
        return { ...r, media: [next[0]] };
      }),
    );
  }

  function buildVariantsPutBody(): Record<string, unknown> {
    const options = veOptions.map((o) => ({
      nameFr: o.nameFr.trim(),
      nameAr: (o.nameAr || o.nameFr).trim(),
      values: o.values.map((v) => ({
        valueFr: v.valueFr.trim(),
        valueAr: (v.valueAr || v.valueFr).trim(),
        colorHex: v.colorHex?.trim() || undefined,
        imageUrl: v.imageUrl?.trim() || undefined,
      })),
    }));
    const variants = veVariants.map((v) => ({
      sku: v.sku.trim().toUpperCase(),
      priceMad: v.priceMad.trim() ? v.priceMad.trim().replace(",", ".") : null,
      compareAtMad: v.compareAtMad.trim()
        ? v.compareAtMad.trim().replace(",", ".")
        : null,
      stock: v.stock,
      images: v.media.filter(Boolean),
      isDefault: v.isDefault,
      valueIndexes: v.valueIndexes,
    }));
    return {
      variantsEnabled: veEnabled,
      options: veEnabled ? options : [],
      variants: veEnabled ? variants : [],
    };
  }

  function setVariantsFromAdminDetail(p: AdminProductDetail) {
    setVeEnabled(Boolean(p.variantsEnabled));
    setVeOptions(
      (p.options ?? []).map((o) => ({
        nameFr: o.nameFr,
        nameAr: o.nameAr,
        values: (o.values ?? []).map((v) => ({
          valueFr: v.valueFr,
          valueAr: v.valueAr,
          colorHex: v.colorHex ?? "",
          imageUrl: v.imageUrl ?? "",
        })),
      })),
    );
    setVeVariants(
      (p.variants ?? []).map((v) => ({
        id: v.id,
        sku: v.sku,
        priceMad: v.priceMad ?? "",
        compareAtMad: v.compareAtMad ?? "",
        stock: v.stock,
        media: [...(v.images ?? [])],
        isDefault: v.isDefault,
        valueIndexes: [...(v.valueIndexes ?? [])],
      })),
    );
  }

  async function saveSingleVariantRow(rowIndex: number) {
    if (!token || !productId) return;
    const row = veVariants[rowIndex];
    if (!row?.id) {
      setMsg("This row is new. Use Save/Create to persist all rows first.");
      return;
    }
    setMsg(null);
    try {
      const body = {
        sku: row.sku.trim().toUpperCase(),
        priceMad: row.priceMad.trim() ? row.priceMad.trim().replace(",", ".") : null,
        compareAtMad: row.compareAtMad.trim()
          ? row.compareAtMad.trim().replace(",", ".")
          : null,
        stock: row.stock,
        images: row.media.filter(Boolean),
        isDefault: row.isDefault,
        valueIndexes: row.valueIndexes,
      };
      const r = await fetch(
        `${apiRoot}/admin/products/${productId}/variants/${row.id}`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify(body),
        },
      );
      const raw = await r.text();
      if (!r.ok) {
        setMsg(raw.slice(0, 800));
        return;
      }
      const data = JSON.parse(raw) as AdminProductDetail;
      setVariantsFromAdminDetail(data);
      setMsg("Variant row saved.");
    } catch (e) {
      logApiFailure("admin save single variant", e);
      setMsg(friendlyNetworkError(e));
    }
  }

  function validateVariantConfig(): string | null {
    if (!veEnabled) return null;
    if (!veOptions.length) {
      return "Variants on: add at least one option (e.g. Color).";
    }
    if (veOptions.some((o) => !o.values.length)) {
      return "Each option needs at least one value.";
    }
    if (!veVariants.length) {
      return "Add variant rows or click “Generate all combinations”.";
    }
    for (let i = 0; i < veVariants.length; i += 1) {
      if (veVariants[i].valueIndexes.length !== veOptions.length) {
        return `Variant row ${i + 1}: needs one value index per option — use Generate.`;
      }
      for (let j = 0; j < veOptions.length; j += 1) {
        const ix = veVariants[i].valueIndexes[j];
        if (ix < 0 || ix >= veOptions[j].values.length) {
          return `Variant row ${i + 1}: invalid index for option “${veOptions[j].nameFr}”.`;
        }
      }
    }
    return null;
  }

  function generateVariantGrid() {
    if (!veOptions.length) {
      setMsg("Add at least one option with values first.");
      return;
    }
    if (veOptions.some((o) => !o.values.length)) {
      setMsg("Each option needs at least one value.");
      return;
    }
    const base = (skuReadonly || slug || "VAR")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24);
    const counts = veOptions.map((o) => o.values.length);
    const idxRows: number[][] = [];
    function walk(depth: number, cur: number[]) {
      if (depth >= counts.length) {
        idxRows.push([...cur]);
        return;
      }
      for (let i = 0; i < counts[depth]; i += 1) walk(depth + 1, [...cur, i]);
    }
    walk(0, []);
    setVeVariants(
      idxRows.map((valueIndexes, i) => ({
        sku: `${base || "VAR"}-${i + 1}`,
        priceMad: "",
        compareAtMad: "",
        stock: 0,
        media: [],
        isDefault: i === 0,
        valueIndexes,
      })),
    );
    setMsg(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setMsg("Not signed in.");
      return;
    }
    setSaving(true);
    setMsg(null);
    const veErr = validateVariantConfig();
    if (veErr) {
      setMsg(veErr);
      setSaving(false);
      return;
    }
    const metadata = buildMetadataPatch();
    const lst = parseInt(lowStockThreshold, 10);
    const lowStock =
      Number.isFinite(lst) && lst >= 0 ? lst : 5;

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
          lowStockThreshold: lowStock,
          metadata,
          variantsEnabled: veEnabled,
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
        let newId: string | undefined;
        try {
          newId = (JSON.parse(raw) as { id?: string }).id;
        } catch {
          /* non-JSON */
        }
        if (newId) {
          const vr = await fetch(
            `${apiRoot}/admin/products/${newId}/variants`,
            {
              method: "PUT",
              headers: authHeaders(),
              body: JSON.stringify(buildVariantsPutBody()),
            },
          );
          const vtxt = await vr.text();
          if (!vr.ok) {
            setMsg(
              `Product created but variants failed: ${vtxt.slice(0, 500)}`,
            );
            return;
          }
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
        lowStockThreshold: lowStock,
        metadata,
        variantsEnabled: veEnabled,
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
      const vr = await fetch(
        `${apiRoot}/admin/products/${productId}/variants`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(buildVariantsPutBody()),
        },
      );
      const vtxt = await vr.text();
      if (!vr.ok) {
        setMsg(`Saved product, but variants failed: ${vtxt.slice(0, 500)}`);
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

  async function handleDelete() {
    if (!token || !productId) return;
    const ok = window.confirm(
      `Delete this product? This cannot be undone.\n\nIf it was ever ordered, deletion will be blocked — use Draft (inactive) to hide it from the shop.`,
    );
    if (!ok) return;
    setDeleting(true);
    setMsg(null);
    try {
      const r = await fetch(`${apiRoot}/admin/products/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = await r.text();
      if (!r.ok) {
        setMsg(parseNestErrorMessage(raw) ?? raw.slice(0, 500));
        return;
      }
      router.push("/admin?tab=products");
    } catch (err) {
      logApiFailure("admin delete product", err);
      setMsg(friendlyNetworkError(err));
    } finally {
      setDeleting(false);
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
      <div className="mx-auto max-w-6xl px-4 py-20 text-center text-[var(--muted)]">
        Loading product…
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-6 md:pb-32 md:pt-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin?tab=products"
            className="text-sm text-[var(--muted)] transition hover:text-[var(--fg)]"
          >
            ← Back to products
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <AtlasLogo size={36} />
            <div>
              <h1 className="text-lg font-semibold text-[var(--fg)]">
                {mode === "new" ? "New product" : "Edit product"}
              </h1>
              <nav className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                <Link
                  href="/admin?tab=products"
                  className="hover:text-[var(--accent)]"
                >
                  All products
                </Link>
                <span aria-hidden>·</span>
                <Link
                  href="/admin/products/new"
                  className="hover:text-[var(--accent)]"
                >
                  New product
                </Link>
                <span aria-hidden>·</span>
                <span title="Coming soon">Categories</span>
                <span aria-hidden>·</span>
                <span title="Coming soon">Reviews</span>
                <span aria-hidden>·</span>
                <span title="Coming soon">Inventory</span>
                <span aria-hidden>·</span>
                <span title="Coming soon">
                  Bundles <span className="rounded bg-cyan-500/20 px-1 text-[10px] font-bold uppercase text-cyan-700 dark:text-cyan-300">New</span>
                </span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <motion.form
        id="product-editor-form"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={onSubmit}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start"
      >
        {/* Main column */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 p-4 shadow-sm backdrop-blur-sm md:p-5">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Product name (French) *
              </span>
              <input
                required
                value={nameFr}
                onChange={(e) => setNameFr(e.target.value)}
                placeholder="Ex. chemise d’été bleue…"
                className={inputClass()}
              />
            </label>

            <div className="mt-4">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Product URL
              </span>
              <div className="mt-1 flex min-h-[2.75rem] flex-wrap items-stretch overflow-hidden rounded-xl border border-[var(--border)] bg-white/80 shadow-inner dark:bg-black/25">
                <span className="flex max-w-full items-center break-all border-r border-[var(--border)] bg-black/[0.04] px-2 py-2 text-[11px] text-[var(--muted)] dark:bg-white/5">
                  {productUrlPrefix}
                </span>
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  className="min-w-[8rem] flex-1 border-0 bg-transparent px-3 py-2 font-mono text-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent)]/30"
                  placeholder="product-handle"
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                Leave the handle empty on create to generate it from the French
                title. Changing it updates the public product link.
              </p>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Category * (also in sidebar)
              </span>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputClass()}
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameFr}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 p-4 shadow-sm backdrop-blur-sm md:p-5">
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Description (French) *
            </span>
            <div className="mt-2 flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-[var(--border)] bg-black/[0.03] p-2 dark:bg-white/5">
              {(
                [
                  ["Bold", "**", "**"],
                  ["Italic", "_", "_"],
                  ["• List", "\n- ", ""],
                  ["Break", "\n\n", ""],
                ] as const
              ).map(([label, b, a]) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-lg border border-[var(--border)] bg-white/90 px-2 py-1 text-[11px] font-medium text-[var(--fg)] shadow-sm hover:border-[var(--accent)]/50 dark:bg-black/30"
                  onClick={() => {
                    const el = descRef.current;
                    if (!el) return;
                    insertAroundSelection(
                      el,
                      b,
                      a,
                      setDescriptionFr,
                      descriptionFr,
                    );
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <textarea
              ref={descRef}
              required
              rows={10}
              value={descriptionFr}
              onChange={(e) => setDescriptionFr(e.target.value)}
              placeholder="Type something… Line breaks are kept on the product page."
              className="w-full resize-y rounded-b-xl border border-[var(--border)] bg-white/90 px-3 py-3 text-sm text-[var(--fg)] shadow-inner focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25 dark:bg-black/20"
            />
            <p className="mt-2 text-[11px] text-[var(--muted)]">
              The shop shows this as plain text with line breaks. Use bullets
              (- item) for simple lists.
            </p>
          </div>

          <CollapsibleSection title="Pricing" defaultOpen>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs text-[var(--muted)]">Price (MAD) *</span>
                <input
                  required
                  inputMode="decimal"
                  value={priceMad}
                  onChange={(e) => setPriceMad(e.target.value)}
                  className={inputClass(true)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-[var(--muted)]">
                  Compare at (MAD)
                </span>
                <input
                  inputMode="decimal"
                  value={compareAtMad}
                  onChange={(e) => setCompareAtMad(e.target.value)}
                  placeholder="Was price"
                  className={inputClass(true)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-[var(--muted)]">Cost (MAD)</span>
                <input
                  inputMode="decimal"
                  value={costMad}
                  onChange={(e) => setCostMad(e.target.value)}
                  placeholder="Internal — margin"
                  className={inputClass(true)}
                />
              </label>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Images & media" defaultOpen>
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hot)] px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm">
                Upload images
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
              <button
                type="button"
                className="rounded-xl border border-[var(--border)] bg-white/90 px-3 py-2 text-xs font-medium text-[var(--fg)] dark:bg-black/25"
                onClick={() =>
                  setMsg(
                    "AI image generation can plug in here later (same upload flow).",
                  )
                }
              >
                Generate
              </button>
            </div>
            <p className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-900 dark:text-sky-100">
              Tip: for a sharp grid on the storefront, use square images around{" "}
              <strong>800×800</strong> px. The first image is the main photo.
            </p>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Upload-only mode: links are disabled.
            </p>
            {images.length > 0 ? (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((src, i) => (
                  <li
                    key={`${i}-${src.slice(0, 40)}`}
                    className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-black/10"
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
            ) : (
              <p className="mt-4 text-xs text-[var(--muted)]">
                No images yet — add at least one for a strong listing.
              </p>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Shipping & dimensions" defaultOpen={false}>
            <p className="mb-3 text-xs text-[var(--muted)]">
              Used for your records and future carrier integrations (rates by
              weight/size).
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs text-[var(--muted)]">Weight (kg)</span>
                <input
                  inputMode="decimal"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="0.35"
                  className={inputClass(true)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-[var(--muted)]">Length (cm)</span>
                <input
                  inputMode="decimal"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(e.target.value)}
                  className={inputClass(true)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-[var(--muted)]">Width (cm)</span>
                <input
                  inputMode="decimal"
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                  className={inputClass(true)}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs text-[var(--muted)]">Height (cm)</span>
                <input
                  inputMode="decimal"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className={inputClass(true)}
                />
              </label>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="SEO (search & sharing)" defaultOpen={false}>
            <p className="mb-3 text-xs text-[var(--muted)]">
              Stored for when the storefront reads custom titles/descriptions
              per product. Empty fields fall back to the product name and
              description.
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-[var(--muted)]">SEO title (FR)</span>
                <input
                  value={seoTitleFr}
                  onChange={(e) => setSeoTitleFr(e.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <span className="text-xs text-[var(--muted)]">
                  Meta description (FR)
                </span>
                <textarea
                  rows={2}
                  value={seoDescriptionFr}
                  onChange={(e) => setSeoDescriptionFr(e.target.value)}
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <span className="text-xs text-[var(--muted)]">SEO title (AR)</span>
                <input
                  value={seoTitleAr}
                  onChange={(e) => setSeoTitleAr(e.target.value)}
                  dir="rtl"
                  className={inputClass()}
                />
              </label>
              <label className="block">
                <span className="text-xs text-[var(--muted)]">
                  Meta description (AR)
                </span>
                <textarea
                  rows={2}
                  value={seoDescriptionAr}
                  onChange={(e) => setSeoDescriptionAr(e.target.value)}
                  dir="rtl"
                  className={inputClass()}
                />
              </label>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Variants (sizes, colors, SKUs)"
            defaultOpen
          >
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={veEnabled}
                onChange={(e) => setVeEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent-hot)]"
              />
              <span className="text-sm font-medium text-[var(--fg)]">
                Enable variants on the storefront
              </span>
            </label>
            <p className="mt-2 text-xs text-[var(--muted)]">
              Shoppers pick one value per option (e.g. Color then Size). Each
              combination is a SKU with its own stock and optional images.
              Quick-add from the shop grid opens the product page when this is
              on.
            </p>
            {veEnabled ? (
              <div className="mt-4 space-y-5">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--border)] bg-white/90 px-3 py-2 text-xs font-semibold dark:bg-black/25"
                    onClick={() => {
                      setVeOptions((prev) => [
                        ...prev,
                        {
                          nameFr: "Option",
                          nameAr: "Option",
                          values: [
                            {
                              valueFr: "Value 1",
                              valueAr: "Value 1",
                              colorHex: "",
                              imageUrl: "",
                            },
                          ],
                        },
                      ]);
                      setVeVariants((rows) =>
                        rows.map((r) => ({
                          ...r,
                          valueIndexes: [...r.valueIndexes, 0],
                        })),
                      );
                    }}
                  >
                    + Add option
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--border)] bg-white/90 px-3 py-2 text-xs font-semibold dark:bg-black/25"
                    onClick={() => {
                      setVeOptions((prev) => [
                        ...prev,
                        {
                          nameFr: "Color",
                          nameAr: "اللون",
                          values: [
                            {
                              valueFr: "Blue",
                              valueAr: "ازرق",
                              colorHex: "#2563eb",
                              imageUrl: "",
                            },
                            {
                              valueFr: "Black",
                              valueAr: "اسود",
                              colorHex: "#111827",
                              imageUrl: "",
                            },
                          ],
                        },
                      ]);
                      setVeVariants((rows) =>
                        rows.map((r) => ({
                          ...r,
                          valueIndexes: [...r.valueIndexes, 0],
                        })),
                      );
                    }}
                  >
                    + Color option preset
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--border)] bg-white/90 px-3 py-2 text-xs font-semibold dark:bg-black/25"
                    onClick={() => {
                      setVeOptions((prev) => [
                        ...prev,
                        {
                          nameFr: "Size",
                          nameAr: "المقاس",
                          values: STANDARD_SIZE_LABELS.map((label) => ({
                            valueFr: label,
                            valueAr: label,
                            colorHex: "",
                            imageUrl: "",
                          })),
                        },
                      ]);
                      setVeVariants((rows) =>
                        rows.map((r) => ({
                          ...r,
                          valueIndexes: [...r.valueIndexes, 0],
                        })),
                      );
                    }}
                  >
                    + Size option (S → XXXL)
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hot)] px-3 py-2 text-xs font-semibold text-slate-900"
                    onClick={() => generateVariantGrid()}
                  >
                    Generate all combinations
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[var(--accent)]/50 bg-[var(--accent-dim)] px-3 py-2 text-xs font-semibold text-[var(--fg)]"
                    onClick={() => appendMissingStandardSizes()}
                    title="Adds any of S, M, L, XL, XXL, XXXL missing from the Size option"
                  >
                    + Add missing S–XXXL values
                  </button>
                </div>

                {veOptions.map((opt, oi) => (
                  <div
                    key={oi}
                    className="rounded-xl border border-[var(--border)] bg-white/60 p-3 dark:bg-black/20"
                  >
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="min-w-[8rem] flex-1">
                        <span className="text-[11px] text-[var(--muted)]">
                          Option name (FR)
                        </span>
                        <input
                          value={opt.nameFr}
                          onChange={(e) => {
                            const v = e.target.value;
                            setVeOptions((prev) =>
                              prev.map((o, i) =>
                                i === oi ? { ...o, nameFr: v } : o,
                              ),
                            );
                          }}
                          className={inputClass()}
                        />
                      </label>
                      <label className="min-w-[8rem] flex-1">
                        <span className="text-[11px] text-[var(--muted)]">
                          Option name (AR)
                        </span>
                        <input
                          value={opt.nameAr}
                          onChange={(e) => {
                            const v = e.target.value;
                            setVeOptions((prev) =>
                              prev.map((o, i) =>
                                i === oi ? { ...o, nameAr: v } : o,
                              ),
                            );
                          }}
                          className={inputClass()}
                        />
                      </label>
                      <button
                        type="button"
                        className="text-xs text-rose-600"
                        onClick={() => {
                          setVeOptions((prev) =>
                            prev.filter((_, i) => i !== oi),
                          );
                          setVeVariants((rows) =>
                            rows.map((r) => ({
                              ...r,
                              valueIndexes: r.valueIndexes.filter(
                                (_, j) => j !== oi,
                              ),
                            })),
                          );
                        }}
                      >
                        Remove option
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {opt.values.map((val, vi) => (
                        <div
                          key={vi}
                          className="flex flex-wrap items-end gap-2 border-t border-[var(--border)] pt-2"
                        >
                          <input
                            placeholder="Value FR"
                            value={val.valueFr}
                            onChange={(e) => {
                              const t = e.target.value;
                              setVeOptions((prev) =>
                                prev.map((o, i) =>
                                  i !== oi
                                    ? o
                                    : {
                                        ...o,
                                        values: o.values.map((vv, j) =>
                                          j === vi ? { ...vv, valueFr: t } : vv,
                                        ),
                                      },
                                ),
                              );
                            }}
                            className={`${inputClass()} min-w-[6rem] flex-1`}
                          />
                          <input
                            placeholder="Value AR"
                            value={val.valueAr}
                            onChange={(e) => {
                              const t = e.target.value;
                              setVeOptions((prev) =>
                                prev.map((o, i) =>
                                  i !== oi
                                    ? o
                                    : {
                                        ...o,
                                        values: o.values.map((vv, j) =>
                                          j === vi ? { ...vv, valueAr: t } : vv,
                                        ),
                                      },
                                ),
                              );
                            }}
                            dir="rtl"
                            className={`${inputClass()} min-w-[6rem] flex-1`}
                          />
                          <input
                            placeholder="#hex optional"
                            value={val.colorHex}
                            onChange={(e) => {
                              const t = e.target.value;
                              setVeOptions((prev) =>
                                prev.map((o, i) =>
                                  i !== oi
                                    ? o
                                    : {
                                        ...o,
                                        values: o.values.map((vv, j) =>
                                          j === vi
                                            ? { ...vv, colorHex: t }
                                            : vv,
                                        ),
                                      },
                                ),
                              );
                            }}
                            className={`${inputClass()} w-28`}
                          />
                          <input
                            placeholder="Media (auto set after upload)"
                            value={val.imageUrl}
                            readOnly
                            className={`${inputClass()} min-w-[14rem] flex-[2]`}
                          />
                          <label className="cursor-pointer rounded-lg border border-[var(--border)] bg-white/90 px-2 py-2 text-[11px] font-medium text-[var(--fg)] dark:bg-black/25">
                            Upload image/video
                            <input
                              type="file"
                              accept="image/*,video/*"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.item(0) ?? null;
                                void uploadOptionValueMedia(oi, vi, file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {val.imageUrl ? (
                            isVideoUrl(val.imageUrl) ? (
                              <video
                                src={val.imageUrl}
                                className="h-10 w-10 rounded-lg border border-[var(--border)] object-cover"
                                muted
                                playsInline
                                loop
                                autoPlay
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={val.imageUrl}
                                alt=""
                                className="h-10 w-10 rounded-lg border border-[var(--border)] object-cover"
                              />
                            )
                          ) : null}
                          <button
                            type="button"
                            className="text-[11px] text-rose-600"
                            onClick={() => {
                              setVeOptions((prev) =>
                                prev.map((o, i) =>
                                  i !== oi
                                    ? o
                                    : {
                                        ...o,
                                        values: o.values.filter(
                                          (_, j) => j !== vi,
                                        ),
                                      },
                                ),
                              );
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="text-xs font-medium text-[var(--accent)]"
                        onClick={() => {
                          setVeOptions((prev) =>
                            prev.map((o, i) =>
                              i !== oi
                                ? o
                                : {
                                    ...o,
                                    values: [
                                      ...o.values,
                                      {
                                        valueFr: `Value ${o.values.length + 1}`,
                                        valueAr: `Value ${o.values.length + 1}`,
                                        colorHex: "",
                                        imageUrl: "",
                                      },
                                    ],
                                  },
                            ),
                          );
                        }}
                      >
                        + Add value
                      </button>
                    </div>
                  </div>
                ))}

                {colorSizeMatrix ? (
                  <div className="rounded-xl border border-[var(--border)] bg-white/55 p-3 dark:bg-black/25">
                    <p className="text-xs font-semibold text-[var(--fg)]">
                      Size availability by color (matrix)
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
                      One row per color. Columns are{" "}
                      <span className="font-mono">S, M, L, XL, XXL, XXXL</span>.
                      Choose <strong>Offered</strong> to sell that color in that
                      size, or <strong>Not offered (—)</strong> when that
                      combination does not exist (e.g. no red shirt in XL). Use
                      “Add missing S–XXXL values” if a column shows “—”.
                    </p>
                    <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)]">
                      <table className="w-full min-w-[40rem] border-collapse text-left text-[11px]">
                        <thead>
                          <tr className="bg-[var(--surface)]/80">
                            <th className="border border-[var(--border)] px-2 py-2 font-semibold text-[var(--fg)]">
                              Color
                            </th>
                            {colorSizeMatrix.columns.map((col) => (
                              <th
                                key={col.label}
                                className="border border-[var(--border)] px-1 py-2 text-center font-semibold text-[var(--fg)]"
                              >
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {colorSizeMatrix.colorRows.map((cr) => (
                            <tr key={cr.colorIndex}>
                              <td className="border border-[var(--border)] px-2 py-1.5 align-middle">
                                <span className="inline-flex items-center gap-2">
                                  {cr.swatch ? (
                                    <span
                                      className="h-5 w-5 shrink-0 rounded border border-[var(--border)]"
                                      style={{ backgroundColor: cr.swatch }}
                                      title={cr.swatch}
                                    />
                                  ) : null}
                                  <span className="font-medium text-[var(--fg)]">
                                    {cr.label}
                                  </span>
                                </span>
                              </td>
                              {colorSizeMatrix.columns.map((col) => {
                                if (col.valueIndex == null) {
                                  return (
                                    <td
                                      key={`${cr.colorIndex}-${col.label}`}
                                      className="border border-[var(--border)] bg-black/[0.03] px-1 py-1 text-center align-middle text-[var(--muted)] dark:bg-white/[0.04]"
                                      title={`Add “${col.label}” to the Size option`}
                                    >
                                      —
                                    </td>
                                  );
                                }
                                const offered = veVariants.some(
                                  (r) =>
                                    r.valueIndexes[colorSizeMatrix.colorIx] ===
                                      cr.colorIndex &&
                                    r.valueIndexes[colorSizeMatrix.sizeIx] ===
                                      col.valueIndex,
                                );
                                return (
                                  <td
                                    key={`${cr.colorIndex}-${col.label}`}
                                    className="border border-[var(--border)] p-1 align-middle"
                                  >
                                    <select
                                      value={offered ? "yes" : "no"}
                                      onChange={(e) =>
                                        setColorSizePairOffered(
                                          cr.colorIndex,
                                          col.valueIndex!,
                                          e.target.value === "yes",
                                        )
                                      }
                                      className="w-full rounded-lg border border-[var(--border)] bg-white/90 px-1 py-1.5 text-[11px] text-[var(--fg)] dark:bg-black/30"
                                    >
                                      <option value="yes">Offered</option>
                                      <option value="no">Not offered (—)</option>
                                    </select>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                <p className="text-xs font-semibold text-[var(--fg)]">
                  Variant rows
                </p>
                <div className="space-y-3">
                  {veVariants.map((row, vi) => (
                    (() => {
                      const valueLabelAt = (oix: number): string => {
                        const ix = row.valueIndexes[oix];
                        if (ix == null) return "";
                        const v = veOptions[oix]?.values[ix];
                        return (
                          v?.valueFr?.trim() ||
                          v?.valueAr?.trim() ||
                          ""
                        );
                      };
                      const colorLabels = variantOptionGroups.colorIdx
                        .map(valueLabelAt)
                        .filter(Boolean);
                      const sizeLabels = variantOptionGroups.sizeIdx
                        .map(valueLabelAt)
                        .filter(Boolean);
                      const otherLabels = variantOptionGroups.otherIdx
                        .map(valueLabelAt)
                        .filter(Boolean);
                      const fallbackLabel =
                        colorLabels.length || sizeLabels.length || otherLabels.length
                          ? ""
                          : `#${vi + 1}`;

                      const renderOptionSelect = (oix: number) => {
                        const opt = veOptions[oix];
                        return (
                          <label
                            key={`${opt.nameFr}-${oix}`}
                            className="flex min-w-[8rem] flex-col gap-1"
                          >
                            <span className="text-[10px] text-[var(--muted)]">
                              {opt.nameFr}
                            </span>
                            <select
                              value={row.valueIndexes[oix] ?? 0}
                              onChange={(e) => {
                                const n = parseInt(e.target.value, 10) || 0;
                                setVeVariants((prev) =>
                                  prev.map((r, i) => {
                                    if (i !== vi) return r;
                                    const next = [...r.valueIndexes];
                                    next[oix] = n;
                                    const selectedOpt = veOptions[oix];
                                    if (
                                      selectedOpt &&
                                      isColorOptionName(selectedOpt)
                                    ) {
                                      const selectedVal = selectedOpt.values[n];
                                      if (selectedVal?.imageUrl) {
                                        return {
                                          ...r,
                                          valueIndexes: next,
                                          media: [selectedVal.imageUrl],
                                        };
                                      }
                                    }
                                    return { ...r, valueIndexes: next };
                                  }),
                                );
                              }}
                              className={inputClass()}
                            >
                              {opt.values.map((val, j) => (
                                <option
                                  key={val.valueFr + String(j)}
                                  value={j}
                                >
                                  {val.valueFr}
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      };

                      return (
                    <div
                      key={vi}
                      className="rounded-xl border border-[var(--border)] bg-white/60 p-3 dark:bg-black/20"
                    >
                      <div className="mb-2 space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          Variant row
                        </p>
                        {variantOptionGroups.colorIdx.length > 0 ? (
                          <p className="text-xs font-semibold text-[var(--fg)]">
                            <span className="font-medium text-[var(--muted)]">
                              Color
                            </span>{" "}
                            {colorLabels.length
                              ? colorLabels.join(", ")
                              : "—"}
                          </p>
                        ) : null}
                        {variantOptionGroups.sizeIdx.length > 0 ? (
                          <p className="text-xs font-semibold text-[var(--fg)]">
                            <span className="font-medium text-[var(--muted)]">
                              Size
                            </span>{" "}
                            {sizeLabels.length
                              ? sizeLabels.join(", ")
                              : "—"}
                          </p>
                        ) : null}
                        {variantOptionGroups.otherIdx.length > 0 ? (
                          <p className="text-xs font-semibold text-[var(--fg)]">
                            <span className="font-medium text-[var(--muted)]">
                              Other
                            </span>{" "}
                            {otherLabels.length
                              ? otherLabels.join(", ")
                              : "—"}
                          </p>
                        ) : null}
                        {fallbackLabel ? (
                          <p className="text-xs font-semibold text-[var(--fg)]">
                            {fallbackLabel}
                          </p>
                        ) : null}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="block sm:col-span-2">
                          <span className="text-[11px] text-[var(--muted)]">
                            SKU
                          </span>
                          <input
                            value={row.sku}
                            onChange={(e) => {
                              const t = e.target.value;
                              setVeVariants((prev) =>
                                prev.map((r, i) =>
                                  i === vi ? { ...r, sku: t } : r,
                                ),
                              );
                            }}
                            className={`${inputClass()} font-mono text-xs`}
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11px] text-[var(--muted)]">
                            Stock
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={row.stock}
                            onChange={(e) => {
                              const n = parseInt(e.target.value, 10) || 0;
                              setVeVariants((prev) =>
                                prev.map((r, i) =>
                                  i === vi ? { ...r, stock: n } : r,
                                ),
                              );
                            }}
                            className={inputClass(true)}
                          />
                        </label>
                        <label className="flex items-center gap-2 pt-5">
                          <input
                            type="radio"
                            name="default-variant"
                            checked={row.isDefault}
                            onChange={() => {
                              setVeVariants((prev) =>
                                prev.map((r, i) => ({
                                  ...r,
                                  isDefault: i === vi,
                                })),
                              );
                            }}
                          />
                          <span className="text-xs">Default</span>
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="text-[11px] text-[var(--muted)]">
                            Price override (MAD, empty = product base)
                          </span>
                          <input
                            value={row.priceMad}
                            onChange={(e) => {
                              const t = e.target.value;
                              setVeVariants((prev) =>
                                prev.map((r, i) =>
                                  i === vi ? { ...r, priceMad: t } : r,
                                ),
                              );
                            }}
                            className={inputClass(true)}
                          />
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="text-[11px] text-[var(--muted)]">
                            Compare-at (MAD)
                          </span>
                          <input
                            value={row.compareAtMad}
                            onChange={(e) => {
                              const t = e.target.value;
                              setVeVariants((prev) =>
                                prev.map((r, i) =>
                                  i === vi
                                    ? { ...r, compareAtMad: t }
                                    : r,
                                ),
                              );
                            }}
                            className={inputClass(true)}
                          />
                        </label>
                        <label className="block sm:col-span-2 lg:col-span-4">
                          <span className="text-[11px] text-[var(--muted)]">
                            Variant media (upload images/videos)
                          </span>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <label className="cursor-pointer rounded-lg border border-[var(--border)] bg-white/90 px-3 py-2 text-xs font-medium text-[var(--fg)] dark:bg-black/25">
                              Upload image/video
                              <input
                                type="file"
                                accept="image/*,video/*"
                                className="sr-only"
                                onChange={(e) => {
                                  void uploadVariantRowMedia(vi, e.target.files);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              className="rounded-lg border border-[var(--border)] bg-white/90 px-3 py-2 text-xs font-medium text-[var(--fg)] dark:bg-black/25"
                              onClick={() =>
                                setVeVariants((prev) =>
                                  prev.map((r, i) =>
                                    i === vi ? { ...r, media: [] } : r,
                                  ),
                                )
                              }
                            >
                              Clear media
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-[var(--muted)]">
                            Links are disabled here — upload files directly.
                          </p>
                          {row.media[0] ? (
                            <div className="mt-2">
                              <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--border)]">
                                {isVideoUrl(row.media[0]) ? (
                                  <video
                                    src={row.media[0]}
                                    className="h-full w-full object-cover"
                                    muted
                                    playsInline
                                    loop
                                    autoPlay
                                  />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={row.media[0]}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                )}
                                <button
                                  type="button"
                                  className="absolute right-0 top-0 rounded-bl-md bg-black/65 px-1 text-[10px] text-white"
                                  onClick={() =>
                                    setVeVariants((prev) =>
                                      prev.map((r, i) =>
                                        i === vi ? { ...r, media: [] } : r,
                                      ),
                                    )
                                  }
                                >
                                  x
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </label>
                      </div>
                      <div className="mt-3 space-y-3 border-t border-[var(--border)] pt-3">
                        {variantOptionGroups.colorIdx.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                              Color / Couleur
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {variantOptionGroups.colorIdx.map((oix) =>
                                renderOptionSelect(oix),
                              )}
                            </div>
                          </div>
                        ) : null}
                        {variantOptionGroups.sizeIdx.length > 0 ? (
                          <div className="space-y-2 rounded-lg border border-[var(--border)]/80 bg-[var(--surface)]/40 p-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                              Size / Taille
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {variantOptionGroups.sizeIdx.map((oix) =>
                                renderOptionSelect(oix),
                              )}
                            </div>
                          </div>
                        ) : null}
                        {variantOptionGroups.otherIdx.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                              Other options
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {variantOptionGroups.otherIdx.map((oix) =>
                                renderOptionSelect(oix),
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="mt-2 rounded-lg border border-[var(--border)] bg-white/90 px-2 py-1 text-xs font-medium text-[var(--fg)] dark:bg-black/25"
                        onClick={() => void saveSingleVariantRow(vi)}
                      >
                        Save this row only
                      </button>
                      <button
                        type="button"
                        className="mt-2 text-xs text-rose-600"
                        onClick={() =>
                          setVeVariants((prev) =>
                            prev.filter((_, i) => i !== vi),
                          )
                        }
                      >
                        Remove row
                      </button>
                    </div>
                      );
                    })()
                  ))}
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--accent)]"
                  onClick={() =>
                    setVeVariants((prev) => [
                      ...prev,
                      {
                        sku: `${(skuReadonly || slug || "VAR").toUpperCase()}-${prev.length + 1}`,
                        priceMad: "",
                        compareAtMad: "",
                        stock: 0,
                        media: [],
                        isDefault: prev.length === 0,
                        valueIndexes: veOptions.map(() => 0),
                      },
                    ])
                  }
                >
                  + Add variant row manually
                </button>
              </div>
            ) : null}
          </CollapsibleSection>

          <details className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 opacity-90">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--muted)] [&::-webkit-details-marker]:hidden">
              Related products & bundles — planned
            </summary>
            <div className="border-t border-[var(--border)] px-4 pb-4 pt-2 text-xs text-[var(--muted)]">
              Cross-sells, upsells, and fixed bundles will live here. Tags below
              already help you group items for manual merchandising.
            </div>
          </details>

          <button
            type="button"
            onClick={() => setShowArabic((v) => !v)}
            className="text-xs font-medium text-[var(--accent)]"
          >
            {showArabic
              ? "Hide Arabic fields"
              : "Arabic title & description (optional)"}
          </button>
          {showArabic ? (
            <div className="space-y-3 rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface)]/90 p-4">
              <label className="block">
                <span className="text-xs text-[var(--muted)]">Name (Arabic)</span>
                <input
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  dir="rtl"
                  className={inputClass()}
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
                  className={inputClass()}
                />
              </label>
              <p className="text-xs text-[var(--muted)]">
                On create, empty Arabic fields copy from French automatically.
              </p>
            </div>
          ) : null}

          {mode === "edit" && productId ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Danger zone
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Products on past orders cannot be deleted — turn off{" "}
                <strong className="text-[var(--fg)]">Online store</strong>{" "}
                instead.
              </p>
              <button
                type="button"
                disabled={saving || deleting}
                onClick={() => void handleDelete()}
                className="mt-3 rounded-xl border border-rose-500/50 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-800 transition hover:bg-rose-500/25 disabled:opacity-50 dark:text-rose-200"
              >
                {deleting ? "Deleting…" : "Delete product"}
              </button>
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 p-4 shadow-sm backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Visibility
            </p>
            <label className="mt-3 flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent-hot)]"
              />
              <span className="text-sm text-[var(--fg)]">Online store</span>
            </label>
            <p className="mt-2 text-[11px] text-[var(--muted)]">
              Uncheck to save as draft (hidden from the catalog).
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 p-4 shadow-sm backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Storage details
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <span className="text-xs text-[var(--muted)]">SKU</span>
                <div className="mt-1 rounded-xl border border-[var(--border)] bg-black/[0.04] px-3 py-2 font-mono text-sm dark:bg-white/5">
                  {skuReadonly || "— auto on save —"}
                </div>
              </div>
              <label className="block">
                <span className="text-xs text-[var(--muted)]">Barcode</span>
                <input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="EAN / UPC / internal"
                  className={inputClass()}
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 p-4 shadow-sm backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Inventory
            </p>
            <label className="mt-3 flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={trackInventory}
                onChange={(e) => setTrackInventory(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent-hot)]"
              />
              <span className="text-sm text-[var(--fg)]">Track inventory</span>
            </label>
            <div
              className={`mt-3 space-y-3 ${!trackInventory ? "opacity-50" : ""}`}
            >
              <label className="block">
                <span className="text-xs text-[var(--muted)]">Stock quantity</span>
                <input
                  type="number"
                  min={0}
                  disabled={!trackInventory}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className={inputClass(true)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-[var(--muted)]">
                  Low-stock alert at
                </span>
                <input
                  type="number"
                  min={0}
                  disabled={!trackInventory}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className={inputClass(true)}
                />
              </label>
            </div>
            <p className="mt-2 text-[11px] text-[var(--muted)]">
              Threshold is stored on the product; dashboard alerts can use it
              next.
            </p>
          </div>

          <CollapsibleSection title="Category" defaultOpen>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                🔍
              </span>
              <input
                value={categoryQuery}
                onChange={(e) => setCategoryQuery(e.target.value)}
                placeholder="Start typing to search"
                className={`${inputClass()} pl-9`}
              />
            </div>
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[var(--border)] bg-white/60 p-2 dark:bg-black/20">
              {filteredCategories.length === 0 ? (
                <li className="px-2 py-2 text-xs text-[var(--muted)]">
                  No match — clear search or add categories in the backend.
                </li>
              ) : (
                filteredCategories.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={`w-full rounded-lg px-2 py-1.5 text-left text-sm transition ${
                        categoryId === c.id
                          ? "bg-[var(--accent)]/15 font-medium text-[var(--fg)]"
                          : "hover:bg-black/5 dark:hover:bg-white/10"
                      }`}
                    >
                      {c.nameFr}
                    </button>
                  </li>
                ))
              )}
            </ul>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-[var(--accent)]"
              onClick={() =>
                setMsg(
                  "New categories: add via API or a future Categories screen — this editor only assigns existing ones.",
                )
              }
            >
              + Add a new category
            </button>
          </CollapsibleSection>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 p-4 shadow-sm backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Tags & vendors
            </p>
            <label className="mt-3 block">
              <span className="text-xs text-[var(--muted)]">
                Tags (comma separated)
              </span>
              <input
                value={tagsLine}
                onChange={(e) => setTagsLine(e.target.value)}
                placeholder="summer, linen, bestseller"
                className={inputClass()}
              />
            </label>
            <label className="mt-3 block">
              <span className="text-xs text-[var(--muted)]">Vendor / supplier note</span>
              <input
                value={vendorNote}
                onChange={(e) => setVendorNote(e.target.value)}
                placeholder="Wholesaler, MOQ, lead time…"
                className={inputClass()}
              />
            </label>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 p-4 shadow-sm backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Internal notes
            </p>
            <textarea
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Staff-only — returns policy, QC notes, etc."
              className={inputClass()}
            />
          </div>
        </aside>

        {msg ? (
          <div className="lg:col-span-2">
            <p className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-900 dark:text-rose-100">
              {msg}
            </p>
          </div>
        ) : null}

        {/* Spacer for fixed bar on small screens inside form flow */}
        <div className="hidden lg:col-span-2 lg:block" aria-hidden />
      </motion.form>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--bg)]/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
        <div className="pointer-events-auto mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-2 px-4">
          <Link
            href="/admin?tab=products"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/90 px-4 py-2.5 text-sm text-[var(--fg)]"
          >
            Cancel
          </Link>
          <motion.button
            type="submit"
            form="product-editor-form"
            disabled={saving || deleting}
            whileHover={{ y: saving || deleting ? 0 : -1 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hot)] px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm disabled:opacity-50"
          >
            <span aria-hidden>💾</span>
            {saving
              ? "Saving…"
              : mode === "new"
                ? "Create product"
                : "Save"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
