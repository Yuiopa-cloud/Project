import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';
import { TrackViewDto } from './dto/track-view.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Post('view')
  async trackView(
    @Body() dto: TrackViewDto,
    @CurrentUser() u?: JwtPayloadUser,
  ) {
    await this.prisma.productView.create({
      data: {
        productId: dto.productId,
        userId: u?.sub,
        guestToken: dto.guestToken,
      },
    });
    return { ok: true };
  }

  @Public()
  @Get('recent')
  async recent(
    @Query('guestToken') guestToken?: string,
    @CurrentUser() u?: JwtPayloadUser,
  ) {
    if (!u?.sub && !guestToken) return [];
    const rows = await this.prisma.productView.findMany({
      where: u?.sub ? { userId: u.sub } : { guestToken: guestToken! },
      orderBy: { viewedAt: 'desc' },
      take: 40,
      include: { product: { include: { category: true } } },
    });
    const seen = new Set<string>();
    const out: NonNullable<(typeof rows)[0]['product']>[] = [];
    for (const r of rows) {
      if (!r.product || seen.has(r.productId)) continue;
      seen.add(r.productId);
      out.push(r.product);
      if (out.length >= 12) break;
    }
    return out;
  }
}
