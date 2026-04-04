"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { AtlasLogo } from "./atlas-logo";
import { MotionLink } from "@/components/motion-link";
import { FooterNewsletter } from "@/components/footer-newsletter";
import { IconInstagram } from "@/components/icon-instagram";
import {
  INSTAGRAM_URL,
  WHATSAPP_CHAT_URL,
  PHONE_DISPLAY_FR,
} from "@/lib/site-contact";

export function SiteFooter() {
  const t = useTranslations();
  const tFooter = useTranslations("footer");
  const tHome = useTranslations("home");

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mt-20 border-t border-[var(--border)] bg-[var(--footer-bg)] px-4 py-14 pb-[max(2rem,env(safe-area-inset-bottom))] md:px-6"
    >
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <MotionLink href="/" className="inline-flex rounded-xl">
            <AtlasLogo size={44} />
          </MotionLink>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
            {tFooter("tagline")}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--muted)] transition hover:border-[var(--accent)]/30 hover:text-[var(--accent)]"
              aria-label="Instagram"
            >
              <IconInstagram size={20} />
            </a>
            <a
              href={WHATSAPP_CHAT_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-semibold text-[var(--muted)] transition hover:border-[#25D366]/40 hover:text-[#25D366]"
            >
              WhatsApp
            </a>
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">{PHONE_DISPLAY_FR}</p>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {tFooter("colShop")}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <MotionLink href="/shop" className="footer-link text-[var(--fg)]">
                  {t("nav.shop")}
                </MotionLink>
              </li>
              <li>
                <MotionLink
                  href="/shop?sort=popular"
                  className="footer-link text-[var(--fg)]"
                >
                  {t("nav.deals")}
                </MotionLink>
              </li>
              <li>
                <MotionLink href="/cart" className="footer-link text-[var(--fg)]">
                  {t("nav.cart")}
                </MotionLink>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {tFooter("colCompany")}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <MotionLink href="/blog" className="footer-link text-[var(--fg)]">
                  {t("nav.blog")}
                </MotionLink>
              </li>
              <li>
                <MotionLink href="/contact" className="footer-link text-[var(--fg)]">
                  {t("nav.contact")}
                </MotionLink>
              </li>
              <li>
                <MotionLink href="/faq" className="footer-link text-[var(--fg)]">
                  {t("nav.faq")}
                </MotionLink>
              </li>
            </ul>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {tFooter("colCategories")}
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <li>
                <MotionLink
                  href="/shop?category=interieur"
                  className="footer-link text-[var(--fg)]"
                >
                  {tHome("catInterior")}
                </MotionLink>
              </li>
              <li>
                <MotionLink
                  href="/shop?category=exterieur"
                  className="footer-link text-[var(--fg)]"
                >
                  {tHome("catExterior")}
                </MotionLink>
              </li>
              <li>
                <MotionLink
                  href="/shop?category=performance"
                  className="footer-link text-[var(--fg)]"
                >
                  {tHome("catPerformance")}
                </MotionLink>
              </li>
              <li>
                <MotionLink
                  href="/shop?category=entretien"
                  className="footer-link text-[var(--fg)]"
                >
                  {tHome("catCare")}
                </MotionLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-3">
          <FooterNewsletter />
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-6xl rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-5">
        <Image
          src="/brand/trust-badges.png"
          alt={tFooter("trustBadgesAlt")}
          width={790}
          height={241}
          className="mx-auto h-auto max-h-20 w-full object-contain sm:max-h-24"
          sizes="(max-width: 768px) 100vw, 672px"
        />
      </div>

      <p className="mx-auto mt-8 max-w-6xl text-center text-[0.7rem] text-[var(--muted)]">
        © {new Date().getFullYear()} {t("brand")} · Maroc
      </p>
    </motion.footer>
  );
}
