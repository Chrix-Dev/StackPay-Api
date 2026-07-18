import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CombinedAuthGuard } from '../common/guards/combined-auth.guard';
import { MessagingService } from './messaging.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Messaging')
@ApiBearerAuth()
@UseGuards(CombinedAuthGuard)
@Controller('api/v1/messaging')
export class MessagingController {
  constructor(private messagingService: MessagingService) {}

  @Post('otp/send')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.messagingService.sendOtp(dto);
  }

  @Post('otp/verify')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.messagingService.verifyOtp(dto);
  }
}