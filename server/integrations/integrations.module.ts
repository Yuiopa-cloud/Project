import { Global, Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { StripeService } from './stripe.service';

@Global()
@Module({
  providers: [NotificationsService, StripeService],
  exports: [NotificationsService, StripeService],
})
export class IntegrationsModule {}
