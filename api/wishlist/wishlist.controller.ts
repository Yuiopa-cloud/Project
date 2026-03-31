import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('wishlist')
@ApiBearerAuth()
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  list(@CurrentUser() u: JwtPayloadUser) {
    return this.wishlist.list(u.sub);
  }

  @Post(':productId')
  add(
    @Param('productId') productId: string,
    @CurrentUser() u: JwtPayloadUser,
  ) {
    return this.wishlist.add(u.sub, productId);
  }

  @Delete(':productId')
  remove(
    @Param('productId') productId: string,
    @CurrentUser() u: JwtPayloadUser,
  ) {
    return this.wishlist.remove(u.sub, productId);
  }
}
