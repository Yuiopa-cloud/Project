/**
 * Shared API base helpers — safe to import from Client Components (no `next/headers`).
 *
 * - Browser code should use {@link clientApiRoot} (`/api-proxy`) so requests stay same-origin;
 *   `next.config` rewrites `/api-proxy/*` → Railway (via `NEXT_PUBLIC_API_URL` or `BACKEND_PROXY_URL`).
 * - Server Components use `./get-server-api-root.ts` (direct API URL when env is set, else request host).
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
 * Client Components: always same-origin `/api-proxy` (dev + prod). Avoids CORS and mixed-content
 * issues. Requires `NEXT_PUBLIC_API_URL` or `BACKEND_PROXY_URL` on Vercel so rewrites target Railway.
 */
export function clientApiRoot(): string {
  return "/api-proxy";
}

export function logApiFailure(context: string, detail: unknown): void {
  console.error(`[atlas-api] ${context}`, detail);
}
