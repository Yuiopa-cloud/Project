import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(code: string, subtotalMad: number) {
    const c = await this.prisma.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (
      !c ||
      !c.isActive ||
      (c.expiresAt && c.expiresAt < new Date()) ||
      (c.maxUses != null && c.usedCount >= c.maxUses)
    ) {
      throw new BadRequestException('Invalid coupon');
    }
    if (c.minOrderMad && subtotalMad < c.minOrderMad.toNumber()) {
      throw new BadRequestException('Minimum order not reached');
    }
    return { code: c.code, type: c.type, value: c.value.toString() };
  }
}
