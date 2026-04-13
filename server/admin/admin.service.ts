import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FraudDecision,
  OrderStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProductDto } from './dto/create-product.dto';
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
        category: { connect: { id: dto.categoryId } },
      },
      select: this.adminProductSelect(),
    });
    return this.mapAdminProduct(created);
  }

  async productByIdForAdmin(id: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      select: this.adminProductSelect(),
    });
    if (!p) throw new NotFoundException('Product not found');
    return this.mapAdminProduct(p);
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
    if (dto.images !== undefined) data.images = dto.images;

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
