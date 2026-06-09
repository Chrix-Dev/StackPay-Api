import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Messaging')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/messaging')
export class MessagingController {
  constructor(private messagingService: MessagingService) {}

  @Post('otp/send')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.messagingService.sendOtp(dto);
  }

  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.messagingService.verifyOtp(dto);
  }
}