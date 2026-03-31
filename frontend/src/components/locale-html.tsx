"use client";

import { useEffect } from "react";

export function LocaleHtmlAttributes({
  locale,
  dir,
}: {
  locale: string;
  dir: "ltr" | "rtl";
}) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);
  return null;
}
