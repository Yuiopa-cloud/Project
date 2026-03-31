import { getTranslations } from "next-intl/server";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-[var(--fg)]">{t("title")}</h1>
      <p className="mt-4 text-sm text-[var(--muted)]">
        {t("orders")}: consommer{" "}
        <code className="rounded bg-[var(--accent-dim)] px-1 text-[var(--accent)]">
          GET /api/orders/me
        </code>{" "}
        avec JWT.
      </p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {t("points")}:{" "}
        <code className="rounded bg-[var(--accent-dim)] px-1 text-[var(--accent)]">
          GET /api/loyalty/me
        </code>
      </p>
    </div>
  );
}
