import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function BlogPage() {
  const t = await getTranslations("blog");

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:py-16">
      <p className="section-eyebrow">{t("eyebrow")}</p>
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-[var(--fg)]">
        {t("title")}
      </h1>
      <p className="mt-4 text-base leading-relaxed text-[var(--muted)]">{t("body")}</p>
      <Link
        href="/shop"
        className="mt-10 inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--accent)] px-6 text-sm font-semibold text-white"
      >
        {t("ctaShop")}
      </Link>
    </div>
  );
}
