import { Module } from '@nestjs/common';
import { KeysModule } from '../keys/keys.module';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [KeysModule],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}