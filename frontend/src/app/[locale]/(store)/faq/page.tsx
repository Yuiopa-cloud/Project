import { getTranslations } from "next-intl/server";

export default async function FaqPage() {
  const t = await getTranslations("faq");
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-[var(--fg)]">{t("title")}</h1>
      <dl className="mt-8 space-y-6 text-sm">
        <div>
          <dt className="font-medium text-[var(--fg)]">{t("q1")}</dt>
          <dd className="mt-2 text-[var(--muted)]">{t("a1")}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--fg)]">{t("q2")}</dt>
          <dd className="mt-2 text-[var(--muted)]">{t("a2")}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--fg)]">{t("q3")}</dt>
          <dd className="mt-2 text-[var(--muted)]">{t("a3")}</dd>
        </div>
      </dl>
    </div>
  );
}
