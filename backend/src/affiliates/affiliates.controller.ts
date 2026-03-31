import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('affiliates')
@Controller('affiliates')
export class AffiliatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('lookup/:code')
  async lookup(@Param('code') code: string) {
    const aff = await this.prisma.affiliate.findFirst({
      where: { code: code.toUpperCase(), isActive: true },
      select: { code: true, displayName: true, commissionPercent: true },
    });
    return aff ?? { valid: false };
  }
}
