import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly rec: RecommendationsService) {}

  @Public()
  @Get('product/:productId/bundles')
  bundles(
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    return this.rec.frequentlyBoughtTogether(
      productId,
      limit ? Number(limit) : 6,
    );
  }

  @Public()
  @Get('product/:productId/related')
  related(
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ) {
    return this.rec.relatedMix(productId, limit ? Number(limit) : 8);
  }
}
