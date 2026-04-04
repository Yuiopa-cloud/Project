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
      <div className="flex h-7 items-center justify-center px-3 sm:h-8">
        <p className="text-center text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-white sm:text-[0.58rem] sm:tracking-[0.2em]">
          {t("barLine")}
        </p>
      </div>
    </div>
  );
}
