"use client";

import { useEffect, type ReactNode } from "react";

/** Light mode only — sets document theme flags once (no dark mode). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    document.documentElement.classList.remove("dark");
    try {
      localStorage.removeItem("atlas-theme");
    } catch {
      /* ignore */
    }
  }, []);
  return <>{children}</>;
}
