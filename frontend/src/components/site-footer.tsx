"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { AtlasLogo } from "./atlas-logo";
import { MotionLink } from "@/components/motion-link";
import { IconInstagram } from "@/components/icon-instagram";
import {
  INSTAGRAM_URL,
  WHATSAPP_CHAT_URL,
  PHONE_DISPLAY_FR,
} from "@/lib/site-contact";

export function SiteFooter() {
  const t = useTranslations();
  const tFooter = useTranslations("footer");

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative mt-24 overflow-hidden border-t border-[var(--glass-border)] bg-[var(--footer-bg)] px-4 py-12 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-14 md:px-6"
    >
      <div className="footer-aurora pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-start">
        <MotionLink href="/" className="flex items-center gap-3 rounded-xl">
          <AtlasLogo size={48} />
        </MotionLink>
        <p className="max-w-sm text-sm leading-relaxed text-[var(--muted)]">
          {tFooter("tagline")}
        </p>
        <div className="flex flex-col items-center gap-5 md:items-end">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[var(--muted)] md:justify-end">
            <MotionLink href="/shop" className="footer-link">
              Boutique
            </MotionLink>
            <MotionLink href="/faq" className="footer-link">
              FAQ
            </MotionLink>
            <MotionLink href="/contact" className="footer-link">
              Contact
            </MotionLink>
            <MotionLink href="/admin" className="footer-link">
              Admin
            </MotionLink>
          </div>
          <div className="flex items-center justify-center gap-3 md:justify-end">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--muted)] backdrop-blur-md transition hover:border-[var(--accent)]/35 hover:text-[var(--accent)] hover:shadow-[0_0_24px_-8px_var(--accent-glow)]"
              aria-label="Instagram @ysf._.xfk"
              title="Instagram @ysf._.xfk"
            >
              <IconInstagram size={20} />
            </a>
            <a
              href={WHATSAPP_CHAT_URL}
              target="_blank"
              rel="noreferrer"
              className="min-h-[44px] rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-2 text-sm font-semibold text-[var(--muted)] backdrop-blur-md transition hover:border-[#25D366]/50 hover:text-[#25D366]"
            >
              WhatsApp
            </a>
            <span className="text-[0.65rem] text-[var(--muted)]">{PHONE_DISPLAY_FR}</span>
          </div>
        </div>
      </div>
      <div className="relative mx-auto mt-10 w-full max-w-3xl px-2">
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-5 shadow-inner backdrop-blur-xl">
          <Image
            src="/brand/trust-badges.png"
            alt={tFooter("trustBadgesAlt")}
            width={790}
            height={241}
            className="mx-auto h-auto w-full max-h-20 object-contain opacity-95 sm:max-h-24 md:max-h-[5.5rem] dark:brightness-[1.08] dark:contrast-[1.02]"
            sizes="(max-width: 768px) 100vw, 672px"
          />
        </div>
      </div>
      <p className="relative mt-8 text-center text-[0.65rem] text-[var(--muted)]">
        © {new Date().getFullYear()} {t("brand")} · Maroc
      </p>
    </motion.footer>
  );
}
