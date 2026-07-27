import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KeysModule } from '../keys/keys.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaystackProvider } from './providers/paystack.provider';
import { FlutterwaveProvider } from './providers/flutterwave.provider';

@Module({
  imports: [HttpModule, KeysModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaystackProvider, FlutterwaveProvider],
})
export class PaymentsModule {}