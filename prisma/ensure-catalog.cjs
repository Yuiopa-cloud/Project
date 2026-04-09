/**
 * Railway bootstrap: ensure delivery zones exist when the DB is empty of zones.
 * Does NOT create products (catalog is managed manually or via prisma db seed).
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const productCount = await prisma.product.count({ where: { isActive: true } });
  // eslint-disable-next-line no-console
  console.log('[ensure-catalog] active products:', productCount);

  const zoneCount = await prisma.deliveryZone.count({ where: { isActive: true } });
  if (zoneCount > 0) {
    // eslint-disable-next-line no-console
    console.log('[ensure-catalog] delivery zones:', zoneCount, '— skip zone seed');
    return;
  }

  // eslint-disable-next-line no-console
  console.log('[ensure-catalog] no delivery zones — seeding minimal zones only');

  const zones = [
    {
      cityCode: 'CASA',
      cityNameFr: 'Casablanca',
      cityNameAr: 'الدار البيضاء',
      shipping: 29,
      threshold: 499,
    },
    {
      cityCode: 'RABAT',
      cityNameFr: 'Rabat',
      cityNameAr: 'الرباط',
      shipping: 35,
      threshold: 499,
    },
  ];

  for (const z of zones) {
    await prisma.deliveryZone.upsert({
      where: { cityCode: z.cityCode },
      update: { isActive: true },
      create: {
        cityCode: z.cityCode,
        cityNameFr: z.cityNameFr,
        cityNameAr: z.cityNameAr,
        shippingCostMad: z.shipping,
        freeShippingThresholdMad: z.threshold,
        isActive: true,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('[ensure-catalog] done (zones only, no products)');
}

main()
  .catch((e) => {
    console.error('[ensure-catalog] failed', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
