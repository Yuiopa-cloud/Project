"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "@/i18n/navigation";
import { AtlasLogo } from "./atlas-logo";
import { useCart } from "@/contexts/cart-context";
import { useCartFly } from "@/contexts/cart-fly-context";
import { MotionLink } from "@/components/motion-link";

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

function IconSearch({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function Navbar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { itemCount, addBumpSeq, openDrawer } = useCart();
  const { registerCartAnchor } = useCartFly();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduceMotion = useReducedMotion();

  const dealsActive =
    pathname.startsWith("/shop") && searchParams.get("sort") === "popular";

  const desktopLinks: { href: string; label: string; active: () => boolean }[] =
    [
      { href: "/", label: t("home"), active: () => pathname === "/" },
      {
        href: "/shop",
        label: t("shop"),
        active: () =>
          pathname.startsWith("/shop") &&
          searchParams.get("sort") !== "popular",
      },
      {
        href: "/blog",
        label: t("blog"),
        active: () => pathname.startsWith("/blog"),
      },
      {
        href: "/contact",
        label: t("contact"),
        active: () => pathname.startsWith("/contact"),
      },
      {
        href: "/shop?sort=popular",
        label: t("deals"),
        active: () => dealsActive,
      },
    ];

  const mobileLinks = desktopLinks.map((l) => ({
    href: l.href,
    label: l.label,
  }));

  useEffect(() => {
    queueMicrotask(() => setMobileOpen(false));
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const floatLink = (active: boolean) =>
    `rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-200 ${
      active
        ? "bg-[var(--accent)] text-white shadow-[0_6px_20px_-6px_color-mix(in_srgb,var(--accent)_55%,transparent)]"
        : "text-[var(--fg)] hover:bg-[var(--press-bg)]"
    }`;

  return (
    <motion.header
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`nav-futuristic sticky top-[calc(env(safe-area-inset-top)+1.75rem)] z-50 sm:top-[calc(env(safe-area-inset-top)+2rem)] transition-shadow duration-200 ${scrolled ? "nav-scrolled" : ""}`}
    >
      <div className="relative z-10 mx-auto grid h-14 max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <motion.button
            type="button"
            className="nav-icon-toggle flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--fg)] lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
            onClick={() => setMobileOpen((o) => !o)}
            whileTap={{ scale: 0.95 }}
          >
            {mobileOpen ? <IconClose className="h-5 w-5" /> : <IconMenuLines className="h-5 w-5" />}
          </motion.button>

          <MotionLink
            href="/"
            className="shrink-0 rounded-xl"
            onClick={() => setMobileOpen(false)}
          >
            <span className="lg:hidden">
              <AtlasLogo size={34} />
            </span>
            <span className="hidden lg:inline-flex">
              <AtlasLogo size={38} />
            </span>
          </MotionLink>
        </div>

        <nav
          className="hidden justify-center justify-self-center lg:flex"
          aria-label={t("drawerTitle")}
        >
          <div className="flex flex-wrap items-center justify-center gap-1 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_94%,transparent)] px-1.5 py-1 shadow-[0_10px_34px_-14px_rgba(76,29,18,0.22)] backdrop-blur-md">
            {desktopLinks.map((l) => (
              <MotionLink
                key={l.href}
                href={l.href}
                className={floatLink(l.active())}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
              >
                {l.label}
              </MotionLink>
            ))}
          </div>
        </nav>

        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
          <MotionLink
            href="/shop"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--press-bg)] hover:text-[var(--accent)]"
            aria-label={t("searchAria")}
            title={t("searchAria")}
            whileTap={{ scale: 0.95 }}
          >
            <IconSearch className="h-5 w-5" />
          </MotionLink>

          <MotionLink
            href="/dashboard"
            className="hidden h-10 w-10 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--press-bg)] hover:text-[var(--accent)] sm:flex"
            aria-label={t("account")}
            title={t("account")}
            whileTap={{ scale: 0.95 }}
          >
            <IconUser className="h-5 w-5" />
          </MotionLink>

          <span
            ref={registerCartAnchor}
            className="inline-flex rounded-lg"
            data-cart-anchor
          >
            <motion.button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--press-bg)] text-lg transition hover:border-[var(--accent)]/30 hover:text-[var(--accent)]"
              aria-label={t("cart")}
              aria-haspopup="dialog"
              whileTap={{ scale: 0.95 }}
              onClick={() => openDrawer()}
            >
              <motion.span
                key={addBumpSeq}
                aria-hidden
                animate={
                  reduceMotion || addBumpSeq === 0
                    ? {}
                    : { scale: [1, 1.15, 1] }
                }
                transition={{ duration: 0.4 }}
              >
                🛒
              </motion.span>
              {itemCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-0.5 text-[0.5rem] font-bold text-white">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              ) : null}
            </motion.button>
          </span>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.nav
            id="mobile-nav-drawer"
            className="fixed inset-0 z-50 flex h-dvh flex-col bg-[var(--bg)]/98 backdrop-blur-md lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <span className="text-sm font-semibold text-[var(--fg)]">
                {t("drawerTitle")}
              </span>
              <motion.button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)]"
                whileTap={{ scale: 0.92 }}
                aria-label={t("closeMenu")}
                onClick={() => setMobileOpen(false)}
              >
                <IconClose />
              </motion.button>
            </div>
            <ul className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {mobileLinks.map((l) => {
                const def = desktopLinks.find((d) => d.href === l.href);
                const active = def ? def.active() : pathname.startsWith(l.href);
                return (
                  <li key={l.href}>
                    <MotionLink
                      href={l.href}
                      className={`flex min-h-[48px] items-center rounded-xl px-4 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                          : "text-[var(--fg)] hover:bg-[var(--press-bg)]"
                      }`}
                      onClick={() => setMobileOpen(false)}
                      whileTap={{ scale: 0.99 }}
                    >
                      <span className="flex-1">{l.label}</span>
                    </MotionLink>
                  </li>
                );
              })}
              <li>
                <motion.button
                  type="button"
                  className="flex min-h-[48px] w-full items-center rounded-xl px-4 text-start text-sm font-semibold text-[var(--fg)] hover:bg-[var(--press-bg)]"
                  onClick={() => {
                    setMobileOpen(false);
                    openDrawer();
                  }}
                  whileTap={{ scale: 0.99 }}
                >
                  <span className="flex-1">{t("cart")}</span>
                  {itemCount > 0 ? (
                    <span className="ms-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-xs font-bold text-white">
                      {itemCount > 9 ? "9+" : itemCount}
                    </span>
                  ) : null}
                </motion.button>
              </li>
              <li className="pt-2">
                <MotionLink
                  href="/dashboard"
                  className="flex min-h-[48px] items-center gap-2 rounded-xl px-4 text-sm font-medium text-[var(--muted)] hover:bg-[var(--press-bg)]"
                  onClick={() => setMobileOpen(false)}
                >
                  <IconUser className="h-5 w-5" />
                  {t("account")}
                </MotionLink>
              </li>
            </ul>
          </motion.nav>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
