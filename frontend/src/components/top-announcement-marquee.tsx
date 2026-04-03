"use client";

import { useTranslations } from "next-intl";

export function TopAnnouncementMarquee() {
  const t = useTranslations("announcement");
  const segment = `${t("shipping")} · `;
  const run = segment.repeat(10);

  return (
    <div
      className="top-announcement-marquee sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_90%,var(--accent)_10%)] pt-[env(safe-area-inset-top)] backdrop-blur-sm dark:bg-[color-mix(in_srgb,var(--card)_94%,var(--accent)_6%)]"
      role="region"
      aria-label={t("shippingLong")}
    >
      <div className="top-announcement-marquee-mask flex h-10 items-center overflow-hidden sm:h-11">
        <div
          className="top-announcement-marquee-track flex w-max shrink-0 will-change-transform"
          aria-hidden
        >
          <span className="inline-block shrink-0 whitespace-nowrap px-8 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--accent)] sm:text-xs">
            {run}
          </span>
          <span className="inline-block shrink-0 whitespace-nowrap px-8 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--accent)] sm:text-xs">
            {run}
          </span>
        </div>
      </div>
    </div>
  );
}
