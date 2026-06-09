import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

@Module({
  imports: [HttpModule],
  controllers: [IdentityController],
  providers: [IdentityService],
})
export class IdentityModule {}