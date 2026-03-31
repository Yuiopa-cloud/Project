/**
 * Shared API base helpers — safe to import from Client Components (no `next/headers`).
 *
 * Server-only resolution (request host + `/api-proxy`) lives in `./get-server-api-root.ts`.
 */

export const DEFAULT_BACKEND = "http://127.0.0.1:4000/api";

export function normalizeEnvBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return null;
  return `${raw.replace(/\/$/, "")}/api`;
}

/**
 * For Client Components. In **development**, always use same-origin `/api-proxy` so the browser
 * never calls `NEXT_PUBLIC_API_URL` directly (avoids CORS + localhost/127 mismatches and
 * “Failed to fetch” when that URL is wrong or unreachable).
 */
export function clientApiRoot(): string {
  if (process.env.NODE_ENV === "development") {
    return "/api-proxy";
  }
  const fromEnv = normalizeEnvBase();
  if (fromEnv) return fromEnv;
  return "/api-proxy";
}
