import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, isActive: true },
    });
    if (!product) throw new NotFoundException();

    const verified = await this.prisma.orderItem.findFirst({
      where: {
        productId: dto.productId,
        order: {
          userId,
          status: { in: ['DELIVERED', 'SHIPPED', 'PROCESSING'] },
        },
      },
    });
    if (!verified) {
      throw new BadRequestException('Purchase required to review');
    }

    const existing = await this.prisma.review.findFirst({
      where: { userId, productId: dto.productId },
    });
    if (existing) throw new BadRequestException('Already reviewed');

    return this.prisma.review.create({
      data: {
        userId,
        productId: dto.productId,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
      },
    });
  }

  listForProduct(productId: string) {
    return this.prisma.review.findMany({
      where: { productId },
      include: {
        user: { select: { firstName: true, lastName: true, id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
