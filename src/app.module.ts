import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { KeysModule } from './keys/keys.module';
import { PaymentsModule } from './payments/payments.module';
import { CommonModule } from './common/common.module';
import { MessagingModule } from './messaging/messaging.module';
import { IdentityModule } from './identity/identity.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WalletModule } from './wallet/wallet.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
          : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        autoLogging: true,
        serializers: {
          req(req) {
            return {
              method: req.method,
              url: req.url,
            };
          },
        },
      },
    }),
    ThrottlerModule.forRoot([{ name: 'global', ttl: 60000, limit: 100 }]),
    BullModule.forRoot({ redis: process.env.REDIS_URL! }),
    CommonModule,
    PrismaModule,
    AuthModule,
    KeysModule,
    PaymentsModule,
    MessagingModule,
    IdentityModule,
    WebhooksModule,
    WalletModule,
    DashboardModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}