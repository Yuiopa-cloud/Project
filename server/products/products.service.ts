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
      },
    });
    if (!p) throw new NotFoundException();
    const avg =
      p.reviews.length > 0
        ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length
        : null;
    return {
      ...p,
      ratingAvg: avg,
      lowStock: p.stock <= p.lowStockThreshold,
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
