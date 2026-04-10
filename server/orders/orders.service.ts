import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  PaymentMethod,
  OrderStatus,
  FraudDecision,
} from '@prisma/client';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutDto, CheckoutLineDto } from './dto/checkout.dto';
import { FraudService } from './fraud.service';
import { NotificationsService } from '../integrations/notifications.service';
import { StripeService } from '../integrations/stripe.service';

/** Keeps international +E.164; applies Morocco heuristics only when no country prefix. */
function normalizePhone(raw: string): string {
  let p = raw.replace(/\s/g, '');
  if (!p) return p;
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (p.startsWith('+')) return p;
  if (p.startsWith('0') && p.length === 10) return '+212' + p.slice(1);
  if (p.startsWith('212')) return '+' + p;
  if (/^[567]\d{8}$/.test(p)) return '+212' + p;
  return p;
}

@Injectable()
export class OrdersService {
  private readonly log = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fraud: FraudService,
    private readonly notify: NotificationsService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

  async checkout(dto: CheckoutDto, userId?: string) {
    const zone = await this.prisma.deliveryZone.findFirst({
      where: { cityCode: dto.shipping.cityCode, isActive: true },
    });
    if (!zone)
      throw new BadRequestException('Unknown or inactive delivery zone');

    const productIds = dto.items.map((i: CheckoutLineDto) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });
    if (products.length !== productIds.length) {
      throw new NotFoundException('One or more products unavailable');
    }

    let subtotal = new Prisma.Decimal(0);
    const lineCalcs: {
      productId: string;
      qty: number;
      unit: Prisma.Decimal;
      title: string;
    }[] = [];

    for (const line of dto.items) {
      const p = products.find((x) => x.id === line.productId)!;
      if (p.stock < line.quantity) {
        throw new BadRequestException(`Insufficient stock for ${p.sku}`);
      }
      const unit = p.priceMad;
      subtotal = subtotal.add(unit.mul(line.quantity));
      lineCalcs.push({
        productId: p.id,
        qty: line.quantity,
        unit,
        title: p.nameFr,
      });
    }

    let discount = new Prisma.Decimal(0);
    let couponId: string | undefined;
    if (dto.couponCode) {
      const c = await this.prisma.coupon.findUnique({
        where: { code: dto.couponCode.trim().toUpperCase() },
      });
      if (
        !c ||
        !c.isActive ||
        (c.expiresAt && c.expiresAt < new Date()) ||
        (c.maxUses != null && c.usedCount >= c.maxUses)
      ) {
        throw new BadRequestException('Invalid coupon');
      }
      if (c.minOrderMad && subtotal.lessThan(c.minOrderMad)) {
        throw new BadRequestException('Coupon minimum not reached');
      }
      if (c.type === 'PERCENT') {
        discount = subtotal.mul(c.value).div(100);
      } else {
        discount = c.value;
      }
      if (discount.greaterThan(subtotal)) discount = subtotal;
      couponId = c.id;
    }

    const afterDiscount = subtotal.sub(discount);
    let shipping = zone.shippingCostMad;
    if (
      zone.freeShippingThresholdMad &&
      afterDiscount.greaterThanOrEqualTo(zone.freeShippingThresholdMad)
    ) {
      shipping = new Prisma.Decimal(0);
    }

    const total = afterDiscount.add(shipping);
    const guestPhone = normalizePhone(dto.shipping.phone);

    let priorCount = 0;
    if (userId) {
      priorCount = await this.prisma.order.count({ where: { userId } });
    } else {
      priorCount = await this.prisma.order.count({
        where: { guestPhone },
      });
    }
    const isFirstOrder = priorCount === 0;

    const fraudResult = await this.fraud.assessCheckout({
      guestPhone,
      firstName: dto.firstName,
      lastName: dto.lastName,
      totalMad: total.toNumber(),
      isFirstOrder,
      itemCount: dto.items.length,
    });

    const orderNumber = `AT-${nanoid(10).toUpperCase()}`;
    const rate = parseInt(
      this.config.get<string>('LOYALTY_POINTS_PER_10_MAD', '1'),
      10,
    );
    const loyaltyPointsEarned = Math.floor(total.toNumber() / 10) * rate;

    let stripeIntentId: string | null = null;
    let stripeClientSecret: string | undefined;
    if (dto.paymentMethod === PaymentMethod.STRIPE) {
      if (!this.stripe.isEnabled()) {
        throw new BadRequestException('Stripe not configured');
      }
      const intent = await this.stripe.createPaymentIntent({
        amountMad: total.toNumber(),
        orderNumber,
      });
      stripeIntentId = intent?.id ?? null;
      stripeClientSecret = intent?.client_secret ?? undefined;
    }

    const shippingSnapshot = {
      ...dto.shipping,
      line1: dto.shipping.line1.trim(),
      quarter: dto.shipping.quarter?.trim() || '—',
      cityLabel: dto.shipping.cityLabel.trim(),
      phone: guestPhone,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
    };

