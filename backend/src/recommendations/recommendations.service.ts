import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async frequentlyBoughtTogether(productId: string, limit = 6) {
    const edges = await this.prisma.bundleItem.findMany({
      where: { sourceProductId: productId },
      orderBy: { score: 'desc' },
      take: limit,
      include: { targetProduct: { include: { category: true } } },
    });
    return edges.map((e) => e.targetProduct);
  }

  /**
   * Lightweight “AI”: blend category neighbours + popular in category.
   */
  async relatedMix(productId: string, limit = 8) {
    const p = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    });
    if (!p) return [];
    const [popular, newInCat] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: {
          categoryId: p.categoryId,
          id: { not: productId },
          isActive: true,
        },
        orderBy: { purchaseCount: 'desc' },
        take: Math.ceil(limit / 2),
        include: { category: true },
      }),
      this.prisma.product.findMany({
        where: {
          categoryId: p.categoryId,
          id: { not: productId },
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(limit / 2),
        include: { category: true },
      }),
    ]);
    const map = new Map<string, (typeof popular)[0]>();
    for (const x of [...popular, ...newInCat]) map.set(x.id, x);
    return [...map.values()].slice(0, limit);
  }
}
