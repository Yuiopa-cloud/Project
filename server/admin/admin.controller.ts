import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { PatchProductVariantDto } from './dto/patch-product-variant.dto';
import { ReplaceProductVariantsDto } from './dto/replace-product-variants.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard(@Query('days') days?: string) {
    return this.admin.dashboard(days ? Number(days) : undefined);
  }

  @Get('analytics/advanced')
  advancedAnalytics(
    @Query('range') range?: 'today' | '7d' | '30d' | 'custom',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.admin.advancedAnalytics({ range, from, to });
  }

  @Get('customers')
  customers(@Query('take') take?: string) {
    return this.admin.listCustomers(take ? Number(take) : undefined);
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

  @Get('orders/:id')
  orderById(@Param('id') id: string) {
    return this.admin.orderById(id);
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

  @Get('products')
  listProducts(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
  ) {
    const st =
      status === 'active' || status === 'draft' ? status : 'all';
    return this.admin.listProducts({
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      q,
      status: st,
    });
  }

  @Get('products/:id')
  productById(@Param('id') id: string) {
    return this.admin.productByIdForAdmin(id);
  }

  @Patch('products/:id')
  patchProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.admin.updateProduct(id, dto);
  }

  @Put('products/:id/variants')
  replaceVariants(
    @Param('id') id: string,
    @Body() dto: ReplaceProductVariantsDto,
  ) {
    return this.admin.replaceProductVariants(id, dto);
  }

  @Patch('products/:id/variants/:variantId')
  patchVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() dto: PatchProductVariantDto,
  ) {
    return this.admin.patchProductVariant(id, variantId, dto);
  }

  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.admin.createManagedProduct(dto);
  }

  @Delete('products/:id')
  deleteProduct(@Param('id') id: string) {
    return this.admin.deleteProduct(id);
  }
}
