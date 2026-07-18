import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KeysModule } from '../keys/keys.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [HttpModule, KeysModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}