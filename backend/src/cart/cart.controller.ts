import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { AddCartItemDto, MergeCartDto, SetCartQtyDto } from './dto/cart-mutation.dto';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Public()
  @Get()
  get(@Query('guestToken') guestToken: string | undefined, @CurrentUser() u?: JwtPayloadUser) {
    return this.cart.getCart(u?.sub, guestToken);
  }

  @Public()
  @Post('items')
  add(
    @Body() dto: AddCartItemDto,
    @CurrentUser() u?: JwtPayloadUser,
  ) {
    return this.cart.addItem(u?.sub, dto.guestToken, dto.productId, dto.quantity);
  }

  @Public()
  @Post('items/qty')
  setQty(@Body() dto: SetCartQtyDto, @CurrentUser() u?: JwtPayloadUser) {
    return this.cart.setQty(u?.sub, dto.guestToken, dto.productId, dto.quantity);
  }

  @ApiBearerAuth()
  @Post('merge')
  merge(@Body() dto: MergeCartDto, @CurrentUser() u: JwtPayloadUser) {
    return this.cart.mergeGuestIntoUser(dto.guestToken, u.sub);
  }
}
