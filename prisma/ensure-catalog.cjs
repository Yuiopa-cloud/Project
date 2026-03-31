/**
 * If there are no active products, seed a minimal catalog + delivery zones so
 * shop + checkout work on a fresh Railway DB without running full `prisma db seed`.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.product.count({ where: { isActive: true } });
  if (count > 0) {
    // eslint-disable-next-line no-console
    console.log('[ensure-catalog] active products:', count, '— skip');
    return;
  }

  // eslint-disable-next-line no-console
  console.log('[ensure-catalog] no products — seeding minimal catalog');

  const cInterior = await prisma.category.upsert({
    where: { slug: 'interieur' },
    update: {},
    create: {
      slug: 'interieur',
      nameFr: 'Intérieur & Confort',
      nameAr: 'الداخل والراحة',
      sortOrder: 1,
    },
  });

  const cPerformance = await prisma.category.upsert({
    where: { slug: 'performance' },
    update: {},
    create: {
      slug: 'performance',
      nameFr: 'Performance',
      nameAr: 'الأداء',
      sortOrder: 3,
    },
  });

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

  await prisma.product.upsert({
    where: { sku: 'ATL-ALU-MAT01' },
    update: { isActive: true },
    create: {
      sku: 'ATL-ALU-MAT01',
      slug: 'tapis-aluminium-premium',
      nameFr: 'Tapis aluminium premium — effet métal brossé',
      nameAr: 'سجات ألمنيوم بريميوم',
      descriptionFr:
        'Finition premium, bords cousus, résistant eau & boue. Look sport haut de gamme pour SUV et berlines.',
      descriptionAr:
        'تشطيب عالي الجودة، حواف مخيطة، مقاوم للماء والطين.',
      priceMad: 449,
      compareAtMad: 549,
      stock: 32,
      lowStockThreshold: 5,
      purchaseCount: 128,
      images: [
        'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=800',
      ],
      categoryId: cInterior.id,
      metadata: { material: 'PVC + textile', fit: 'universal trimmable' },
    },
  });

  await prisma.product.upsert({
    where: { sku: 'ATL-LED-DRL02' },
    update: { isActive: true },
    create: {
      sku: 'ATL-LED-DRL02',
      slug: 'feux-jour-led-matrix',
      nameFr: 'Feux jour LED — signature Matrix',
      nameAr: 'إضاءة نهارية LED',
      descriptionFr:
        'Module LED haute définition. Installation plug-and-play sur supports universels.',
      descriptionAr: 'وحدة LED عالية الوضوح.',
      priceMad: 899,
      stock: 14,
      lowStockThreshold: 6,
      purchaseCount: 64,
      images: [
        'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?w=800',
      ],
      categoryId: cPerformance.id,
    },
  });

  // eslint-disable-next-line no-console
  console.log('[ensure-catalog] done (2 products, 2 zones)');
}

main()
  .catch((e) => {
    console.error('[ensure-catalog] failed', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
