import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FraudDecision,
  OrderStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const [revenueAgg, ordersCount, usersCount, pendingFraud] =
      await this.prisma.$transaction([
        this.prisma.order.aggregate({
          where: {
            status: {
              notIn: [OrderStatus.CANCELLED, OrderStatus.REJECTED],
            },
            createdAt: { gte: since },
          },
          _sum: { totalMad: true },
        }),
        this.prisma.order.count({ where: { createdAt: { gte: since } } }),
        this.prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
        this.prisma.fraudFlag.count({
          where: { decision: FraudDecision.PENDING },
        }),
      ]);

    const visitorsEstimate = usersCount; // placeholder — wire analytics later
    const conversion =
      visitorsEstimate > 0 ? ordersCount / visitorsEstimate : 0;

    return {
      periodDays: 30,
      revenueMad: revenueAgg._sum.totalMad?.toString() ?? '0',
      orders: ordersCount,
      customers: usersCount,
      pendingFraudFlags: pendingFraud,
      conversionRateApprox: Number(conversion.toFixed(4)),
      inventoryLow: await this.prisma.product.count({
        where: {
          isActive: true,
          stock: { lte: 8 },
        },
      }),
    };
  }

  async orders(params: { status?: OrderStatus; skip?: number; take?: number }) {
    const take = Math.min(params.take ?? 50, 100);
    const skip = params.skip ?? 0;
    return this.prisma.order.findMany({
      where: params.status ? { status: params.status } : undefined,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        items: true,
        fraudFlags: true,
        deliveryZone: true,
        user: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });
  }

  async orderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        fraudFlags: true,
        deliveryZone: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async setOrderStatus(id: string, status: OrderStatus) {
    const order = await this.prisma.order.update({
      where: { id },
      data: { status },
    });
    return order;
  }

  async fraudDecide(
    orderId: string,
    adminId: string,
    decision: 'APPROVED' | 'REJECTED',
  ) {
    const flag = await this.prisma.fraudFlag.findUnique({
      where: { orderId },
      include: { order: true },
    });
    if (!flag) throw new NotFoundException();

    await this.prisma.$transaction([
      this.prisma.fraudFlag.update({
        where: { orderId },
        data: {
          decision: decision === 'APPROVED' ? FraudDecision.APPROVED : FraudDecision.REJECTED,
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          status:
            decision === 'APPROVED'
              ? OrderStatus.PROCESSING
              : OrderStatus.REJECTED,
          manualConfirmationRequired: false,
        },
      }),
    ]);
    return { ok: true };
  }

  async createProduct(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data });
  }

  async listCustomers(takeRaw?: number) {
    const take = Math.min(Math.max(takeRaw ?? 200, 1), 500);
    return this.prisma.user.findMany({
      where: { role: UserRole.CUSTOMER },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        locale: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    });
  }
}
