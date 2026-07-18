import { Module } from '@nestjs/common';
import { KeysModule } from '../keys/keys.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';

@Module({
  imports: [KeysModule],
  controllers: [MessagingController],
  providers: [MessagingService],
})
export class MessagingModule {}