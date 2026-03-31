import { headers } from "next/headers";
import { DEFAULT_BACKEND, normalizeEnvBase } from "./api-config";

/**
 * Server Components / Route Handlers only — do not import from Client Components.
 */
export async function getServerApiRoot(): Promise<string> {
  const fromEnv = normalizeEnvBase();
  if (fromEnv) return fromEnv;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (host) return `${proto}://${host}/api-proxy`;
  } catch {
    /* headers() outside a request */
  }
  return DEFAULT_BACKEND;
}

export async function serverApiUrl(path: string): Promise<string> {
  const root = await getServerApiRoot();
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${root}/${p}`;
}
