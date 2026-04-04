"use client";

import { useTranslations } from "next-intl";

export function TopAnnouncementMarquee() {
  const t = useTranslations("announcement");

  return (
    <div
      className="store-announcement-bar sticky top-0 z-40 pt-[env(safe-area-inset-top)]"
      role="region"
      aria-label={t("shippingLong")}
    >
      <div className="flex h-7 items-center justify-center px-3 sm:h-8">
        <p className="text-center text-[0.55rem] font-medium uppercase tracking-[0.16em] text-white/95 sm:text-[0.58rem] sm:tracking-[0.18em]">
          {t("barLine")}
        </p>
      </div>
    </div>
  );
}
