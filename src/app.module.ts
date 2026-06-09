import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { KeysModule } from './keys/keys.module';

@Module({
  imports: [PrismaModule, AuthModule, KeysModule],
})
export class AppModule {}