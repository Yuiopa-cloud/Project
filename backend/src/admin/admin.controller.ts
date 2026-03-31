import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole, OrderStatus } from '@prisma/client';
import { FraudDecideDto } from './dto/fraud-decide.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Prisma } from '@prisma/client';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('orders')
  orders(
    @Query('status') status?: OrderStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.admin.orders({
      status,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Patch('orders/:id/status')
  orderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.admin.setOrderStatus(id, dto.status);
  }

  @Post('orders/:orderId/fraud-decision')
  fraudDecision(
    @Param('orderId') orderId: string,
    @Body() dto: FraudDecideDto,
    @CurrentUser() u: JwtPayloadUser,
  ) {
    return this.admin.fraudDecide(orderId, u.sub, dto.decision);
  }

  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    const data: Prisma.ProductCreateInput = {
      slug: dto.slug,
      sku: dto.sku,
      nameFr: dto.nameFr,
      nameAr: dto.nameAr,
      descriptionFr: dto.descriptionFr,
      descriptionAr: dto.descriptionAr,
      priceMad: dto.priceMad,
      ...(dto.compareAtMad ? { compareAtMad: dto.compareAtMad } : {}),
      stock: dto.stock ?? 0,
      images: dto.images ?? [],
      isActive: dto.isActive ?? true,
      category: { connect: { id: dto.categoryId } },
    };
    return this.admin.createProduct(data);
  }
}
