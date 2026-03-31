import { headers } from "next/headers";
import {
  DEFAULT_BACKEND_DEV,
  normalizeApiBaseFromEnv,
} from "./api-config";

/**
 * Server Components / Route Handlers only — do not import from Client Components.
 */
export async function getServerApiRoot(): Promise<string> {
  const fromEnv = normalizeApiBaseFromEnv();
  if (fromEnv) return fromEnv;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (host) return `${proto}://${host}/api-proxy`;
  } catch {
    /* headers() outside a request */
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}/api-proxy`;
  }
  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_BACKEND_DEV;
  }
  console.warn(
    "[Atlas] getServerApiRoot: set NEXT_PUBLIC_API_URL (or rely on VERCEL_URL / Host) so SSR can reach the API.",
  );
  return DEFAULT_BACKEND_DEV;
}

export async function serverApiUrl(path: string): Promise<string> {
  const root = await getServerApiRoot();
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${root}/${p}`;
}
