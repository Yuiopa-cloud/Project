import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FraudDecision,
  OrderStatus,
  PaymentMethod,
  Prisma,
  UserRole,
} from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProductDto } from './dto/create-product.dto';
import type { PatchProductVariantDto } from './dto/patch-product-variant.dto';
import type { ReplaceProductVariantsDto } from './dto/replace-product-variants.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

const genSkuSuffix = customAlphabet(
  '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ',
  10,
);

function slugifyTitle(input: string): string {
  const s = input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return s || 'product';
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private mapStatusToLifecycle(status: OrderStatus):
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'returned' {
    if (
      status === OrderStatus.PENDING_CONFIRMATION ||
      status === OrderStatus.AWAITING_PAYMENT
    ) {
      return 'pending';
    }
    if (status === OrderStatus.PAID) return 'confirmed';
    if (status === OrderStatus.PROCESSING) return 'processing';
    if (status === OrderStatus.SHIPPED) return 'shipped';
    if (status === OrderStatus.DELIVERED) return 'delivered';
    if (status === OrderStatus.CANCELLED) return 'cancelled';
    return 'returned';
  }

  private decimalAsNumber(v: Prisma.Decimal | string | number | null | undefined): number {
    if (v == null) return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (typeof v === 'string') {
      const n = Number.parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    }
    return Number.parseFloat(v.toString()) || 0;
  }

  private parseCostMad(productMeta: Prisma.JsonValue | null | undefined): number {
    if (!productMeta || typeof productMeta !== 'object' || Array.isArray(productMeta)) {
      return 0;
    }
    const raw = (productMeta as Record<string, unknown>).costMad;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
    if (typeof raw === 'string') {
      const n = Number.parseFloat(raw.replace(',', '.'));
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }

  private buildTimeSeries(
    points: Date[],
    from: Date,
    to: Date,
    buckets: number,
  ): Array<{ ts: string; value: number }> {
    const spanMs = Math.max(1, to.getTime() - from.getTime());
    const bucketMs = Math.max(1, Math.floor(spanMs / buckets));
    const counts = new Array<number>(buckets).fill(0);
    for (const d of points) {
      const idx = Math.min(
        buckets - 1,
        Math.max(0, Math.floor((d.getTime() - from.getTime()) / bucketMs)),
      );
      counts[idx] += 1;
    }
    return counts.map((value, i) => ({
      ts: new Date(from.getTime() + i * bucketMs).toISOString(),
      value,
    }));
  }

  async dashboard(periodDaysRaw?: number) {
    const periodDays = Math.min(
      Math.max(Math.floor(Number(periodDaysRaw) || 30), 1),
      366,
    );
    const since = new Date();
    since.setDate(since.getDate() - periodDays);
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
      periodDays,
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

  async advancedAnalytics(params?: {
    range?: 'today' | '7d' | '30d' | 'custom';
    from?: string;
    to?: string;
  }) {
    const now = new Date();
    const range = params?.range ?? '30d';
    let from = new Date(now);
    let to = new Date(now);
    if (range === 'today') {
      from.setHours(0, 0, 0, 0);
    } else if (range === '7d') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === '30d') {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      const parsedFrom = params?.from ? new Date(params.from) : null;
      const parsedTo = params?.to ? new Date(params.to) : null;
      if (!parsedFrom || Number.isNaN(parsedFrom.getTime())) {
        throw new BadRequestException('Invalid custom range: "from"');
      }
      if (!parsedTo || Number.isNaN(parsedTo.getTime())) {
        throw new BadRequestException('Invalid custom range: "to"');
      }
      from = parsedFrom;
      to = parsedTo;
    }
    if (from > to) throw new BadRequestException('"from" must be <= "to"');

    const spanMs = Math.max(1, to.getTime() - from.getTime());
    const prevFrom = new Date(from.getTime() - spanMs);
    const prevTo = new Date(from.getTime());
    const paidStatuses: OrderStatus[] = [
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
    ];
    const cancelledStatuses: OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.REJECTED];

    const [
      ordersInRange,
      ordersPrev,
      viewsInRange,
      viewsPrev,
      productRows,
      topCustomersRows,
      paymentFailures,
    ] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  nameFr: true,
                  images: true,
                  metadata: true,
                },
              },
              variant: {
                include: {
                  selections: {
                    include: {
                      option: true,
                      optionValue: true,
                    },
                  },
                },
              },
            },
          },
          fraudFlags: true,
          deliveryZone: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: prevFrom, lt: prevTo } },
        select: { id: true, totalMad: true, status: true, createdAt: true },
      }),
      this.prisma.productView.findMany({
        where: { viewedAt: { gte: from, lte: to } },
        select: { viewedAt: true, userId: true, guestToken: true },
      }),
      this.prisma.productView.findMany({
        where: { viewedAt: { gte: prevFrom, lt: prevTo } },
        select: { viewedAt: true, userId: true, guestToken: true },
      }),
      this.prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          nameFr: true,
          stock: true,
          lowStockThreshold: true,
        },
      }),
      this.prisma.user.findMany({
        where: { role: UserRole.CUSTOMER },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          _count: { select: { orders: true } },
          orders: {
            where: { status: { in: paidStatuses } },
            select: { totalMad: true },
          },
        },
        take: 20,
        orderBy: { orders: { _count: 'desc' } },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: from, lte: to },
          paymentMethod: PaymentMethod.STRIPE,
          status: { in: [OrderStatus.AWAITING_PAYMENT, OrderStatus.CANCELLED, OrderStatus.REJECTED] },
        },
      }),
    ]);

    const completedOrders = ordersInRange.filter((o) => paidStatuses.includes(o.status));
    const previousCompleted = ordersPrev.filter((o) => paidStatuses.includes(o.status));
    const cancelledCount = ordersInRange.filter((o) => cancelledStatuses.includes(o.status)).length;
    const revenue = completedOrders.reduce(
      (sum, o) => sum + this.decimalAsNumber(o.totalMad),
      0,
    );
    const revenuePrev = previousCompleted.reduce(
      (sum, o) => sum + this.decimalAsNumber(o.totalMad),
      0,
    );
    const allOrderCount = ordersInRange.length;
    const completedCount = completedOrders.length;
    const aov = completedCount > 0 ? revenue / completedCount : 0;
    const hours = Math.max(1, (to.getTime() - from.getTime()) / (1000 * 60 * 60));
    const ordersPerHour = completedCount / hours;

    const customerSpend = new Map<string, number>();
    for (const o of completedOrders) {
      const key = o.userId ?? `guest:${o.guestPhone}`;
      customerSpend.set(key, (customerSpend.get(key) ?? 0) + this.decimalAsNumber(o.totalMad));
    }
    const payingCustomers = customerSpend.size;
    const clv =
      payingCustomers > 0
        ? [...customerSpend.values()].reduce((a, b) => a + b, 0) / payingCustomers
        : 0;
    const repeatCustomers = [...customerSpend.values()].filter((v) => v > aov).length;
    const repeatRate = payingCustomers > 0 ? repeatCustomers / payingCustomers : 0;

    let profit = 0;
    for (const o of completedOrders) {
      for (const item of o.items) {
        const cost = this.parseCostMad(item.product.metadata);
        const unit = this.decimalAsNumber(item.unitPriceMad);
        profit += (unit - cost) * item.quantity;
      }
    }

    const visitors = new Set(
      viewsInRange.map((v) => (v.userId ? `u:${v.userId}` : `g:${v.guestToken ?? 'anon'}`)),
    ).size;
    const visitorsPrev = new Set(
      viewsPrev.map((v) => (v.userId ? `u:${v.userId}` : `g:${v.guestToken ?? 'anon'}`)),
    ).size;
    const addToCart = Math.max(completedCount, Math.round(visitors * 0.38));
    const checkout = Math.max(completedCount, Math.round(addToCart * 0.55));
    const conversionRate = visitors > 0 ? completedCount / visitors : 0;

    const dailyRevenueSeries = this.buildTimeSeries(
      completedOrders.map((o) => o.createdAt),
      from,
      to,
      24,
    );
    const ordersSeries = this.buildTimeSeries(
      ordersInRange.map((o) => o.createdAt),
      from,
      to,
      24,
    );

    const productAgg = new Map<
      string,
      { productId: string; name: string; image: string; revenue: number; units: number }
    >();
    const variantAgg = new Map<string, { key: string; label: string; revenue: number; units: number }>();
    for (const o of completedOrders) {
      for (const i of o.items) {
        const key = i.productId;
        const unit = this.decimalAsNumber(i.unitPriceMad);
        const rev = unit * i.quantity;
        const current = productAgg.get(key) ?? {
          productId: i.productId,
          name: i.product.nameFr,
          image: i.product.images[0] ?? '',
          revenue: 0,
          units: 0,
        };
        current.revenue += rev;
        current.units += i.quantity;
        productAgg.set(key, current);

        const variantLabel =
          i.variantLabel?.trim() ||
          i.variant?.selections
            ?.sort((a, b) => (a.option.sortOrder ?? 0) - (b.option.sortOrder ?? 0))
            .map((s) => s.optionValue.valueFr)
            .join(' / ') ||
          'Default';
        const vk = `${i.productId}:${variantLabel}`;
        const va = variantAgg.get(vk) ?? { key: vk, label: `${i.product.nameFr} · ${variantLabel}`, revenue: 0, units: 0 };
        va.revenue += rev;
        va.units += i.quantity;
        variantAgg.set(vk, va);
      }
    }
    const prevProductAgg = new Map<string, number>();
    for (const o of previousCompleted) {
      // no items included in previous slice; trend by revenue share fallback.
      prevProductAgg.set('all', (prevProductAgg.get('all') ?? 0) + this.decimalAsNumber(o.totalMad));
    }
    const prevTotal = prevProductAgg.get('all') ?? 0;
    const topProducts = [...productAgg.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((p) => ({
        ...p,
        trendPct: prevTotal > 0 ? Number((((p.revenue / revenue) - (p.revenue / prevTotal)) * 100).toFixed(1)) : 0,
      }));
    const variants = [...variantAgg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 12);

    const lowStockItems = productRows.filter((p) => p.stock <= p.lowStockThreshold).slice(0, 6);
    const cancellationRate = allOrderCount > 0 ? cancelledCount / allOrderCount : 0;
    const revenueDeltaPct =
      revenuePrev > 0 ? ((revenue - revenuePrev) / revenuePrev) * 100 : revenue > 0 ? 100 : 0;
    const conversionPrev = visitorsPrev > 0 ? previousCompleted.length / visitorsPrev : 0;
    const conversionDeltaPct = (conversionRate - conversionPrev) * 100;

    const lifecycle = ordersInRange.slice(0, 20).map((o) => {
      const lifecycleStatus = this.mapStatusToLifecycle(o.status);
      const placedAt = o.createdAt.toISOString();
      const currentStatusAt = o.updatedAt.toISOString();
      const mins = Math.max(0, Math.round((o.updatedAt.getTime() - o.createdAt.getTime()) / 60000));
      const customerName = o.user
        ? `${o.user.firstName} ${o.user.lastName}`.trim()
        : `${(o.shippingAddress as { firstName?: string })?.firstName ?? ''} ${(o.shippingAddress as { lastName?: string })?.lastName ?? ''}`.trim() || 'Guest';
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: lifecycleStatus,
        customer: {
          name: customerName,
          phone: o.user?.phone ?? o.guestPhone,
          email: o.user?.email ?? o.guestEmail ?? null,
          city: o.deliveryZone.cityNameFr,
        },
        items: o.items.map((it) => ({
          productName: it.product.nameFr,
          variant: it.variantLabel ?? 'Default',
          quantity: it.quantity,
        })),
        timestamps: {
          placedAt,
          confirmedAt: o.status === OrderStatus.PAID ? currentStatusAt : null,
          processingAt: o.status === OrderStatus.PROCESSING ? currentStatusAt : null,
          shippedAt: o.status === OrderStatus.SHIPPED ? currentStatusAt : null,
          deliveredAt: o.status === OrderStatus.DELIVERED ? currentStatusAt : null,
          cancelledAt: o.status === OrderStatus.CANCELLED ? currentStatusAt : null,
          returnedAt: o.status === OrderStatus.REJECTED ? currentStatusAt : null,
          currentStatusAt,
        },
        durations: {
          totalMinutes: mins,
          totalHours: Number((mins / 60).toFixed(2)),
        },
      };
    });

    const topCustomers = topCustomersRows.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      phone: u.phone,
      email: u.email,
      orders: u._count.orders,
      spendMad: Number(
        u.orders.reduce((sum, o) => sum + this.decimalAsNumber(o.totalMad), 0).toFixed(2),
      ),
    }));
    const newCustomers = ordersInRange.filter((o) => !!o.userId).length;
    const returningCustomers = Math.max(0, completedCount - newCustomers);
    const ordersPerCustomer = payingCustomers > 0 ? completedCount / payingCustomers : 0;
    const geoMap = new Map<string, number>();
    for (const o of ordersInRange) {
      const city = o.deliveryZone.cityNameFr || 'Unknown';
      geoMap.set(city, (geoMap.get(city) ?? 0) + 1);
    }
    const geo = [...geoMap.entries()]
      .map(([city, orders]) => ({ city, orders }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 8);

    const alerts: Array<{ level: 'info' | 'warning' | 'critical'; title: string; message: string }> = [];
    if (lowStockItems.length > 0) {
      alerts.push({
        level: 'warning',
        title: 'Low stock warning',
        message: `${lowStockItems.length} products are at or below their stock threshold.`,
      });
    }
    if (revenueDeltaPct < -20) {
      alerts.push({
        level: 'critical',
        title: 'Sudden sales drop',
        message: `Revenue is down ${Math.abs(revenueDeltaPct).toFixed(1)}% vs previous period.`,
      });
    }
    if (cancellationRate > 0.18) {
      alerts.push({
        level: 'warning',
        title: 'High cancellation rate',
        message: `${(cancellationRate * 100).toFixed(1)}% of orders ended cancelled/rejected.`,
      });
    }
    if (paymentFailures > 0) {
      alerts.push({
        level: 'warning',
        title: 'Payment failures',
        message: `${paymentFailures} Stripe orders are still awaiting payment or failed.`,
      });
    }

    const insights: string[] = [];
    const bestVariant = variants[0];
    const weakVariant = variants[variants.length - 1];
    if (bestVariant && weakVariant && bestVariant.key !== weakVariant.key && weakVariant.revenue > 0) {
      const delta = ((bestVariant.revenue - weakVariant.revenue) / weakVariant.revenue) * 100;
      insights.push(`⚠️ ${weakVariant.label} is underperforming (${Math.round(delta)}% behind ${bestVariant.label}).`);
    }
    insights.push(
      revenueDeltaPct >= 0
        ? `🔥 Sales increased ${Math.abs(revenueDeltaPct).toFixed(1)}% compared to the previous period.`
        : `📉 Sales decreased ${Math.abs(revenueDeltaPct).toFixed(1)}% compared to the previous period.`,
    );
    if (conversionDeltaPct < -1) {
      insights.push(`📉 Conversion rate dropped by ${Math.abs(conversionDeltaPct).toFixed(2)} percentage points.`);
    } else if (conversionDeltaPct > 1) {
      insights.push(`📈 Conversion rate improved by ${conversionDeltaPct.toFixed(2)} percentage points.`);
    }
    if (topProducts[0]) {
      insights.push(`💡 Increase stock depth for ${topProducts[0].name}; it leads with ${topProducts[0].units} units sold.`);
    }

    return {
      range: {
        mode: range,
        from: from.toISOString(),
        to: to.toISOString(),
      },
      lastUpdatedAt: now.toISOString(),
      kpis: {
        revenueToday: Number(
          completedOrders
            .filter((o) => {
              const d = new Date();
              d.setHours(0, 0, 0, 0);
              return o.createdAt >= d;
            })
            .reduce((sum, o) => sum + this.decimalAsNumber(o.totalMad), 0)
            .toFixed(2),
        ),
        revenue7d: Number(
          completedOrders
            .filter((o) => o.createdAt >= new Date(now.getTime() - 7 * 86400000))
            .reduce((sum, o) => sum + this.decimalAsNumber(o.totalMad), 0)
            .toFixed(2),
        ),
        revenue30d: Number(
          completedOrders
            .filter((o) => o.createdAt >= new Date(now.getTime() - 30 * 86400000))
            .reduce((sum, o) => sum + this.decimalAsNumber(o.totalMad), 0)
            .toFixed(2),
        ),
        profitMad: Number(profit.toFixed(2)),
        conversionRate,
        averageOrderValueMad: Number(aov.toFixed(2)),
        ordersPerHour: Number(ordersPerHour.toFixed(2)),
        clvMad: Number(clv.toFixed(2)),
        repeatCustomerRate: Number(repeatRate.toFixed(4)),
      },
      charts: {
        revenueOverTime: dailyRevenueSeries.map((p) => ({ ...p, value: Number((p.value * aov).toFixed(2)) })),
        ordersOverTime: ordersSeries,
        funnel: {
          visitors,
          addToCart,
          checkout,
          purchase: completedCount,
        },
        topProducts,
        variantPerformance: variants,
      },
      orderTracking: lifecycle,
      alerts,
      insights,
      customers: {
        newVsReturning: {
          newCustomers,
          returningCustomers,
        },
        topCustomers,
        ordersPerCustomer: Number(ordersPerCustomer.toFixed(2)),
        geography: geo,
      },
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

  private async ensureUniqueSlug(base: string, excludeProductId?: string) {
    let slug = base;
    let n = 0;
    for (;;) {
      const clash = await this.prisma.product.findFirst({
        where: {
          slug,
          ...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
        },
        select: { id: true },
      });
      if (!clash) return slug;
      n += 1;
      slug = `${base}-${n}`;
    }
  }

  private async generateUniqueSku(): Promise<string> {
    for (let i = 0; i < 12; i += 1) {
      const sku = `ATL-${genSkuSuffix()}`;
      const clash = await this.prisma.product.findUnique({
        where: { sku },
        select: { id: true },
      });
      if (!clash) return sku;
    }
    throw new ConflictException('Could not allocate a unique SKU');
  }

  private adminProductSelect() {
    return {
      id: true,
      slug: true,
      sku: true,
      nameFr: true,
      nameAr: true,
      descriptionFr: true,
      descriptionAr: true,
      priceMad: true,
      compareAtMad: true,
      stock: true,
      lowStockThreshold: true,
      purchaseCount: true,
      images: true,
      isActive: true,
      variantsEnabled: true,
      metadata: true,
      categoryId: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { id: true, nameFr: true, slug: true } },
    } as const;
  }

  private mapAdminProduct(
    p: {
      priceMad: Prisma.Decimal;
      compareAtMad: Prisma.Decimal | null;
    } & Record<string, unknown>,
  ) {
    const { priceMad, compareAtMad, ...rest } = p;
    return {
      ...rest,
      priceMad: priceMad.toString(),
      compareAtMad: compareAtMad?.toString() ?? null,
    };
  }

  async createManagedProduct(dto: CreateProductDto) {
    const nameFr = dto.nameFr.trim();
    const descriptionFr = dto.descriptionFr.trim();
    const nameAr = (dto.nameAr?.trim() || nameFr).trim();
    const descriptionAr = (dto.descriptionAr?.trim() || descriptionFr).trim();
    const baseSlug = slugifyTitle(dto.slug?.trim() || nameFr);
    const slug = await this.ensureUniqueSlug(baseSlug);

    let sku: string;
    if (dto.sku?.trim()) {
      sku = dto.sku.trim().toUpperCase();
      const taken = await this.prisma.product.findUnique({
        where: { sku },
        select: { id: true },
      });
      if (taken) throw new ConflictException('SKU already in use');
    } else {
      sku = await this.generateUniqueSku();
    }

    const cat = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
      select: { id: true },
    });
    if (!cat) throw new NotFoundException('Category not found');

    const images = dto.images?.length ? dto.images : [];

    const created = await this.prisma.product.create({
      data: {
        slug,
        sku,
        nameFr,
        nameAr,
        descriptionFr,
        descriptionAr,
        priceMad: dto.priceMad,
        ...(dto.compareAtMad?.trim()
          ? { compareAtMad: dto.compareAtMad.trim() }
          : {}),
        stock: dto.stock ?? 0,
        images,
        isActive: dto.isActive ?? true,
        ...(typeof dto.variantsEnabled === 'boolean'
          ? { variantsEnabled: dto.variantsEnabled }
          : {}),
        ...(typeof dto.lowStockThreshold === 'number'
          ? { lowStockThreshold: dto.lowStockThreshold }
          : {}),
        ...(dto.metadata && Object.keys(dto.metadata).length > 0
          ? { metadata: dto.metadata as Prisma.InputJsonValue }
          : {}),
        category: { connect: { id: dto.categoryId } },
      },
      select: this.adminProductSelect(),
    });
    return this.mapAdminProduct(created);
  }

  async productByIdForAdmin(id: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      select: {
        ...this.adminProductSelect(),
        options: {
          orderBy: { sortOrder: 'asc' },
          include: {
            values: { orderBy: { sortOrder: 'asc' } },
          },
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
    if (!p) throw new NotFoundException('Product not found');

    const { options, variants, ...core } = p;
    const mapped = this.mapAdminProduct(core);

    return {
      ...mapped,
      options: options.map((o) => ({
        id: o.id,
        nameFr: o.nameFr,
        nameAr: o.nameAr,
        sortOrder: o.sortOrder,
        values: o.values.map((v) => ({
          id: v.id,
          valueFr: v.valueFr,
          valueAr: v.valueAr,
          colorHex: v.colorHex,
          imageUrl: v.imageUrl,
          sortOrder: v.sortOrder,
        })),
      })),
      variants: variants.map((v) => {
        const valueIndexes = options.map((opt) => {
          const sel = v.selections.find((s) => s.optionId === opt.id);
          if (!sel) return 0;
          const ix = opt.values.findIndex((val) => val.id === sel.optionValueId);
          return ix >= 0 ? ix : 0;
        });
        return {
          id: v.id,
          sku: v.sku,
          priceMad: v.priceMad?.toString() ?? null,
          compareAtMad: v.compareAtMad?.toString() ?? null,
          stock: v.stock,
          images: [...v.images],
          isDefault: v.isDefault,
          valueIndexes,
          selection: Object.fromEntries(
            v.selections.map((s) => [s.optionId, s.optionValueId]),
          ),
        };
      }),
    };
  }

  async replaceProductVariants(productId: string, dto: ReplaceProductVariantsDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (!dto.variantsEnabled) {
      await this.prisma.$transaction(async (tx) => {
        const oldIds = await tx.productVariant.findMany({
          where: { productId },
          select: { id: true },
        });
        const ids = oldIds.map((x) => x.id);
        if (ids.length) {
          await tx.cartItem.deleteMany({ where: { variantId: { in: ids } } });
        }
        await tx.productVariant.deleteMany({ where: { productId } });
        await tx.productOption.deleteMany({ where: { productId } });
        await tx.product.update({
          where: { id: productId },
          data: { variantsEnabled: false },
        });
      });
      return this.productByIdForAdmin(productId);
    }

    if (!dto.options.length) {
      throw new BadRequestException(
        'When variants are enabled, add at least one option (e.g. Color).',
      );
    }
    if (!dto.variants.length) {
      throw new BadRequestException(
        'When variants are enabled, add at least one variant row (e.g. Green / M).',
      );
    }

    for (const o of dto.options) {
      if (!o.values?.length) {
        throw new BadRequestException(`Option "${o.nameFr}" needs at least one value.`);
      }
    }

    for (const v of dto.variants) {
      if (v.valueIndexes.length !== dto.options.length) {
        throw new BadRequestException(
          'Each variant must select exactly one value for every option.',
        );
      }
      for (let oi = 0; oi < dto.options.length; oi += 1) {
        const ix = v.valueIndexes[oi];
        if (ix < 0 || ix >= dto.options[oi].values.length) {
          throw new BadRequestException('Invalid value index in a variant row.');
        }
      }
    }

    const skus = dto.variants.map((v) => v.sku.trim().toUpperCase());
    const skuSet = new Set<string>();
    for (const sku of skus) {
      if (!sku.length) throw new BadRequestException('Variant SKU cannot be empty.');
      if (skuSet.has(sku)) throw new BadRequestException(`Duplicate variant SKU: ${sku}`);
      skuSet.add(sku);
      if (sku === product.sku.toUpperCase()) {
        throw new BadRequestException(
          `Variant SKU must differ from the product SKU (${product.sku}).`,
        );
      }
      const pClash = await this.prisma.product.findFirst({
        where: { sku, NOT: { id: productId } },
        select: { id: true },
      });
      if (pClash) {
        throw new ConflictException(`SKU ${sku} is already used by another product.`);
      }
      const vClash = await this.prisma.productVariant.findFirst({
        where: { sku, NOT: { productId } },
        select: { id: true },
      });
      if (vClash) {
        throw new ConflictException(`SKU ${sku} is already used by another variant.`);
      }
    }

    const comboKeys = new Set<string>();
    for (const v of dto.variants) {
      const key = v.valueIndexes.join(':');
      if (comboKeys.has(key)) {
        throw new BadRequestException('Two variant rows use the same option combination.');
      }
      comboKeys.add(key);
    }

    const defaultRow = dto.variants.findIndex((v) => v.isDefault === true);
    const defaultIdx = defaultRow >= 0 ? defaultRow : 0;

    await this.prisma.$transaction(async (tx) => {
      const oldIds = await tx.productVariant.findMany({
        where: { productId },
        select: { id: true },
      });
      const ids = oldIds.map((x) => x.id);
      if (ids.length) {
        await tx.cartItem.deleteMany({ where: { variantId: { in: ids } } });
      }
      await tx.productVariant.deleteMany({ where: { productId } });
      await tx.productOption.deleteMany({ where: { productId } });

      const createdOptions: { id: string; valueIds: string[] }[] = [];

      for (let oi = 0; oi < dto.options.length; oi += 1) {
        const o = dto.options[oi];
        const opt = await tx.productOption.create({
          data: {
            productId,
            nameFr: o.nameFr.trim(),
            nameAr: (o.nameAr ?? o.nameFr).trim(),
            sortOrder: oi,
            values: {
              create: o.values.map((val, vi) => ({
                valueFr: val.valueFr.trim(),
                valueAr: (val.valueAr ?? val.valueFr).trim(),
                colorHex: val.colorHex?.trim() || null,
                imageUrl: val.imageUrl?.trim() || null,
                sortOrder: vi,
              })),
            },
          },
          include: { values: { orderBy: { sortOrder: 'asc' } } },
        });
        createdOptions.push({
          id: opt.id,
          valueIds: opt.values.map((x) => x.id),
        });
      }

      for (let vi = 0; vi < dto.variants.length; vi += 1) {
        const row = dto.variants[vi];
        const sku = row.sku.trim().toUpperCase();
        const variant = await tx.productVariant.create({
          data: {
            productId,
            sku,
            priceMad: row.priceMad?.trim()
              ? row.priceMad.trim()
              : null,
            compareAtMad: row.compareAtMad?.trim()
              ? row.compareAtMad.trim()
              : null,
            stock: row.stock,
            images: row.images?.length ? row.images : [],
            isDefault: vi === defaultIdx,
            sortOrder: vi,
          },
        });

        for (let oi = 0; oi < dto.options.length; oi += 1) {
          const idx = row.valueIndexes[oi];
          const optionValueId = createdOptions[oi].valueIds[idx]!;
          await tx.productVariantSelection.create({
            data: {
              variantId: variant.id,
              optionId: createdOptions[oi].id,
              optionValueId,
            },
          });
        }
      }

      await tx.product.update({
        where: { id: productId },
        data: { variantsEnabled: true },
      });
    });

    return this.productByIdForAdmin(productId);
  }

  async patchProductVariant(
    productId: string,
    variantId: string,
    dto: PatchProductVariantDto,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        sku: true,
        options: {
          orderBy: { sortOrder: 'asc' },
          include: { values: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');

    const target = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      include: { selections: true },
    });
    if (!target) throw new NotFoundException('Variant not found');

    if (dto.sku !== undefined) {
      const sku = dto.sku.trim().toUpperCase();
      if (!sku.length) throw new BadRequestException('Variant SKU cannot be empty.');
      if (sku === product.sku.toUpperCase()) {
        throw new BadRequestException(
          `Variant SKU must differ from the product SKU (${product.sku}).`,
        );
      }
      const pClash = await this.prisma.product.findFirst({
        where: { sku, NOT: { id: productId } },
        select: { id: true },
      });
      if (pClash) throw new ConflictException(`SKU ${sku} is already used by another product.`);
      const vClash = await this.prisma.productVariant.findFirst({
        where: { sku, NOT: { id: variantId } },
        select: { id: true },
      });
      if (vClash) throw new ConflictException(`SKU ${sku} is already used by another variant.`);
    }

    if (dto.valueIndexes) {
      if (dto.valueIndexes.length !== product.options.length) {
        throw new BadRequestException(
          'Each variant must select exactly one value for every option.',
        );
      }
      for (let oi = 0; oi < product.options.length; oi += 1) {
        const ix = dto.valueIndexes[oi];
        if (ix < 0 || ix >= product.options[oi].values.length) {
          throw new BadRequestException('Invalid value index in this variant.');
        }
      }
      const comboKey = dto.valueIndexes.join(':');
      const siblings = await this.prisma.productVariant.findMany({
        where: { productId, NOT: { id: variantId } },
        include: { selections: true },
      });
      for (const sib of siblings) {
        const sibKey = product.options
          .map((opt) => {
            const sel = sib.selections.find((s) => s.optionId === opt.id);
            if (!sel) return '0';
            const ix = opt.values.findIndex((v) => v.id === sel.optionValueId);
            return String(ix >= 0 ? ix : 0);
          })
          .join(':');
        if (sibKey === comboKey) {
          throw new BadRequestException(
            'Another variant already uses this option combination.',
          );
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.productVariant.updateMany({
          where: { productId, NOT: { id: variantId } },
          data: { isDefault: false },
        });
      }

      const data: Prisma.ProductVariantUpdateInput = {};
      if (dto.sku !== undefined) data.sku = dto.sku.trim().toUpperCase();
      if (dto.priceMad !== undefined) {
        const p = dto.priceMad?.trim();
        data.priceMad = p ? p : null;
      }
      if (dto.compareAtMad !== undefined) {
        const c = dto.compareAtMad?.trim();
        data.compareAtMad = c ? c : null;
      }
      if (dto.stock !== undefined) data.stock = dto.stock;
      if (dto.images !== undefined) data.images = dto.images;
      if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;

      if (Object.keys(data).length > 0) {
        await tx.productVariant.update({
          where: { id: variantId },
          data,
        });
      }

      if (dto.valueIndexes) {
        await tx.productVariantSelection.deleteMany({ where: { variantId } });
        for (let oi = 0; oi < product.options.length; oi += 1) {
          const valueIx = dto.valueIndexes[oi]!;
          const option = product.options[oi]!;
          const optionValueId = option.values[valueIx]!.id;
          await tx.productVariantSelection.create({
            data: {
              variantId,
              optionId: option.id,
              optionValueId,
            },
          });
        }
      }
    });

    return this.productByIdForAdmin(productId);
  }

  async deleteProduct(id: string) {
    const exists = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Product not found');

    const onOrders = await this.prisma.orderItem.count({
      where: { productId: id },
    });
    if (onOrders > 0) {
      throw new ConflictException(
        'This product is on existing customer orders and cannot be deleted. Set it to Draft (inactive) to hide it from the shop, or archive it after a data migration.',
      );
    }

    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
  }

  async listProducts(params: {
    skip?: number;
    take?: number;
    q?: string;
    status?: 'active' | 'draft' | 'all';
  }) {
    const take = Math.min(params.take ?? 50, 200);
    const skip = params.skip ?? 0;
    const where: Prisma.ProductWhereInput = {};
    const st = params.status ?? 'all';
    if (st === 'active') where.isActive = true;
    if (st === 'draft') where.isActive = false;
    const q = params.q?.trim();
    if (q) {
      where.OR = [
        { sku: { contains: q, mode: 'insensitive' } },
        { nameFr: { contains: q, mode: 'insensitive' } },
        { nameAr: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }
    const rows = await this.prisma.product.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        slug: true,
        sku: true,
        nameFr: true,
        nameAr: true,
        priceMad: true,
        compareAtMad: true,
        stock: true,
        lowStockThreshold: true,
        purchaseCount: true,
        images: true,
        isActive: true,
        variantsEnabled: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { id: true, nameFr: true, slug: true } },
      },
    });
    return rows.map((p) => ({
      ...p,
      priceMad: p.priceMad.toString(),
      compareAtMad: p.compareAtMad?.toString() ?? null,
    }));
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Product not found');

    const data: Prisma.ProductUpdateInput = {};

    if (dto.nameFr !== undefined) data.nameFr = dto.nameFr.trim();
    if (dto.nameAr !== undefined) data.nameAr = dto.nameAr.trim();
    if (dto.descriptionFr !== undefined)
      data.descriptionFr = dto.descriptionFr.trim();
    if (dto.descriptionAr !== undefined)
      data.descriptionAr = dto.descriptionAr.trim();

    if (dto.slug !== undefined) {
      const base = slugifyTitle(dto.slug.trim());
      data.slug = await this.ensureUniqueSlug(base, id);
    }

    if (dto.categoryId !== undefined) {
      const cat = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
        select: { id: true },
      });
      if (!cat) throw new NotFoundException('Category not found');
      data.category = { connect: { id: dto.categoryId } };
    }

    if (dto.priceMad !== undefined && dto.priceMad.trim() !== '')
      data.priceMad = dto.priceMad.trim();

    if (dto.compareAtMad !== undefined) {
      const t = dto.compareAtMad.trim();
      data.compareAtMad = t === '' ? null : t;
    }

    if (typeof dto.stock === 'number') data.stock = dto.stock;
    if (typeof dto.isActive === 'boolean') data.isActive = dto.isActive;
    if (typeof dto.variantsEnabled === 'boolean')
      data.variantsEnabled = dto.variantsEnabled;
    if (dto.images !== undefined) data.images = dto.images;

    if (typeof dto.lowStockThreshold === 'number')
      data.lowStockThreshold = dto.lowStockThreshold;

    if (dto.metadata !== undefined) {
      const prev = await this.prisma.product.findUnique({
        where: { id },
        select: { metadata: true },
      });
      const base =
        prev?.metadata &&
        typeof prev.metadata === 'object' &&
        !Array.isArray(prev.metadata)
          ? (prev.metadata as Record<string, unknown>)
          : {};
      data.metadata = {
        ...base,
        ...dto.metadata,
      } as Prisma.InputJsonValue;
    }

    if (Object.keys(data).length === 0) {
      return this.productByIdForAdmin(id);
    }

    const p = await this.prisma.product.update({
      where: { id },
      data,
      select: this.adminProductSelect(),
    });
    return this.mapAdminProduct(p);
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
