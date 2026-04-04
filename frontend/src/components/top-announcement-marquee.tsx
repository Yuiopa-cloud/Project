"use client";

import { useTranslations } from "next-intl";

/** Solid promo strip (editorial / AURA-style): coral bar, centered uppercase line. */
export function TopAnnouncementMarquee() {
  const t = useTranslations("announcement");

  return (
    <div
      className="editorial-announcement-bar sticky top-0 z-40 pt-[env(safe-area-inset-top)]"
      role="region"
      aria-label={t("shippingLong")}
    >
      <div className="flex h-9 items-center justify-center px-4 sm:h-10">
        <p className="text-center text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-white sm:text-[0.68rem] sm:tracking-[0.26em]">
          {t("barLine")}
        </p>
      </div>
    </div>
  );
}
