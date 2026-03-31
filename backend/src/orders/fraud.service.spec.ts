import { FraudService } from './fraud.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FraudService', () => {
  it('scores duplicate phone pattern', async () => {
    const prisma = {
      order: { count: jest.fn().mockResolvedValue(3) },
    } as unknown as PrismaService;
    const svc = new FraudService(prisma);
    const r = await svc.assessCheckout({
      guestPhone: '+212600000000',
      firstName: 'K',
      lastName: 'B',
      totalMad: 200,
      isFirstOrder: true,
      itemCount: 2,
    });
    expect(r.score).toBeGreaterThanOrEqual(40);
    expect(r.manualConfirmationRequired).toBe(true);
  });
});
