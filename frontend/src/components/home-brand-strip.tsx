"use client";

import { useTranslations } from "next-intl";

export function HomeBrandStrip() {
  const t = useTranslations("home");

  const names = [
    t("brandStrip1"),
    t("brandStrip2"),
    t("brandStrip3"),
    t("brandStrip4"),
    t("brandStrip5"),
  ];

  return (
    <section
      className="mt-16 border-y border-[var(--border)] bg-[var(--press-bg)]/50 py-10 sm:mt-20"
      aria-label={t("brandStripAria")}
    >
      <p className="section-eyebrow mb-6 text-center">{t("brandStripTitle")}</p>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-6 px-4 opacity-70">
        {names.map((name) => (
          <span
            key={name}
            className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]"
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
