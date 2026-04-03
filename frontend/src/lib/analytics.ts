/** GA4 measurement ID — override with NEXT_PUBLIC_GA_MEASUREMENT_ID; set to "" to disable. */
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID === ""
    ? ""
    : (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-W8LXD48THG");

type GtagEventParams = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function pageview(path: string) {
  if (typeof window === "undefined" || !GA_MEASUREMENT_ID) return;
  if (typeof window.gtag !== "function") return;
  window.gtag("config", GA_MEASUREMENT_ID, {
    page_path: path,
  });
}

export function trackEvent(
  action: string,
  params?: GtagEventParams,
): void {
  if (typeof window === "undefined") return;
  window.gtag?.("event", action, params ?? {});
}
