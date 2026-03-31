import { getServerApiRoot } from "./get-server-api-root";

export type ServerFetchResult<T> =
  | { ok: true; data: T; url: string }
  | {
      ok: false;
      url: string;
      status?: number;
      text?: string;
      cause?: unknown;
    };

/**
 * Server Components only — fetches JSON from the Nest `/api` base (env, proxy URL, or same-origin /api-proxy).
 */
export async function serverFetchApiJson<T>(
  apiPath: string,
  init?: RequestInit,
): Promise<ServerFetchResult<T>> {
  const base = await getServerApiRoot();
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(
        "[Atlas serverFetchApi]",
        res.status,
        url,
        text?.slice?.(0, 500),
      );
      return { ok: false, status: res.status, text, url };
    }
    const data = (await res.json()) as T;
    if (process.env.NODE_ENV === "development") {
      const items = (data as { items?: unknown[] })?.items;
      console.log(
        "[Atlas serverFetchApi] OK",
        url,
        Array.isArray(items) ? `items=${items.length}` : "json",
      );
    }
    return { ok: true, data, url };
  } catch (cause) {
    console.error("[Atlas serverFetchApi] fetch failed", url, cause);
    return { ok: false, url, cause };
  }
}
