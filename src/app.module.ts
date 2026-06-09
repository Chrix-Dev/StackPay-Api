import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { KeysModule } from './keys/keys.module';
import { PaymentsModule } from './payments/payments.module';
import { CommonModule } from './common/common.module';
import { MessagingModule } from './messaging/messaging.module';
import { IdentityModule } from './identity/identity.module';



@Module({
  imports: [CommonModule, PrismaModule, AuthModule, KeysModule, PaymentsModule, MessagingModule, IdentityModule],
})
export class AppModule {}