import type { ProductList } from "./api";

/** Offline demo ids — cart/checkout need a running API + seeded DB. */
export const OFFLINE_ID_PREFIX = "offline-";

export type FallbackProductDetail = ProductList["items"][number] & {
  descriptionFr: string;
  descriptionAr: string;
};

const raw: FallbackProductDetail[] = [
  {
    id: `${OFFLINE_ID_PREFIX}snowblower`,
    slug: "snow-blower-2stage-212cc",
    nameFr: "Souffleuse à neige 2 étages 212cc",
    nameAr: "منفاخ ثلج مرحلتين 212cc",
    descriptionFr:
      "Lance-neige puissant avec démarrage facile, adapté aux allées et parkings.",
    descriptionAr:
      "منفاخ قوي بإقلاع سهل لتنظيف المداخل والساحات بسرعة وأمان.",
    priceMad: "2899",
    images: [
      "https://images.unsplash.com/photo-1615295645515-2f06f3aa0f01?w=1200&q=80",
    ],
    purchaseCount: 211,
    stock: 18,
    lowStock: false,
    ratingAvg: 4.8,
    category: {
      slug: "winter-tools",
      nameFr: "Outils d'hiver",
      nameAr: "معدات الشتاء",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}heater`,
    slug: "portable-ceramic-room-heater",
    nameFr: "Chauffage céramique portable basse conso",
    nameAr: "دفاية سيراميك محمولة اقتصادية",
    descriptionFr:
      "Chauffage rapide avec protection anti-basculement pour usage quotidien.",
    descriptionAr: "تدفئة سريعة مع نظام أمان ضد الانقلاب للاستخدام اليومي.",
    priceMad: "279",
    images: [
      "https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=1200&q=80",
    ],
    purchaseCount: 334,
    stock: 64,
    lowStock: false,
    ratingAvg: 4.7,
    category: {
      slug: "winter-tools",
      nameFr: "Outils d'hiver",
      nameAr: "معدات الشتاء",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}pressure`,
    slug: "electric-pressure-washer-1800w",
    nameFr: "Nettoyeur haute pression électrique 1800W",
    nameAr: "غسالة ضغط كهربائية 1800 واط",
    descriptionFr:
      "Idéal pour façades, voitures, terrasses et climatiseurs extérieurs.",
    descriptionAr: "مناسبة لغسيل الواجهات والسيارات والساحات بسهولة.",
    priceMad: "649",
    images: [
      "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=1200&q=80",
    ],
    purchaseCount: 287,
    stock: 41,
    lowStock: false,
    ratingAvg: 4.7,
    category: {
      slug: "cleaning-care",
      nameFr: "Nettoyage & entretien",
      nameAr: "التنظيف والعناية",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}drill`,
    slug: "cordless-impact-drill-20v",
    nameFr: "Perceuse-visseuse sans fil 20V",
    nameAr: "مثقاب لاسلكي 20 فولت",
    descriptionFr:
      "Moteur brushless, batterie durable et couple réglable pour la maison.",
    descriptionAr: "محرك بدون فحمات مع بطارية قوية وعزم قابل للضبط.",
    priceMad: "499",
    images: [
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&q=80",
    ],
    purchaseCount: 356,
    stock: 52,
    lowStock: false,
    ratingAvg: 4.8,
    category: {
      slug: "power-tools",
      nameFr: "Outils électriques",
      nameAr: "أدوات كهربائية",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}vacuum`,
    slug: "cordless-wet-dry-vacuum",
    nameFr: "Aspirateur sans fil sec & humide",
    nameAr: "مكنسة لاسلكية جاف ورطب",
    descriptionFr:
      "Convient aux tapis, sols durs et petits déversements du quotidien.",
    descriptionAr: "مناسبة للسجاد والأرضيات والانسكابات الخفيفة اليومية.",
    priceMad: "459",
    images: [
      "https://images.unsplash.com/photo-1558316643-9b3de1edc4f6?w=1200&q=80",
    ],
    purchaseCount: 298,
    stock: 38,
    lowStock: false,
    ratingAvg: 4.7,
    category: {
      slug: "cleaning-care",
      nameFr: "Nettoyage & entretien",
      nameAr: "التنظيف والعناية",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}ladder`,
    slug: "multi-position-folding-ladder",
    nameFr: "Échelle pliante متعددة الوضعيات",
    nameAr: "سلم قابل للطي متعدد الوضعيات",
    descriptionFr:
      "Robuste et compacte pour entretien maison, entrepôt et jardin.",
    descriptionAr: "متين ومريح للتخزين، مناسب لصيانة المنزل والحديقة.",
    priceMad: "389",
    images: [
      "https://images.unsplash.com/photo-1565799557186-1abbded5f5f5?w=1200&q=80",
    ],
    purchaseCount: 149,
    stock: 25,
    lowStock: false,
    ratingAvg: 4.6,
    category: {
      slug: "home-garden",
      nameFr: "Maison & jardin",
      nameAr: "الحديقة والمنزل",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}generator`,
    slug: "silent-inverter-generator-2kw",
    nameFr: "Générateur inverter silencieux 2KW",
    nameAr: "مولد إنفرتر هادئ 2 كيلوواط",
    descriptionFr:
      "Énergie stable pour voyages, chalets et pannes électriques.",
    descriptionAr: "طاقة مستقرة للرحلات والطوارئ وانقطاع الكهرباء.",
    priceMad: "1799",
    images: [
      "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=1200&q=80",
    ],
    purchaseCount: 117,
    stock: 12,
    lowStock: false,
    ratingAvg: 4.8,
    category: {
      slug: "power-tools",
      nameFr: "Outils électriques",
      nameAr: "أدوات كهربائية",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}storage`,
    slug: "heavy-duty-storage-rack-5tier",
    nameFr: "Étagère de rangement robuste 5 niveaux",
    nameAr: "رف تخزين قوي 5 طبقات",
    descriptionFr:
      "Supporte des charges lourdes pour garages, magasins et buanderies.",
    descriptionAr: "يتحمل وزنًا عاليًا للمخازن والكراجات وغرف الغسيل.",
    priceMad: "329",
    images: [
      "https://images.unsplash.com/photo-1581579186913-45ac4d2c4f98?w=1200&q=80",
    ],
    purchaseCount: 224,
    stock: 39,
    lowStock: false,
    ratingAvg: 4.6,
    category: {
      slug: "home-garden",
      nameFr: "Maison & jardin",
      nameAr: "الحديقة والمنزل",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}trimmer`,
    slug: "cordless-grass-trimmer-40v",
    nameFr: "Coupe-bordure sans fil 40V",
    nameAr: "مشذب عشب لاسلكي 40 فولت",
    descriptionFr:
      "Coupe précise pour حواف الحديقة مع بطارية طويلة العمر.",
    descriptionAr: "قص دقيق لحواف الحديقة مع بطارية تدوم لفترات طويلة.",
    priceMad: "599",
    images: [
      "https://images.unsplash.com/photo-1560743641-3914f2c45636?w=1200&q=80",
    ],
    purchaseCount: 188,
    stock: 29,
    lowStock: false,
    ratingAvg: 4.5,
    category: {
      slug: "home-garden",
      nameFr: "Maison & jardin",
      nameAr: "الحديقة والمنزل",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}airpurifier`,
    slug: "smart-hepa-air-purifier",
    nameFr: "Purificateur d'air HEPA intelligent",
    nameAr: "منقي هواء ذكي HEPA",
    descriptionFr:
      "Filtration fine ضد الغبار والروائح مع وضع نوم هادئ.",
    descriptionAr: "تنقية فعالة للغبار والروائح مع وضع نوم هادئ.",
    priceMad: "549",
    images: [
      "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=1200&q=80",
    ],
    purchaseCount: 261,
    stock: 46,
    lowStock: false,
    ratingAvg: 4.7,
    category: {
      slug: "cleaning-care",
      nameFr: "Nettoyage & entretien",
      nameAr: "التنظيف والعناية",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}toolset`,
    slug: "home-toolkit-128pcs",
    nameFr: "Kit d'outillage maison 128 pièces",
    nameAr: "عدة منزلية شاملة 128 قطعة",
    descriptionFr:
      "Set complet pour réparations de base, montage et maintenance rapide.",
    descriptionAr: "مجموعة متكاملة للإصلاحات المنزلية السريعة والتركيب اليومي.",
    priceMad: "219",
    images: [
      "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=1200&q=80",
    ],
    purchaseCount: 409,
    stock: 88,
    lowStock: false,
    ratingAvg: 4.9,
    category: {
      slug: "power-tools",
      nameFr: "Outils électriques",
      nameAr: "أدوات كهربائية",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}sprayer`,
    slug: "battery-pressure-sprayer-16l",
    nameFr: "Pulvérisateur pression rechargeable 16L",
    nameAr: "مرش ضغط كهربائي 16 لتر",
    descriptionFr:
      "Pratique pour jardinage, désinfection extérieure et nettoyage des surfaces.",
    descriptionAr: "عملي للحديقة والتعقيم الخارجي وتنظيف المساحات الكبيرة.",
    priceMad: "259",
    images: [
      "https://images.unsplash.com/photo-1598514982901-ae2e4f6d67f7?w=1200&q=80",
    ],
    purchaseCount: 173,
    stock: 47,
    lowStock: false,
    ratingAvg: 4.5,
    category: {
      slug: "home-garden",
      nameFr: "Maison & jardin",
      nameAr: "الحديقة والمنزل",
    },
  },
];

/** Strip description for list type */
export const ALL_FALLBACK_PRODUCTS: ProductList["items"] = raw.map(
  ({ descriptionFr: _a, descriptionAr: _b, ...list }) => list,
);

export const TRENDING_FALLBACK: ProductList["items"] = [...ALL_FALLBACK_PRODUCTS]
  .sort((a, b) => b.purchaseCount - a.purchaseCount)
  .slice(0, 4);

export function getFallbackProductDetail(
  slug: string,
): (FallbackProductDetail & { reviews: [] }) | null {
  const p = raw.find((x) => x.slug === slug);
  if (!p) return null;
  return { ...p, reviews: [] };
}

export function isOfflineProductId(id: string) {
  return id.startsWith(OFFLINE_ID_PREFIX);
}
