/**
 * Deletes every order (admin dashboard order list starts empty).
 * Does not change users, passwords, products, or categories.
 *
 * Clears FKs: ReferralEvent rows tied to orders, LoyaltyTransaction.orderId,
 * AbandonedCart.recoveredOrderId. OrderItem + FraudFlag cascade with Order.
 *
 *   CLEAR_ORDERS_YES=1 node prisma/clear-orders.cjs
 *   # or
 *   node prisma/clear-orders.cjs --yes
 *
 * Requires DATABASE_URL (e.g. Railway: paste URL for one-off local run, or `railway run`).
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const ok =
    process.argv.includes('--yes') ||
    process.env.CLEAR_ORDERS_YES === '1' ||
    process.env.CLEAR_ORDERS_YES === 'true';
  if (!ok) {
    console.error(
      '[clear-orders] Refusing to run. Set CLEAR_ORDERS_YES=1 or pass --yes',
    );
    process.exit(1);
  }

  const n = await prisma.order.count();
  if (n === 0) {
    // eslint-disable-next-line no-console
    console.log('[clear-orders] No orders in database — nothing to do.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.referralEvent.deleteMany({
      where: { orderId: { not: null } },
    });
    await tx.loyaltyTransaction.updateMany({
      where: { orderId: { not: null } },
      data: { orderId: null },
    });
    await tx.abandonedCart.updateMany({
      where: { recoveredOrderId: { not: null } },
      data: { recoveredOrderId: null },
    });
    await tx.order.deleteMany({});
  });

  // eslint-disable-next-line no-console
  console.log(
    `[clear-orders] Removed ${n} order(s). Restock products in admin if test sales lowered inventory.`,
  );
}

main()
  .catch((e) => {
    console.error('[clear-orders] failed', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
