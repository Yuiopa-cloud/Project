import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly log = new Logger(StripeService.name);
  private client: Stripe | null = null;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) this.client = new Stripe(key);
  }

  isEnabled(): boolean {
    return !!this.client;
  }

  async createPaymentIntent(params: {
    amountMad: number;
    orderNumber: string;
    metadata?: Record<string, string>;
  }) {
    if (!this.client) {
      this.log.warn('Stripe not configured');
      return null;
    }
    const amountMinor = Math.round(Number(params.amountMad) * 100);
    return this.client.paymentIntents.create({
      amount: amountMinor,
      currency: 'mad',
      metadata: {
        orderNumber: params.orderNumber,
        ...params.metadata,
      },
      automatic_payment_methods: { enabled: true },
    });
  }
}
