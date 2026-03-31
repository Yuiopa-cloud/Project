import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeliveryZonesService {
  constructor(private readonly prisma: PrismaService) {}

  findActive() {
    return this.prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: { cityNameFr: 'asc' },
    });
  }
}
