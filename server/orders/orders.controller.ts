import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  private readonly log = new Logger(OrdersController.name);

  constructor(
    private readonly orders: OrdersService,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Post('checkout')
  async checkout(
    @Body() dto: CheckoutDto,
    @Headers('authorization') authorization?: string,
  ) {
    let userId: string | undefined;
    const bearer = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : undefined;
    if (bearer) {
      try {
        const p = await this.jwt.verifyAsync<{
          sub: string;
        }>(bearer);
        userId = p.sub;
      } catch {
        /* guest checkout */
      }
    }
    try {
      return await this.orders.checkout(dto, userId);
    } catch (e) {
      this.log.error(`checkout failed userId=${userId ?? 'guest'}`, e);
      throw e;
    }
  }

  @ApiBearerAuth()
  @Get('me')
  myOrders(@CurrentUser() u: JwtPayloadUser) {
    return this.orders.getMyOrders(u!.sub);
  }

  @ApiBearerAuth()
  @Get('me/:id')
  oneMine(
    @Param('id') id: string,
    @CurrentUser() u: JwtPayloadUser,
  ) {
    return this.orders.findOneForUser(id, u!.sub);
  }
}
