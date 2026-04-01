import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string; totalMad?: string }>;
}) {
  const t = await getTranslations("checkout");
  const q = await searchParams;
  const orderNumber = q.orderNumber?.trim() || "—";
  const totalMad = q.totalMad?.trim();

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <div className="card-chrome rounded-3xl p-7 text-center md:p-10">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
          {t("successTitle")}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[var(--fg)]">
          {t("successLead")}
        </h1>
        <p className="mt-5 text-sm text-[var(--muted)]">
          {t("successOrderLabel")}:{" "}
          <span className="font-semibold text-[var(--fg)]">{orderNumber}</span>
        </p>
        {totalMad ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("successTotal")}:{" "}
            <span className="font-semibold text-[var(--fg)]">{totalMad} MAD</span>
          </p>
        ) : null}
        <div className="mt-8 flex justify-center">
          <Link
            href="/shop"
            className="btn-primary-motion inline-flex rounded-full px-5 py-2.5 text-sm font-semibold"
          >
            {t("successShopAgain")}
          </Link>
        </div>
      </div>
    </div>
  );
}

