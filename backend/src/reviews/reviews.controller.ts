import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @ApiBearerAuth()
  @Post()
  create(
    @Body() dto: CreateReviewDto,
    @CurrentUser() u: JwtPayloadUser,
  ) {
    return this.reviews.create(u.sub, dto);
  }

  @Public()
  @Get('product/:productId')
  forProduct(@Param('productId') productId: string) {
    return this.reviews.listForProduct(productId);
  }
}
