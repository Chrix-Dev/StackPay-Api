import { Injectable, BadRequestException } from '@nestjs/common';
import { RedisService } from '../common/redis.service';
import { SendOtpDto, OtpChannel } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class MessagingService {
  constructor(private redis: RedisService) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(dto: SendOtpDto) {
    const otp = this.generateOtp();
    const key = `otp:${dto.recipient}`;

    await this.redis.set(key, otp, 300);

    switch (dto.channel) {
      case OtpChannel.SMS:
        console.log(`[TERMII SMS] Sending OTP ${otp} to ${dto.recipient}`);
        break;
      case OtpChannel.WHATSAPP:
        console.log(`[TERMII WHATSAPP] Sending OTP ${otp} to ${dto.recipient}`);
        break;
      case OtpChannel.EMAIL:
        console.log(`[SENDGRID] Sending OTP ${otp} to ${dto.recipient}`);
        break;
    }

    return {
      message: `OTP sent via ${dto.channel}`,
      ...(process.env.NODE_ENV !== 'production' && { otp }),
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const key = `otp:${dto.recipient}`;
    const stored = await this.redis.get(key);

    if (!stored) {
      throw new BadRequestException('OTP expired or not found');
    }

    if (stored !== dto.code) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.redis.del(key);

    return { message: 'OTP verified successfully' };
  }
}