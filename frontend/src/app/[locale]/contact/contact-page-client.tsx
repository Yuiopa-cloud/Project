"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { MotionLink } from "@/components/motion-link";
import { IconInstagram } from "@/components/icon-instagram";
import {
  WHATSAPP_CHAT_URL,
  PHONE_TEL_HREF,
  PHONE_DISPLAY_FR,
  INSTAGRAM_URL,
  INSTAGRAM_HANDLE,
} from "@/lib/site-contact";

const spring = { type: "spring" as const, stiffness: 380, damping: 28 };

function ContactCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={`card-chrome rounded-2xl p-4 sm:p-5 md:p-6 ${className}`}
      whileHover={{ y: -4, transition: spring }}
      whileTap={{ scale: 0.99 }}
      transition={spring}
    >
      {children}
    </motion.div>
  );
}

export function ContactPageClient() {
  const t = useTranslations("contact");
  const email = t("supportEmail");
  const [hoursOpen, setHoursOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2200);
    } catch {
      setCopyState("idle");
    }
  }

  return (
    <div className="mx-auto max-w-3xl py-8 pb-[max(2rem,env(safe-area-inset-bottom))] ps-[max(0.75rem,env(safe-area-inset-left))] pe-[max(0.75rem,env(safe-area-inset-right))] pt-6 sm:px-4 sm:pb-10 sm:ps-4 sm:pe-4 sm:pt-10 md:py-14 md:pt-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="text-center"
      >
        <div className="mb-5 flex flex-wrap justify-center gap-2">
          {[t("badgeFast"), t("badgeHuman"), t("badgeCod")].map((label) => (
            <span
              key={label}
              className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent-dim)] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--accent)]"
            >
              {label}
            </span>
          ))}
        </div>
        <h1 className="text-[1.65rem] font-semibold leading-tight tracking-tight text-[var(--fg)] min-[400px]:text-3xl md:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-[var(--muted)] sm:text-[1.05rem]">
          {t("lead")}
        </p>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[var(--muted)] sm:text-base">
          {t("body")}
        </p>
      </motion.div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <ContactCard>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">
            {t("whatsappCardTitle")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {t("whatsappCardDesc")}
          </p>
          <motion.a
            href={WHATSAPP_CHAT_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-whatsapp btn-primary-motion mt-5 inline-flex min-h-12 w-full touch-manipulation items-center justify-center px-4 text-sm active:scale-[0.98] sm:min-h-11"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={spring}
          >
            {t("whatsappCta")}
          </motion.a>
        </ContactCard>

        <ContactCard>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent-hot)]">
            {t("emailCardTitle")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {t("emailCardDesc")}
          </p>
          <p className="mt-4 break-all font-mono text-sm text-[var(--fg)]">
            {email}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <motion.a
              href={`mailto:${email}?subject=Atlas%20Auto%20—%20contact`}
              className="btn-primary inline-flex min-h-12 flex-1 touch-manipulation items-center justify-center px-4 text-center text-sm active:scale-[0.98] sm:min-h-11"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
            >
              {t("emailCta")}
            </motion.a>
            <motion.button
              type="button"
              onClick={() => void copyEmail()}
              className="btn-secondary min-h-12 flex-1 touch-manipulation px-4 text-sm active:scale-[0.98] sm:min-h-11"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
            >
              {copyState === "copied" ? t("copied") : t("copyEmail")}
            </motion.button>
          </div>
        </ContactCard>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ContactCard>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
            {t("phoneCardTitle")}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">{t("phoneCardDesc")}</p>
          <p className="mt-4 text-lg font-semibold tracking-tight text-[var(--fg)]">
            {PHONE_DISPLAY_FR}
          </p>
          <motion.a
            href={PHONE_TEL_HREF}
            className="btn-secondary mt-4 inline-flex min-h-12 w-full touch-manipulation items-center justify-center px-4 text-sm active:scale-[0.98] sm:min-h-11"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={spring}
          >
            {t("phoneCta")}
          </motion.a>
        </ContactCard>

        <motion.a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className="card-chrome group flex flex-col gap-4 rounded-2xl p-5 transition hover:border-[var(--accent-hot)]/35 hover:shadow-[0_0_32px_-12px_var(--accent-glow-soft)] md:flex-row md:items-center md:p-6"
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.99 }}
          transition={spring}
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] shadow-lg">
            <IconInstagram className="text-white" size={30} />
          </div>
          <div className="min-w-0 flex-1 text-start">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent-hot)]">
              {t("instagramSectionTitle")}
            </p>
            <p className="mt-1 font-semibold text-[var(--fg)]">{t("instagramTitle")}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{t("instagramDesc")}</p>
            <p className="mt-2 text-sm font-mono text-[var(--accent)]">
              {t("instagramHandleLabel")}: @{INSTAGRAM_HANDLE}
            </p>
            <span className="mt-3 inline-block text-sm font-semibold text-[var(--accent-hot)] group-hover:underline">
              {t("instagramCta")} →
            </span>
          </div>
        </motion.a>
      </div>

      <motion.button
        type="button"
        onClick={() => setHoursOpen((o) => !o)}
        className="card-chrome mt-4 min-h-[3.25rem] w-full touch-manipulation rounded-2xl p-4 text-start transition hover:border-[var(--accent)]/25 min-[400px]:p-5 md:p-6"
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--muted)]">
              {t("hoursTitle")}
            </p>
            <p className="mt-1 font-medium text-[var(--fg)]">{t("hoursSummary")}</p>
          </div>
          <span className="text-[var(--accent)]" aria-hidden>
            {hoursOpen ? "−" : "+"}
          </span>
        </div>
        <AnimatePresence initial={false}>
          {hoursOpen ? (
            <motion.p
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3 overflow-hidden text-sm text-[var(--muted)]"
            >
              {t("hoursDetail")}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </motion.button>

      <ContactCard className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">
          {t("deliveryTitle")}
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">{t("deliveryDesc")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <MotionLink href="/faq" className="btn-secondary text-sm">
            {t("deliveryCta")}
          </MotionLink>
        </div>
      </ContactCard>

      <div className="mt-10">
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          {t("exploreTitle")}
        </p>
        <div className="flex flex-col gap-2.5 min-[480px]:flex-row min-[480px]:flex-wrap min-[480px]:justify-center min-[480px]:gap-3">
          <MotionLink
            href="/shop"
            className="btn-primary min-h-12 w-full touch-manipulation justify-center text-center text-sm active:scale-[0.98] min-[480px]:min-h-11 min-[480px]:w-auto"
          >
            {t("exploreShop")}
          </MotionLink>
          <MotionLink
            href="/faq"
            className="btn-secondary min-h-12 w-full touch-manipulation justify-center text-center text-sm active:scale-[0.98] min-[480px]:min-h-11 min-[480px]:w-auto"
          >
            {t("exploreFaq")}
          </MotionLink>
        </div>
      </div>
    </div>
  );
}
