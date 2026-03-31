import type { ProductList } from "./api";

/** Offline demo ids — cart/checkout need a running API + seeded DB. */
export const OFFLINE_ID_PREFIX = "offline-";

export type FallbackProductDetail = ProductList["items"][number] & {
  descriptionFr: string;
  descriptionAr: string;
};

const raw: FallbackProductDetail[] = [
  {
    id: `${OFFLINE_ID_PREFIX}tapis`,
    slug: "tapis-aluminium-premium",
    nameFr: "Tapis aluminium premium — effet métal brossé",
    nameAr: "سجات ألمنيوم بريميوم",
    descriptionFr:
      "Finition premium, bords cousus, résistant eau & boue. Look sport haut de gamme pour SUV et berlines.",
    descriptionAr:
      "تشطيب عالي الجودة، حواف مخيطة، مقاوم للماء والطين.",
    priceMad: "449",
    images: [
      "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=800&q=80",
    ],
    purchaseCount: 128,
    stock: 32,
    lowStock: false,
    ratingAvg: 4.7,
    category: {
      slug: "interieur",
      nameFr: "Intérieur & Confort",
      nameAr: "الداخل والراحة",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}led`,
    slug: "feux-jour-led-matrix",
    nameFr: "Feux jour LED — signature Matrix",
    nameAr: "إضاءة نهارية LED",
    descriptionFr:
      "Module LED haute définition. Installation plug-and-play sur supports universels.",
    descriptionAr: "وحدة LED عالية الوضوح.",
    priceMad: "899",
    images: [
      "https://images.unsplash.com/photo-1486754735734-325b5831c3ad?w=800&q=80",
    ],
    purchaseCount: 64,
    stock: 14,
    lowStock: true,
    ratingAvg: 4.6,
    category: {
      slug: "performance",
      nameFr: "Performance",
      nameAr: "الأداء",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}housses`,
    slug: "housses-siege-nappa",
    nameFr: "Housses siège nappa respirant",
    nameAr: "أغطية مقاعد جلد نابا",
    descriptionFr:
      "Coupe atlas 3D, maille air-flow, compatible airbags latéraux.",
    descriptionAr: "قص ثلاثي الأبعاد مع شبكة تهوية.",
    priceMad: "1299",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    ],
    purchaseCount: 41,
    stock: 8,
    lowStock: true,
    ratingAvg: 4.5,
    category: {
      slug: "interieur",
      nameFr: "Intérieur & Confort",
      nameAr: "الداخل والراحة",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}soleil`,
    slug: "pare-soleil-pliable-uv",
    nameFr: "Pare-soleil pare-brise pliable — blocage UV",
    nameAr: "واقي شمس قابل للطي",
    descriptionFr:
      "Film réfléchissant argent, rangement compact, découpe universelle SUV / citadine.",
    descriptionAr: "طبقة عاكسة، حجم مدمج.",
    priceMad: "129",
    images: [
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80",
    ],
    purchaseCount: 256,
    stock: 120,
    lowStock: false,
    ratingAvg: 4.4,
    category: {
      slug: "interieur",
      nameFr: "Intérieur & Confort",
      nameAr: "الداخل والراحة",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}phone`,
    slug: "support-magnetique-360",
    nameFr: "Support téléphone magnétique 360°",
    nameAr: "حامل هاتف مغناطيسي",
    descriptionFr:
      "Base adhésive forte, aimants N52, rotation pour GPS et dashcam.",
    descriptionAr: "لاصق قوي، مناسب للملاحة.",
    priceMad: "189",
    images: [
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80",
    ],
    purchaseCount: 312,
    stock: 85,
    lowStock: false,
    ratingAvg: 4.5,
    category: {
      slug: "interieur",
      nameFr: "Intérieur & Confort",
      nameAr: "الداخل والراحة",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}coffre`,
    slug: "organisateur-coffre-modulable",
    nameFr: "Organisateur de coffre modulable",
    nameAr: "منظم صندوق السيارة",
    descriptionFr:
      "Compartiments réglables, fond antidérapant, poignées renforcées.",
    descriptionAr: "أقسام قابلة للتعديل.",
    priceMad: "329",
    images: [
      "https://images.unsplash.com/photo-1621929747188-9b4b2d5f6f4c?w=800&q=80",
    ],
    purchaseCount: 98,
    stock: 44,
    lowStock: false,
    ratingAvg: 4.3,
    category: {
      slug: "interieur",
      nameFr: "Intérieur & Confort",
      nameAr: "الداخل والراحة",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}becquet`,
    slug: "becquet-spoiler-sport-abs",
    nameFr: "Becquet arrière sport ABS noir brillant",
    nameAr: "جناح خلفي رياضي",
    descriptionFr:
      "Fixation collage 3M + vis optionnelles, profil aéro discret.",
    descriptionAr: "تركيب لاصق قوي.",
    priceMad: "649",
    images: [
      "https://images.unsplash.com/photo-1619405399517-d7fce0f13302?w=800&q=80",
    ],
    purchaseCount: 54,
    stock: 22,
    lowStock: false,
    ratingAvg: 4.2,
    category: {
      slug: "exterieur",
      nameFr: "Extérieur & carrosserie",
      nameAr: "الخارج والهيكل",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}bavettes`,
    slug: "bavettes-boue-universelles",
    nameFr: "Bavettes anti-boue universelles (4 pcs)",
    nameAr: "واقيات طين",
    descriptionFr:
      "Plastique souple résistant UV, vis et colliers fournis.",
    descriptionAr: "بلاستيك مرن مقاوم للأشعة.",
    priceMad: "279",
    images: [
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80",
    ],
    purchaseCount: 143,
    stock: 67,
    lowStock: false,
    ratingAvg: 4.5,
    category: {
      slug: "exterieur",
      nameFr: "Extérieur & carrosserie",
      nameAr: "الخارج والهيكل",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}toit`,
    slug: "barres-de-toit-aero-alu",
    nameFr: "Barres de toit aéro aluminium (paire)",
    nameAr: "قضبان سقف ألومنيوم",
    descriptionFr:
      "Profil bas bruit, capacité selon notice véhicule, verrouillage anti-vol.",
    descriptionAr: "ملفوفة بانخفاض ضوضاء.",
    priceMad: "1599",
    images: [
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80",
    ],
    purchaseCount: 37,
    stock: 11,
    lowStock: true,
    ratingAvg: 4.7,
    category: {
      slug: "exterieur",
      nameFr: "Extérieur & carrosserie",
      nameAr: "الخارج والهيكل",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}filtre`,
    slug: "filtre-a-air-admission-sport",
    nameFr: "Filtre à air admission haut débit (lavable)",
    nameAr: "فلتر هواء رياضي",
    descriptionFr:
      "Maille multi-couches, gain de réponse moteur (usage route).",
    descriptionAr: "طبقات متعددة.",
    priceMad: "459",
    images: [
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80",
    ],
    purchaseCount: 76,
    stock: 28,
    lowStock: false,
    ratingAvg: 4.4,
    category: {
      slug: "performance",
      nameFr: "Performance",
      nameAr: "الأداء",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}echap`,
    slug: "sortie-echappement-inox-carbone",
    nameFr: "Embout d’échappement inox + finition carbone",
    nameAr: "طرف عادم ستانلس",
    descriptionFr:
      "Diamètre entrée 54 à 63 mm (adaptateur inclus), fixation collier inox.",
    descriptionAr: "قطر دخول مع محول.",
    priceMad: "349",
    images: [
      "https://images.unsplash.com/photo-1558981806-ec527fa84d4b?w=800&q=80",
    ],
    purchaseCount: 89,
    stock: 33,
    lowStock: false,
    ratingAvg: 4.3,
    category: {
      slug: "performance",
      nameFr: "Performance",
      nameAr: "الأداء",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}ceram`,
    slug: "kit-ceramique-quick-detail",
    nameFr: "Kit céramique quick-detail 500 ml",
    nameAr: "طقم سيراميك سريع",
    descriptionFr:
      "Spray hydrophobe longue durée, microfibres 400 GSM incluses.",
    descriptionAr: "بخاخ طارد للماء.",
    priceMad: "239",
    images: [
      "https://images.unsplash.com/photo-1607860108854-06afc0b8bab8?w=800&q=80",
    ],
    purchaseCount: 201,
    stock: 95,
    lowStock: false,
    ratingAvg: 4.8,
    category: {
      slug: "entretien",
      nameFr: "Entretien",
      nameAr: "الصيانة",
    },
  },
  {
    id: `${OFFLINE_ID_PREFIX}asp`,
    slug: "aspirateur-auto-humide-sec",
    nameFr: "Aspirateur 12 V humide & sec — compact",
    nameAr: "مكنسة سيارة 12 فولط",
    descriptionFr:
      "Câble 4 m, buses fines pour sièges, filtre lavable, 4500 Pa.",
    descriptionAr: "كابل طويل، فوهات للمقاعد.",
    priceMad: "399",
    images: [
      "https://images.unsplash.com/photo-1558316643-9b3de1edc4f6?w=800&q=80",
    ],
    purchaseCount: 167,
    stock: 51,
    lowStock: false,
    ratingAvg: 4.6,
    category: {
      slug: "entretien",
      nameFr: "Entretien",
      nameAr: "الصيانة",
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
