import { ThankYouClient } from "./thank-you-client";

function normalizePayment(
  raw: string | undefined,
): "CASH_ON_DELIVERY" | "STRIPE" {
  return raw === "STRIPE" ? "STRIPE" : "CASH_ON_DELIVERY";
}

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{
    orderNumber?: string;
    totalMad?: string;
    payment?: string;
  }>;
}) {
  const q = await searchParams;
  const orderNumber = q.orderNumber?.trim() || "—";
  const totalMad = q.totalMad?.trim();
  const payment = normalizePayment(q.payment);

  return (
    <ThankYouClient
      orderNumber={orderNumber}
      totalMad={totalMad}
      payment={payment}
    />
  );
}

