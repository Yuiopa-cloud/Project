import {
  BadRequestException,
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
