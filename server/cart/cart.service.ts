import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';

function cartLineKey(productId: string, variantId: string | null | undefined) {
  return variantId && variantId.length > 0 ? variantId : `base:${productId}`;
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId?: string, guestToken?: string) {
    if (userId) {
      let cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
              variant: {
                include: {
                  selections: {
                    include: { option: true, optionValue: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!cart) {
        cart = await this.prisma.cart.create({
          data: { userId },
          include: {
            items: {
              include: {
                product: true,
                variant: {
                  include: {
                    selections: {
                      include: { option: true, optionValue: true },
                    },
                  },
                },
              },
            },
          },
        });
      }
      return { cart, guestToken: null as string | null };
    }
    const token = guestToken ?? nanoid(16);
    let cart = await this.prisma.cart.findUnique({
      where: { guestToken: token },
      include: {
        items: {
          include: {
            product: true,
            variant: {
              include: {
                selections: {
                  include: { option: true, optionValue: true },
                },
              },
            },
          },
        },
      },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { guestToken: token },
        include: {
          items: {
            include: {
              product: true,
              variant: {
                include: {
                  selections: {
                    include: { option: true, optionValue: true },
                  },
                },
              },
            },
          },
        },
      });
    }
    return { cart, guestToken: token };
  }

  async addItem(
    userId: string | undefined,
    guestToken: string | undefined,
    productId: string,
    quantity: number,
    variantId?: string | null,
  ) {
    const { cart } = await this.getCart(userId, guestToken);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const lineKey = cartLineKey(productId, variantId);

    if (product.variantsEnabled) {
      if (!variantId?.trim()) {
        throw new BadRequestException(
          'This product has variants — pick a size, color, etc.',
        );
      }
      const v = await this.prisma.productVariant.findFirst({
        where: { id: variantId.trim(), productId },
      });
      if (!v) throw new NotFoundException('Variant not found');
      if (v.stock < quantity) {
        throw new BadRequestException('Not enough stock for this variant');
      }
    } else {
      if (variantId?.trim()) {
        throw new BadRequestException('This product has no variants');
      }
      if (product.stock < quantity) {
        throw new BadRequestException('Not enough stock');
      }
    }

    await this.prisma.cartItem.upsert({
      where: {
        cartId_lineKey: { cartId: cart.id, lineKey },
      },
      create: {
        cartId: cart.id,
        productId,
        variantId: variantId?.trim() || null,
        lineKey,
        quantity,
      },
      update: { quantity: { increment: quantity } },
    });
    return this.prisma.cart.findUniqueOrThrow({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: true,
            variant: {
              include: {
                selections: {
                  include: { option: true, optionValue: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async setQty(
    userId: string | undefined,
    guestToken: string | undefined,
    cartItemId: string,
    quantity: number,
  ) {
    const { cart } = await this.getCart(userId, guestToken);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, cartId: cart.id },
      include: {
        product: true,
        variant: {
          include: {
            selections: { include: { option: true, optionValue: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundException('Cart line not found');

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      const p = item.product;
      let maxStock = p.stock;
      if (p.variantsEnabled) {
        if (!item.variantId || !item.variant) {
          throw new BadRequestException('Invalid variant on cart line');
        }
        maxStock = item.variant.stock;
      }
      if (maxStock < quantity) {
        throw new BadRequestException('Invalid quantity / stock');
      }
      await this.prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity },
      });
    }
    return this.prisma.cart.findUniqueOrThrow({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: true,
            variant: {
              include: {
                selections: {
                  include: { option: true, optionValue: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async mergeGuestIntoUser(guestToken: string, userId: string) {
    const guest = await this.prisma.cart.findUnique({
      where: { guestToken },
      include: { items: true },
    });
    if (!guest?.items.length) return this.getCart(userId, undefined);

    let userCart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!userCart) {
      userCart = await this.prisma.cart.create({ data: { userId } });
    }
    for (const item of guest.items) {
      await this.prisma.cartItem.upsert({
        where: {
          cartId_lineKey: {
            cartId: userCart.id,
            lineKey: item.lineKey,
          },
        },
        create: {
          cartId: userCart.id,
          productId: item.productId,
          variantId: item.variantId,
          lineKey: item.lineKey,
          quantity: item.quantity,
        },
        update: { quantity: { increment: item.quantity } },
      });
    }
    await this.prisma.cart.delete({ where: { id: guest.id } });
    return this.getCart(userId, undefined);
  }
}
