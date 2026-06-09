import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { KeysModule } from './keys/keys.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [PrismaModule, AuthModule, KeysModule, PaymentsModule],
})
export class AppModule {}