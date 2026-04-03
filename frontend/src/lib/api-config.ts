/**
 * Shared API base helpers — safe to import from Client Components (no `next/headers`).
 *
 * - Browser: {@link clientApiRoot} uses `NEXT_PUBLIC_API_URL` when set (direct `…/api` base, CORS on API);
 *   otherwise same-origin `/api-proxy` (rewritten by `next.config`).
 * - Server Components use `./get-server-api-root.ts` (env first, then proxy host, then dev fallback).
 */

/** Dev-only fallback when no env and no request host (e.g. local `next dev`). */
export const DEFAULT_BACKEND_DEV = "http://127.0.0.1:4000/api";

export function normalizeApiBaseFromEnv(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return null;
  const normalized = raw.replace(/\/$/, "");
  if (normalized.endsWith("/api")) return normalized;
  return `${normalized}/api`;
}

/** Server-side: Vercel build sets BACKEND_PROXY_URL for rewrites; use same origin for SSR fetches. */
export function apiBaseFromBackendProxy(): string | null {
  const u = process.env.BACKEND_PROXY_URL?.trim().replace(/\/$/, "");
  if (!u) return null;
  if (u.endsWith("/api")) return u;
  return `${u}/api`;
}

/** @deprecated use normalizeApiBaseFromEnv */
export const normalizeEnvBase = normalizeApiBaseFromEnv;

/**
 * Client Components: if `NEXT_PUBLIC_API_URL` is set, returns that API root (…/api) for direct fetches.
 * Otherwise same-origin `/api-proxy` (production / default dev rewrite to backend).
 */
export function clientApiRoot(): string {
  const fromEnv = normalizeApiBaseFromEnv();
  if (fromEnv) return fromEnv;
  return "/api-proxy";
}

export function logApiFailure(context: string, detail: unknown): void {
  console.error(`[atlas-api] ${context}`, detail);
}
