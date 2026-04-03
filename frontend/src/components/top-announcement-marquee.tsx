"use client";

import { useTranslations } from "next-intl";

export function TopAnnouncementMarquee() {
  const t = useTranslations("announcement");
  const segment = `${t("shipping")} · `;
  const run = segment.repeat(10);

  return (
    <div
      className="top-announcement-marquee sticky top-0 z-40 border-b border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--bg)_72%,transparent)] pt-[env(safe-area-inset-top)] backdrop-blur-md"
      role="region"
      aria-label={t("shippingLong")}
    >
      <div className="top-announcement-marquee-mask flex h-9 items-center overflow-hidden sm:h-10">
        <div
          className="top-announcement-marquee-track flex w-max shrink-0 will-change-transform"
          aria-hidden
        >
          <span className="inline-block shrink-0 whitespace-nowrap px-8 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--accent)_88%,var(--muted))] sm:text-[0.68rem]">
            {run}
          </span>
          <span className="inline-block shrink-0 whitespace-nowrap px-8 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--accent)_88%,var(--muted))] sm:text-[0.68rem]">
            {run}
          </span>
        </div>
      </div>
    </div>
  );
}