    const order = await this.prisma.$transaction(async (tx) => {
      for (const line of dto.items) {
        const updated = await tx.product.updateMany({
          where: {
            id: line.productId,
            stock: { gte: line.quantity },
          },
          data: {
            stock: { decrement: line.quantity },
            purchaseCount: { increment: line.quantity },
          },
        });
        if (updated.count !== 1) {
          throw new BadRequestException('Stock conflict');
        }
      }

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      let initialStatus: OrderStatus = OrderStatus.PROCESSING;
      if (dto.paymentMethod === PaymentMethod.STRIPE) {
        initialStatus = OrderStatus.AWAITING_PAYMENT;
      } else if (
        fraudResult.manualConfirmationRequired ||
        !(dto.phoneConfirmed ?? false)
      ) {
        initialStatus = OrderStatus.PENDING_CONFIRMATION;
      }

      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: userId ?? null,
          guestEmail: dto.guestEmail?.toLowerCase(),
          guestPhone,
          paymentMethod: dto.paymentMethod,
          status: initialStatus,
          subtotalMad: subtotal,
          shippingMad: shipping,
          discountMad: discount,
          totalMad: total,
          couponId: couponId ?? null,
          deliveryZoneId: zone.id,
          shippingAddress: shippingSnapshot as object,
          phoneConfirmed: dto.phoneConfirmed ?? false,
          manualConfirmationRequired: fraudResult.manualConfirmationRequired,
          fraudScore: fraudResult.score,
          affiliateCode: dto.affiliateCode?.toUpperCase() ?? null,
          loyaltyPointsEarned,
          stripePaymentIntentId: stripeIntentId,
        },
      });

      await tx.orderItem.createMany({
        data: lineCalcs.map((l) => ({
          orderId: created.id,
          productId: l.productId,
          quantity: l.qty,
          unitPriceMad: l.unit,
          titleSnapshot: l.title,
        })),
      });

      if (fraudResult.reasons.length) {
        await tx.fraudFlag.create({
          data: {
            orderId: created.id,
            reasons: fraudResult.reasons,
            score: fraudResult.score,
            decision: FraudDecision.PENDING,
          },
        });
      }

      if (dto.affiliateCode) {
        const aff = await tx.affiliate.findFirst({
          where: {
            code: dto.affiliateCode.toUpperCase(),
            isActive: true,
          },
        });
        if (aff) {
          await tx.referralEvent.create({
            data: { affiliateId: aff.id, orderId: created.id },
          });
        }
      }

      if (userId && loyaltyPointsEarned > 0) {
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            orderId: created.id,
            delta: loyaltyPointsEarned,
            reason: 'order_earn',
          },
        });
        await tx.loyaltyAccount.upsert({
          where: { userId },
          create: { userId, balance: loyaltyPointsEarned },
          update: { balance: { increment: loyaltyPointsEarned } },
        });
      }

      return created;
    });

    const paymentLabel =
      dto.paymentMethod === PaymentMethod.STRIPE
        ? 'Carte bancaire (Stripe)'
        : 'Paiement à la livraison (COD)';

    const linesForEmail = lineCalcs.map((l) => ({
      title: l.title,
      qty: l.qty,
      unitPrice: l.unit.toFixed(2),
      lineTotal: l.unit.mul(l.qty).toFixed(2),
    }));

    const addrForEmail = {
      line1: shippingSnapshot.line1,
      quarter: shippingSnapshot.quarter,
      cityCode: dto.shipping.cityCode,
      cityName: zone.cityNameFr,
      cityLabel: shippingSnapshot.cityLabel,
      postal: dto.shipping.postalCode ?? null,
    };

    const guestEmailNorm = dto.guestEmail?.trim();

    // Never await SMTP here — slow or blocked mail servers would keep the client on "Validation…"
    void Promise.all([
      this.notify.sendOrderConfirmationEmail({
        to: guestEmailNorm,
        orderNumber: order.orderNumber,
        totalMad: total.toFixed(2),
        subtotalMad: subtotal.toFixed(2),
        shippingMad: shipping.toFixed(2),
        discountMad: discount.toFixed(2),
        customerName: `${dto.firstName.trim()} ${dto.lastName.trim()}`,
        paymentLabel,
        lines: linesForEmail.map(({ title, qty, lineTotal }) => ({
          title,
          qty,
          lineTotal,
        })),
        address: addrForEmail,
        shippingPhone: guestPhone,
      }),
      this.notify.sendMerchantNewOrderEmail({
        orderNumber: order.orderNumber,
        totalMad: total.toFixed(2),
        subtotalMad: subtotal.toFixed(2),
        shippingMad: shipping.toFixed(2),
        discountMad: discount.toFixed(2),
        paymentMethod: paymentLabel,
        customer: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email: guestEmailNorm ?? null,
          phone: guestPhone,
        },
        address: addrForEmail,
        lines: linesForEmail,
        couponCode: dto.couponCode?.trim() || null,
      }),
    ])
      .then(([cust, merch]) => {
        this.log.log(
          `Post-checkout emails order=${order.orderNumber} customer=${cust} merchant=${merch}`,
        );
      })
      .catch((err: unknown) => {
        this.log.error(
          `Post-checkout emails failed order=${order.orderNumber}`,
          err instanceof Error ? err.stack : String(err),
        );
      });

    void this.notify
      .sendWhatsAppTemplate({
        toE164: guestPhone.replace('+', ''),
        orderNumber: order.orderNumber,
      })
      .catch((error) => {
        console.error('[orders.checkout] sendWhatsAppTemplate failed', {
          orderNumber: order.orderNumber,
          error,
        });
      });

    const whatsappAdminLink = this.notify.buildWhatsAppOrderLink({
      phoneCustomer: guestPhone,
      orderNumber: order.orderNumber,
      totalMad: total.toFixed(2),
    });

    return {
      success: true,
      orderId: order.id,
      order,
      fraud: fraudResult,
      stripeClientSecret,
      whatsappConfirmUrl: whatsappAdminLink,
      emailStatus: {
        customerConfirmationSent: null,
        merchantNotificationSent: null,
        customerSkippedNoEmail: !guestEmailNorm,
        queuedAsync: true,
      },
    };
  }

  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true, deliveryZone: true },
    });
  }

  async findOneForUser(orderId: string, userId: string) {
    const o = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true, deliveryZone: true, fraudFlags: true },
    });
    if (!o) throw new NotFoundException();
    return o;
  }
}
