"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { GA_MEASUREMENT_ID, pageview } from "@/lib/analytics";

function RouteChangeTracker() {
  const pathname = usePathname();
  const isFirstPath = useRef(true);

  useEffect(() => {
    if (!pathname) return;
    if (isFirstPath.current) {
      isFirstPath.current = false;
      return;
    }
    pageview(pathname);
  }, [pathname]);

  return null;
}

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
      <RouteChangeTracker />
    </>
  );
}
