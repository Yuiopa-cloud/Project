"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Link, usePathname } from "@/i18n/navigation";
import { useTheme } from "./theme-provider";
import { AtlasLogo } from "./atlas-logo";
import { useCart } from "@/contexts/cart-context";
import { MotionLink } from "@/components/motion-link";

function IconSun({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconMenuLines({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function Navbar() {
  const t = useTranslations("nav");
  const tTheme = useTranslations("theme");
  const locale = useLocale();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { itemCount } = useCart();
  const otherLocale = locale === "fr" ? "ar" : "fr";
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/", label: t("home") },
    { href: "/shop", label: t("shop") },
    { href: "/faq", label: t("faq") },
    { href: "/contact", label: t("contact") },
    { href: "/cart", label: t("cart") },
    { href: "/admin", label: t("admin") },
  ];

  function navActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const localeTitle = otherLocale === "ar" ? "العربية" : "Français";

  useEffect(() => {
    queueMicrotask(() => setMobileOpen(false));
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="nav-futuristic sticky top-0 z-50 pt-[env(safe-area-inset-top)]"
    >
      <div className="relative z-10 mx-auto flex max-w-6xl min-h-[52px] items-center justify-between gap-1.5 px-2 py-1.5 min-[400px]:px-3 min-[400px]:gap-2 md:min-h-0 md:gap-3 md:px-4 md:py-2">
        <MotionLink
          href="/"
          className="group min-w-0 shrink-0 rounded-xl opacity-95 transition hover:opacity-100"
          onClick={() => setMobileOpen(false)}
        >
          <div className="origin-left scale-[0.92] min-[400px]:scale-[0.96] md:scale-100">
            <AtlasLogo size={34} />
          </div>
        </MotionLink>

        <nav className="nav-dock hidden max-w-[min(72vw,44rem)] items-center justify-center overflow-x-auto md:flex md:max-w-none md:flex-1 md:overflow-visible">
          {links.map((l) => (
            <MotionLink
              key={l.href}
              href={l.href}
              data-active={navActive(l.href) ? "true" : undefined}
              className="nav-dock-link relative shrink-0 whitespace-nowrap"
              whileHover={{ y: 0 }}
              whileTap={{ scale: 0.96 }}
            >
              {l.label}
              {l.href === "/cart" && itemCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--accent)] px-0.5 text-[0.55rem] font-bold leading-none text-[var(--bg)] shadow-[0_0_8px_var(--accent-glow)]">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              ) : null}
            </MotionLink>
          ))}
        </nav>

        <div className="ms-1 flex shrink-0 items-center gap-0.5 min-[400px]:gap-1 md:ms-0 md:gap-1.5">
          <motion.button
            type="button"
            className="nav-icon-toggle flex h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation items-center justify-center md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
            onClick={() => setMobileOpen((o) => !o)}
            whileTap={{ scale: 0.92 }}
          >
            {mobileOpen ? <IconClose /> : <IconMenuLines />}
          </motion.button>

          <div className="nav-util-pill">
            <motion.button
              type="button"
              className="nav-icon-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              whileTap={{ scale: 0.9 }}
              aria-label={
                theme === "dark" ? tTheme("light") : tTheme("dark")
              }
              title={
                theme === "dark" ? tTheme("light") : tTheme("dark")
              }
            >
              {theme === "dark" ? <IconSun /> : <IconMoon />}
            </motion.button>
            <div className="nav-util-divider" aria-hidden />
            <Link
              href={pathname}
              locale={otherLocale}
              className="nav-util-locale hover:text-[var(--accent)]"
              title={localeTitle}
              aria-label={localeTitle}
            >
              {otherLocale.toUpperCase()}
            </Link>
          </div>

          <MotionLink
            href="/cart"
            className="relative flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[var(--border)] bg-[var(--press-bg)] text-base md:h-8 md:w-8 md:min-h-0 md:min-w-0 md:text-sm"
            style={{ boxShadow: "0 0 20px -10px var(--accent-glow-soft)" }}
            aria-label={t("cart")}
          >
            <span className="leading-none" aria-hidden>
              🛒
            </span>
            {itemCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-0.5 text-[0.5rem] font-bold text-[var(--bg)]">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            ) : null}
          </MotionLink>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.nav
              id="mobile-nav-drawer"
              className="fixed inset-0 z-[100] flex flex-col bg-black/70 backdrop-blur-md md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="nav-glass flex items-center justify-between border-b border-[var(--border)] px-4 py-3 pt-[max(0.9rem,env(safe-area-inset-top))] pe-[max(0.9rem,env(safe-area-inset-end))] ps-[max(0.9rem,env(safe-area-inset-start))]"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {t("drawerTitle")}
                </span>
                <motion.button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--press-bg)] text-[var(--muted)]"
                  whileTap={{ scale: 0.92 }}
                  aria-label={t("closeMenu")}
                  onClick={() => setMobileOpen(false)}
                >
                  <IconClose />
                </motion.button>
              </div>
              <motion.ul
                className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3"
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {links.map((l) => (
                  <li key={l.href}>
                    <MotionLink
                      href={l.href}
                      data-active={navActive(l.href) ? "true" : undefined}
                      className={`relative flex min-h-[48px] items-center rounded-xl px-4 text-base font-medium transition ${
                        navActive(l.href)
                          ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                          : "text-[var(--fg)] hover:bg-[var(--press-bg)]"
                      }`}
                      onClick={() => setMobileOpen(false)}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="flex-1">{l.label}</span>
                      {l.href === "/cart" && itemCount > 0 ? (
                        <span className="ms-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-xs font-bold text-[var(--bg)]">
                          {itemCount > 9 ? "9+" : itemCount}
                        </span>
                      ) : null}
                    </MotionLink>
                  </li>
                ))}
              </motion.ul>
            </motion.nav>
          </>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
