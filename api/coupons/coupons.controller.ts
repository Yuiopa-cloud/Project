import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Public()
  @Get('validate')
  validate(@Query('code') code: string, @Query('subtotal') subtotal: string) {
    return this.coupons.validate(code, Number(subtotal));
  }
}
