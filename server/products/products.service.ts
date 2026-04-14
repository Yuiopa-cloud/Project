import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ProductFilters = {
  categorySlug?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'new' | 'price_asc' | 'price_desc' | 'popular';
  skip?: number;
  take?: number;
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeVariantColor(input: string | null | undefined): string {
    return (input ?? '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');
  }

  async list(f: ProductFilters) {
    const where: Prisma.ProductWhereInput = { isActive: true };
    if (f.categorySlug) {
      where.category = { slug: f.categorySlug };
    }
    if (f.q?.trim()) {
      const q = f.q.trim();
      where.OR = [
        { nameFr: { contains: q, mode: 'insensitive' } },
        { nameAr: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ];
    }
    const priceFilter: Prisma.DecimalFilter = {};
    if (f.minPrice != null) priceFilter.gte = new Prisma.Decimal(f.minPrice);
    if (f.maxPrice != null) priceFilter.lte = new Prisma.Decimal(f.maxPrice);
    if (Object.keys(priceFilter).length) where.priceMad = priceFilter;

    let orderBy: Prisma.ProductOrderByWithRelationInput[] = [
      { createdAt: 'desc' },
    ];
    if (f.sort === 'price_asc') orderBy = [{ priceMad: 'asc' }];
    if (f.sort === 'price_desc') orderBy = [{ priceMad: 'desc' }];
    if (f.sort === 'popular') orderBy = [{ purchaseCount: 'desc' }];

    const take = Math.min(f.take ?? 24, 48);
    const skip = f.skip ?? 0;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          category: true,
          reviews: { select: { rating: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: items.map((p) => {
        const { reviews: revs, ...rest } = p;
        return {
          ...rest,
          ratingAvg:
            revs.length > 0
              ? revs.reduce((s, r) => s + r.rating, 0) / revs.length
              : null,
          lowStock: p.stock <= p.lowStockThreshold,
        };
      }),
      total,
      skip,
      take,
    };
  }

  async bySlug(slug: string) {
    const p = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
      include: {
        category: true,
        reviews: {
          include: {
            user: { select: { firstName: true, lastName: true, id: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        options: {
          orderBy: { sortOrder: 'asc' },
          include: { values: { orderBy: { sortOrder: 'asc' } } },
        },
        variants: {
          orderBy: { sortOrder: 'asc' },
          include: {
            selections: {
              include: { option: true, optionValue: true },
            },
          },
        },
      },
    });
    if (!p) throw new NotFoundException();
    const avg =
      p.reviews.length > 0
        ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
        : null;

    const variantLabel = (
      v: (typeof p.variants)[0],
      locale: 'fr' | 'ar',
    ) =>
      [...v.selections]
        .sort(
          (a, b) => (a.option.sortOrder ?? 0) - (b.option.sortOrder ?? 0),
        )
        .map((s) =>
          locale === 'ar' ? s.optionValue.valueAr : s.optionValue.valueFr,
        )
        .join(' · ');

    const colorOption = p.options.find((o) =>
      /colou?r|color|couleur|teinte|لون|اللون/i.test(`${o.nameFr} ${o.nameAr}`),
    );

    const mapVariant = (v: (typeof p.variants)[0]) => {
      const price = v.priceMad ?? p.priceMad;
      const compare = v.compareAtMad ?? p.compareAtMad;
      const imgs = v.images.length > 0 ? v.images : p.images;
      const colorSelection = colorOption
        ? v.selections.find((s) => s.optionId === colorOption.id)
        : null;
      return {
        id: v.id,
        sku: v.sku,
        color: colorSelection?.optionValue.valueFr ?? null,
        colorKey: this.normalizeVariantColor(colorSelection?.optionValue.valueFr),
        stock: v.stock,
        priceMad: price.toString(),
        compareAtMad: compare?.toString() ?? null,
        images: [...imgs],
        isDefault: v.isDefault,
        labelFr: variantLabel(v, 'fr'),
        labelAr: variantLabel(v, 'ar'),
        selection: Object.fromEntries(
          v.selections.map((s) => [s.optionId, s.optionValueId]),
        ),
      };
    };

    const optionsOut = p.options.map((o) => ({
      id: o.id,
      nameFr: o.nameFr,
      nameAr: o.nameAr,
      sortOrder: o.sortOrder,
      values: o.values.map((v) => ({
        id: v.id,
        valueFr: v.valueFr,
        valueAr: v.valueAr,
        valueKey: this.normalizeVariantColor(v.valueFr),
        colorHex: v.colorHex,
        imageUrl: v.imageUrl,
        sortOrder: v.sortOrder,
      })),
    }));

    const variantsOut = p.variants.map(mapVariant);

    let displayStock = p.stock;
    let displayPrice = p.priceMad;
    let displayCompare = p.compareAtMad;
    if (p.variantsEnabled && p.variants.length > 0) {
      const def =
        p.variants.find((v) => v.isDefault) ?? p.variants[0]!;
      displayStock = def.stock;
      displayPrice = def.priceMad ?? p.priceMad;
      displayCompare = def.compareAtMad ?? p.compareAtMad;
    }

    const { options: _o, variants: _v, ...rest } = p;
    return {
      ...rest,
      priceMad: displayPrice.toString(),
      compareAtMad: displayCompare?.toString() ?? null,
      stock: displayStock,
      // Always product-level gallery (admin "Images & media"). Variant hero
      // imagery is on each variant and used by the PDP when a variant matches.
      images: [...p.images],
      ratingAvg: avg,
      lowStock: displayStock <= p.lowStockThreshold,
      variantsEnabled: p.variantsEnabled,
      options: optionsOut,
      variants: variantsOut,
    };
  }

  async suggestions(q: string, limit = 8) {
    if (!q.trim()) return [];
    const qq = q.trim();
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { nameFr: { contains: qq, mode: 'insensitive' } },
          { nameAr: { contains: qq, mode: 'insensitive' } },
        ],
      },
      take: limit,
      select: {
        id: true,
        slug: true,
        nameFr: true,
        nameAr: true,
        priceMad: true,
        images: true,
      },
    });
  }
}
