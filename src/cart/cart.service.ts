import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId?: string, guestToken?: string) {
    if (userId) {
      let cart = await this.prisma.cart.findUnique({
        where: { userId },
        include: { items: { include: { product: true } } },
      });
      if (!cart) {
        cart = await this.prisma.cart.create({
          data: { userId },
          include: { items: { include: { product: true } } },
        });
      }
      return { cart, guestToken: null as string | null };
    }
    const token = guestToken ?? nanoid(16);
    let cart = await this.prisma.cart.findUnique({
      where: { guestToken: token },
      include: { items: { include: { product: true } } },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { guestToken: token },
        include: { items: { include: { product: true } } },
      });
    }
    return { cart, guestToken: token };
  }

  async addItem(userId: string | undefined, guestToken: string | undefined, productId: string, quantity: number) {
    const { cart } = await this.getCart(userId, guestToken);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.stock < quantity)
      throw new BadRequestException('Not enough stock');

    await this.prisma.cartItem.upsert({
      where: {
        cartId_productId: { cartId: cart.id, productId },
      },
      create: { cartId: cart.id, productId, quantity },
      update: { quantity: { increment: quantity } },
    });
    return this.prisma.cart.findUniqueOrThrow({
      where: { id: cart.id },
      include: { items: { include: { product: true } } },
    });
  }

  async setQty(
    userId: string | undefined,
    guestToken: string | undefined,
    productId: string,
    quantity: number,
  ) {
    const { cart } = await this.getCart(userId, guestToken);
    if (quantity <= 0) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId },
      });
    } else {
      const product = await this.prisma.product.findFirst({
        where: { id: productId },
      });
      if (!product || product.stock < quantity) {
        throw new BadRequestException('Invalid quantity / stock');
      }
      await this.prisma.cartItem.updateMany({
        where: { cartId: cart.id, productId },
        data: { quantity },
      });
    }
    return this.prisma.cart.findUniqueOrThrow({
      where: { id: cart.id },
      include: { items: { include: { product: true } } },
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
          cartId_productId: { cartId: userCart.id, productId: item.productId },
        },
        create: {
          cartId: userCart.id,
          productId: item.productId,
          quantity: item.quantity,
        },
        update: { quantity: { increment: item.quantity } },
      });
    }
    await this.prisma.cart.delete({ where: { id: guest.id } });
    return this.getCart(userId, undefined);
  }
}
