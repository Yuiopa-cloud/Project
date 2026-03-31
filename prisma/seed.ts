import {
  PrismaClient,
  UserRole,
  CouponType,
  PaymentMethod,
} from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminPhone = '+212600000001';
  const adminPass = await argon2.hash('Admin123!');
  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: { role: UserRole.ADMIN },
    create: {
      phone: adminPhone,
      email: 'admin@atlas-auto.ma',
      firstName: 'Atlas',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      locale: 'fr',
      passwordHash: adminPass,
      loyaltyAccount: { create: { balance: 0 } },
    },
  });

  const demoPhone = '+212612345678';
  const demoPass = await argon2.hash('Customer123!');
  await prisma.user.upsert({
    where: { phone: demoPhone },
    update: {},
    create: {
      phone: demoPhone,
      email: 'client@example.com',
      firstName: 'Client',
      lastName: 'Demo',
      role: UserRole.CUSTOMER,
      locale: 'fr',
      passwordHash: demoPass,
      loyaltyAccount: { create: { balance: 120 } },
    },
  });

  const cats = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'interieur' },
      update: {},
      create: {
        slug: 'interieur',
        nameFr: 'Intérieur & Confort',
        nameAr: 'الداخل والراحة',
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'exterieur' },
      update: {},
      create: {
        slug: 'exterieur',
        nameFr: 'Extérieur & carrosserie',
        nameAr: 'الخارج والهيكل',
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'performance' },
      update: {},
      create: {
        slug: 'performance',
        nameFr: 'Performance',
        nameAr: 'الأداء',
        sortOrder: 3,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'entretien' },
      update: {},
      create: {
        slug: 'entretien',
        nameFr: 'Entretien',
        nameAr: 'الصيانة',
        sortOrder: 4,
      },
    }),
  ]);

  const zones = await Promise.all([
    prisma.deliveryZone.upsert({
      where: { cityCode: 'CASA' },
      update: {},
      create: {
        cityCode: 'CASA',
        cityNameFr: 'Casablanca',
        cityNameAr: 'الدار البيضاء',
        shippingCostMad: 29,
        freeShippingThresholdMad: 499,
      },
    }),
    prisma.deliveryZone.upsert({
      where: { cityCode: 'RABAT' },
      update: {},
      create: {
        cityCode: 'RABAT',
        cityNameFr: 'Rabat',
        cityNameAr: 'الرباط',
        shippingCostMad: 35,
        freeShippingThresholdMad: 499,
      },
    }),
    prisma.deliveryZone.upsert({
      where: { cityCode: 'MARRAKECH' },
      update: {},
      create: {
        cityCode: 'MARRAKECH',
        cityNameFr: 'Marrakech',
        cityNameAr: 'مراكش',
        shippingCostMad: 45,
        freeShippingThresholdMad: 599,
      },
    }),
    prisma.deliveryZone.upsert({
      where: { cityCode: 'AGADIR' },
      update: {},
      create: {
        cityCode: 'AGADIR',
        cityNameFr: 'Agadir',
        cityNameAr: 'أكادير',
        shippingCostMad: 49,
        freeShippingThresholdMad: 599,
      },
    }),
  ]);

  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      type: CouponType.PERCENT,
      value: 10,
      minOrderMad: 200,
      maxUses: 1000,
      isActive: true,
    },
  });

  await prisma.affiliate.upsert({
    where: { code: 'DRIVEMA' },
    update: {},
    create: {
      code: 'DRIVEMA',
      displayName: 'Drive Morocco',
      commissionPercent: 8.5,
      isActive: true,
    },
  });

  const p1 = await prisma.product.upsert({
    where: { sku: 'ATL-ALU-MAT01' },
    update: {},
    create: {
      sku: 'ATL-ALU-MAT01',
      slug: 'tapis-aluminium-premium',
      nameFr: 'Tapis aluminium premium — effet métal brossé',
      nameAr: 'سجات ألمنيوم بريميوم',
      descriptionFr:
        'Finition premium, bords cousus, résistant eau & boue. Look sport haut de gamme pour SUV et berlines.',
      descriptionAr:
        'تشطيب عالي الجودة، حواف مخيطة، مقاوم للماء والطين. مظهر رياضي فاخر.',
      priceMad: 449,
      compareAtMad: 549,
      stock: 32,
      lowStockThreshold: 5,
      purchaseCount: 128,
      images: [
        'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=800',
      ],
      categoryId: cats[0].id,
      metadata: { material: 'PVC + textile', fit: 'universal trimmable' },
    },
  });

  const p2 = await prisma.product.upsert({
    where: { sku: 'ATL-LED-DRL02' },
    update: {},
    create: {
      sku: 'ATL-LED-DRL02',
      slug: 'feux-jour-led-matrix',
      nameFr: 'Feux jour LED — signature Matrix',
      nameAr: 'إضاءة نهارية LED',
      descriptionFr:
        'Module LED haute définition, homologation ECE-ready (à valider véhicule). Installation plug-and-play sur supports universels.',
      descriptionAr:
        'وحدة LED عالية الوضوح، تركيب سهل على الحوامل العالمية.',
      priceMad: 899,
      stock: 14,
      lowStockThreshold: 6,
      purchaseCount: 64,
      images: [
        'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?w=800',
      ],
      categoryId: cats[2].id,
    },
  });

  const p3 = await prisma.product.upsert({
    where: { sku: 'ATL-COV-SEAT03' },
    update: {},
    create: {
      sku: 'ATL-COV-SEAT03',
      slug: 'housses-siege-nappa',
      nameFr: 'Housses siège nappa respirant',
      nameAr: 'أغطية مقاعد جلد نابا',
      descriptionFr:
        'Coupe atlas 3D, maille air-flow, compatible airbags latéraux.',
      descriptionAr: 'قص ثلاثي الأبعاد مع شبكة تهوية.',
      priceMad: 1299,
      stock: 8,
      lowStockThreshold: 5,
      purchaseCount: 41,
      images: [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      ],
      categoryId: cats[0].id,
    },
  });

  const p4 = await prisma.product.upsert({
    where: { sku: 'ATL-SUN-SHADE04' },
    update: {},
    create: {
      sku: 'ATL-SUN-SHADE04',
      slug: 'pare-soleil-pliable-uv',
      nameFr: 'Pare-soleil pare-brise pliable — blocage UV',
      nameAr: 'واقي شمس قابل للطي',
      descriptionFr:
        'Film réfléchissant argent, rangement compact, découpe universelle SUV / citadine.',
      descriptionAr:
        'طبقة عاكسة فضية، حجم مدمج، مناسب للسيدان والدفع الرباعي.',
      priceMad: 129,
      compareAtMad: 179,
      stock: 120,
      lowStockThreshold: 15,
      purchaseCount: 256,
      images: [
        'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800',
      ],
      categoryId: cats[0].id,
    },
  });

  const p5 = await prisma.product.upsert({
    where: { sku: 'ATL-PHONE-MNT05' },
    update: {},
    create: {
      sku: 'ATL-PHONE-MNT05',
      slug: 'support-magnetique-360',
      nameFr: 'Support téléphone magnétique 360°',
      nameAr: 'حامل هاتف مغناطيسي',
      descriptionFr:
        'Base adhésive forte, aimants N52, rotation pour GPS et Dashcam companion.',
      descriptionAr: 'لاصق قوي، مغناطيس قوي، مناسب للملاحة.',
      priceMad: 189,
      stock: 85,
      lowStockThreshold: 10,
      purchaseCount: 312,
      images: [
        'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800',
      ],
      categoryId: cats[0].id,
    },
  });

  const p6 = await prisma.product.upsert({
    where: { sku: 'ATL-ORG-TRUNK06' },
    update: {},
    create: {
      sku: 'ATL-ORG-TRUNK06',
      slug: 'organisateur-coffre-modulable',
      nameFr: 'Organisateur de coffre modulable',
      nameAr: 'منظم صندوق السيارة',
      descriptionFr:
        'Compartiments réglables, fond antidérapant, poignées renforcées.',
      descriptionAr: 'أقسام قابلة للتعديل، قاع مانع للانزلاق.',
      priceMad: 329,
      stock: 44,
      lowStockThreshold: 8,
      purchaseCount: 98,
      images: [
        'https://images.unsplash.com/photo-1621929747188-9b4b2d5f6f4c?w=800',
      ],
      categoryId: cats[0].id,
    },
  });

  const p7 = await prisma.product.upsert({
    where: { sku: 'ATL-SPL-SPOIL07' },
    update: {},
    create: {
      sku: 'ATL-SPL-SPOIL07',
      slug: 'becquet-spoiler-sport-abs',
      nameFr: 'Becquet arrière sport ABS noir brillant',
      nameAr: 'جناح خلفي رياضي',
      descriptionFr:
        'Fixation collage 3M + vis optionnelles, profil aéro discret, adaptable berline.',
      descriptionAr: 'تركيب لاصق قوي، شكل أنيق يناسب السيدان.',
      priceMad: 649,
      stock: 22,
      lowStockThreshold: 5,
      purchaseCount: 54,
      images: [
        'https://images.unsplash.com/photo-1619405399517-d7fce0f13302?w=800',
      ],
      categoryId: cats[1].id,
    },
  });

  const p8 = await prisma.product.upsert({
    where: { sku: 'ATL-MUD-FLAP08' },
    update: {},
    create: {
      sku: 'ATL-MUD-FLAP08',
      slug: 'bavettes-boue-universelles',
      nameFr: 'Bavettes anti-boue universelles (4 pcs)',
      nameAr: 'واقيات طين',
      descriptionFr:
        'Plastique souple résistant UV, découpe facile, vis et colliers fournis.',
      descriptionAr: 'بلاستيك مرن مقاوم للأشعة، قص سهل.',
      priceMad: 279,
      stock: 67,
      lowStockThreshold: 10,
      purchaseCount: 143,
      images: [
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800',
      ],
      categoryId: cats[1].id,
    },
  });

  const p9 = await prisma.product.upsert({
    where: { sku: 'ATL-ROOF-BAR09' },
    update: {},
    create: {
      sku: 'ATL-ROOF-BAR09',
      slug: 'barres-de-toit-aero-alu',
      nameFr: 'Barres de toit aéro aluminium (paire)',
      nameAr: 'قضبان سقف ألومنيوم',
      descriptionFr:
        'Profil bas bruit, capacité jusqu’à 75 kg (selon notice véhicule), verrouillage anti-vol.',
      descriptionAr: 'ملفوفة بانخفاض ضوضاء، تحميل حسب كتيب السيارة.',
      priceMad: 1599,
      compareAtMad: 1899,
      stock: 11,
      lowStockThreshold: 4,
      purchaseCount: 37,
      images: [
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800',
      ],
      categoryId: cats[1].id,
    },
  });

  const p10 = await prisma.product.upsert({
    where: { sku: 'ATL-FILTER-AIR10' },
    update: {},
    create: {
      sku: 'ATL-FILTER-AIR10',
      slug: 'filtre-a-air-admission-sport',
      nameFr: 'Filtre à air admission haut débit (lavable)',
      nameAr: 'فلتر هواء رياضي',
      descriptionFr:
        'Maille multi-couches, gain de réponse moteur (usage route). Vérifier compatibilité année / moteur.',
      descriptionAr: 'طبقات متعددة، استجابة أفضل.',
      priceMad: 459,
      stock: 28,
      lowStockThreshold: 6,
      purchaseCount: 76,
      images: [
        'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800',
      ],
      categoryId: cats[2].id,
    },
  });

  const p11 = await prisma.product.upsert({
    where: { sku: 'ATL-EXH-TIP11' },
    update: {},
    create: {
      sku: 'ATL-EXH-TIP11',
      slug: 'sortie-echappement-inox-carbone',
      nameFr: 'Embout d’échappement inox + finition carbone',
      nameAr: ' طرف عادم ستانلس وفحم',
      descriptionFr:
        'Diamètre entrée 54 à 63 mm (adaptateur inclus), fixation collier inox.',
      descriptionAr: 'قطر دخول مع محول، تثبيت بالمشبك.',
      priceMad: 349,
      stock: 33,
      lowStockThreshold: 8,
      purchaseCount: 89,
      images: [
        'https://images.unsplash.com/photo-1558981806-ec527fa84d4b?w=800',
      ],
      categoryId: cats[2].id,
    },
  });

  const p12 = await prisma.product.upsert({
    where: { sku: 'ATL-WAX-KIT12' },
    update: {},
    create: {
      sku: 'ATL-WAX-KIT12',
      slug: 'kit-ceramique-quick-detail',
      nameFr: 'Kit céramique quick-detail 500 ml',
      nameAr: 'طقم سيراميك سريع',
      descriptionFr:
        'Spray hydrophobe longue durée, microfibres 400 GSM incluses, sans silicone agressif.',
      descriptionAr: 'بخاخ طارد للماء، مناشف مايكروفايبر.',
      priceMad: 239,
      stock: 95,
      lowStockThreshold: 20,
      purchaseCount: 201,
      images: [
        'https://images.unsplash.com/photo-1607860108854-06afc0b8bab8?w=800',
      ],
      categoryId: cats[3].id,
    },
  });

  const p13 = await prisma.product.upsert({
    where: { sku: 'ATL-VAC-MINI13' },
    update: {},
    create: {
      sku: 'ATL-VAC-MINI13',
      slug: 'aspirateur-auto-humide-sec',
      nameFr: 'Aspirateur 12 V humide & sec — compact',
      nameAr: 'مكنسة سيارة 12 فولط',
      descriptionFr:
        'Câble 4 m, buses fines pour sièges, filtre lavable, 4500 Pa.',
      descriptionAr: 'كابل طويل، فوهات للمقاعد، فلتر قابل للغسل.',
      priceMad: 399,
      stock: 51,
      lowStockThreshold: 10,
      purchaseCount: 167,
      images: [
        'https://images.unsplash.com/photo-1558316643-9b3de1edc4f6?w=800',
      ],
      categoryId: cats[3].id,
    },
  });

  await prisma.bundleItem.deleteMany({});
  await prisma.bundleItem.createMany({
    data: [
      { sourceProductId: p1.id, targetProductId: p2.id, score: 20 },
      { sourceProductId: p1.id, targetProductId: p3.id, score: 15 },
      { sourceProductId: p2.id, targetProductId: p3.id, score: 10 },
      { sourceProductId: p1.id, targetProductId: p4.id, score: 18 },
      { sourceProductId: p1.id, targetProductId: p5.id, score: 22 },
      { sourceProductId: p3.id, targetProductId: p6.id, score: 14 },
      { sourceProductId: p2.id, targetProductId: p10.id, score: 16 },
      { sourceProductId: p7.id, targetProductId: p8.id, score: 19 },
      { sourceProductId: p8.id, targetProductId: p12.id, score: 12 },
      { sourceProductId: p10.id, targetProductId: p11.id, score: 17 },
      { sourceProductId: p12.id, targetProductId: p13.id, score: 21 },
      { sourceProductId: p5.id, targetProductId: p2.id, score: 11 },
    ],
  });

  await prisma.order.deleteMany({ where: { orderNumber: 'AT-DEMO-SEED' } });
  const demoUser = await prisma.user.findUnique({
    where: { phone: demoPhone },
  });
  const order = await prisma.order.create({
    data: {
      orderNumber: 'AT-DEMO-SEED',
      userId: demoUser?.id,
      guestPhone: demoPhone,
      guestEmail: 'client@example.com',
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      status: 'DELIVERED',
      subtotalMad: 449,
      shippingMad: 29,
      discountMad: 0,
      totalMad: 478,
      deliveryZoneId: zones[0].id,
      shippingAddress: {
        line1: '123 Bd Zerktouni',
        quarter: 'Maarif',
        cityCode: 'CASA',
        phone: demoPhone,
        firstName: 'Client',
        lastName: 'Demo',
      },
      phoneConfirmed: true,
      items: {
        create: {
          productId: p1.id,
          quantity: 1,
          unitPriceMad: 449,
          titleSnapshot: p1.nameFr,
        },
      },
    },
  });
  void order;

  console.log('Seed OK', { adminId: admin.id, categories: cats.length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
