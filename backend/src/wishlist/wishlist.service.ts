import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async add(userId: string, productId: string) {
    const p = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });
    if (!p) throw new NotFoundException();
    return this.prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
  }

  async remove(userId: string, productId: string) {
    await this.prisma.wishlistItem.deleteMany({
      where: { userId, productId },
    });
    return { ok: true };
  }
}
