import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayloadUser } from '../common/decorators/current-user.decorator';

@ApiTags('loyalty')
@ApiBearerAuth()
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@CurrentUser() u: JwtPayloadUser) {
    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { userId: u.sub },
    });
    const history = await this.prisma.loyaltyTransaction.findMany({
      where: { userId: u.sub },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { balance: account?.balance ?? 0, history };
  }
}
