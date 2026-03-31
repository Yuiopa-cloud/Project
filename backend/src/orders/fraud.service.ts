import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type FraudAssessment = {
  score: number;
  manualConfirmationRequired: boolean;
  reasons: string[];
};

const SUSPICIOUS_NAME = /^(.)\1+$|^test+$/i;
const ONLY_NUMBERS = /^\d+$/;

@Injectable()
export class FraudService {
  constructor(private readonly prisma: PrismaService) {}

  async assessCheckout(input: {
    guestPhone: string;
    firstName: string;
    lastName: string;
    totalMad: number;
    isFirstOrder: boolean;
    itemCount: number;
  }): Promise<FraudAssessment> {
    const reasons: string[] = [];
    let score = 0;

    const phoneCount = await this.prisma.order.count({
      where: {
        guestPhone: input.guestPhone,
        createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
      },
    });
    if (phoneCount >= 2) {
      score += 35;
      reasons.push('duplicate_phone_24h');
    }

    const fn = input.firstName.trim();
    const ln = input.lastName.trim();
    if (fn.length < 2 || ln.length < 2) {
      score += 20;
      reasons.push('name_too_short');
    }
    if (SUSPICIOUS_NAME.test(fn) || SUSPICIOUS_NAME.test(ln)) {
      score += 25;
      reasons.push('suspicious_name_pattern');
    }
    if (ONLY_NUMBERS.test(fn) || ONLY_NUMBERS.test(ln)) {
      score += 30;
      reasons.push('numeric_name');
    }

    if (input.isFirstOrder && input.totalMad > 8000 && input.itemCount <= 1) {
      score += 25;
      reasons.push('high_value_single_item_first_order');
    }

    score = Math.min(100, score);
    const manualConfirmationRequired = score >= 40;

    return { score, manualConfirmationRequired, reasons };
  }
}
