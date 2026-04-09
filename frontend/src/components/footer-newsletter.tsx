"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function FooterNewsletter() {
  const t = useTranslations("footer");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSent(true);
    setEmail("");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <p className="text-sm font-semibold text-[var(--fg)]">{t("newsletterTitle")}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{t("newsletterHint")}</p>
      <form
        onSubmit={onSubmit}
        className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-stretch"
      >
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("newsletterPlaceholder")}
          className="min-h-11 min-w-0 w-full rounded-xl border border-[var(--border)] bg-[var(--press-bg)] px-3 text-sm text-[var(--fg)] placeholder:text-[var(--muted)]"
          autoComplete="email"
        />
        <button
          type="submit"
          className="min-h-11 w-full whitespace-nowrap rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-to)] sm:w-auto sm:px-5"
        >
          {t("newsletterCta")}
        </button>
      </form>
      {sent ? (
        <p className="mt-2 text-xs font-medium text-[var(--accent)]" role="status">
          {t("newsletterThanks")}
        </p>
      ) : null}
    </div>
  );
}
