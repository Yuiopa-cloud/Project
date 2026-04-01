import { AdminOrderDetailsClient } from "./order-details-client";

export default async function AdminOrderDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  return <AdminOrderDetailsClient orderId={id} />;
}

