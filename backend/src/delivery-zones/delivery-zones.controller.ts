import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DeliveryZonesService } from './delivery-zones.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('delivery-zones')
@Controller('delivery-zones')
export class DeliveryZonesController {
  constructor(private readonly zones: DeliveryZonesService) {}

  @Public()
  @Get()
  list() {
    return this.zones.findActive();
  }
}
