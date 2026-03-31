"use client";

import { motion } from "framer-motion";
import { AtlasLogo } from "./atlas-logo";
import { MotionLink } from "@/components/motion-link";
import { IconInstagram } from "@/components/icon-instagram";
import {
  INSTAGRAM_URL,
  WHATSAPP_CHAT_URL,
  PHONE_DISPLAY_FR,
} from "@/lib/site-contact";

export function SiteFooter() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative mt-20 overflow-hidden border-t border-[var(--border)] bg-[var(--footer-bg)] px-3 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-12 md:px-4"
    >
      <div className="footer-aurora pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-start">
        <MotionLink href="/" className="flex items-center gap-3 rounded-xl">
          <AtlasLogo size={48} />
        </MotionLink>
        <p className="max-w-sm text-xs leading-relaxed text-[var(--muted)]">
          Accessoires automobile premium — livraison au Maroc, paiement à la
          livraison, service client WhatsApp.
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
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)] hover:shadow-[0_0_20px_-8px_var(--accent-glow)]"
              aria-label="Instagram @ysf._.xfk"
              title="Instagram @ysf._.xfk"
            >
              <IconInstagram size={20} />
            </a>
            <a
              href={WHATSAPP_CHAT_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[0.65rem] font-semibold text-[var(--muted)] transition hover:border-[#25D366]/50 hover:text-[#25D366]"
            >
              WhatsApp
            </a>
            <span className="text-[0.65rem] text-[var(--muted)]">{PHONE_DISPLAY_FR}</span>
          </div>
        </div>
      </div>
      <p className="relative mt-8 text-center text-[0.65rem] text-[var(--muted)]">
        © {new Date().getFullYear()} Atlas Auto · Maroc
      </p>
    </motion.footer>
  );
}
