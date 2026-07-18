import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { KeysModule } from '../keys/keys.module';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

@Module({
  imports: [HttpModule, KeysModule],
  controllers: [IdentityController],
  providers: [IdentityService],
})
export class IdentityModule {}