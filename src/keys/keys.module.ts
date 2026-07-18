import { Module } from '@nestjs/common';
import { KeysController } from './keys.controller';
import { KeysService } from './keys.service';
import { ApiKeyGuard } from './guards/api-key.guard';

@Module({
  controllers: [KeysController],
  providers: [KeysService, ApiKeyGuard],
  exports: [KeysService, ApiKeyGuard],
})
export class KeysModule {}