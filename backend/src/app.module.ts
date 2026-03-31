import { existsSync } from 'fs';
import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { CouponsModule } from './coupons/coupons.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { DeliveryZonesModule } from './delivery-zones/delivery-zones.module';
import { AdminModule } from './admin/admin.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { AffiliatesModule } from './affiliates/affiliates.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { HealthModule } from './health/health.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { TrackingModule } from './tracking/tracking.module';

/** So `npm run dev:backend` from repo root still loads `backend/.env`. */
const envFilePath = [
  join(process.cwd(), 'backend', '.env'),
  join(process.cwd(), '.env'),
  join(__dirname, '..', '.env'),
].filter((p) => existsSync(p));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePath.length ? envFilePath : undefined,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 20,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 120,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    CouponsModule,
    ReviewsModule,
    WishlistModule,
    DeliveryZonesModule,
    AdminModule,
    LoyaltyModule,
    AffiliatesModule,
    RecommendationsModule,
    HealthModule,
    IntegrationsModule,
    TrackingModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
