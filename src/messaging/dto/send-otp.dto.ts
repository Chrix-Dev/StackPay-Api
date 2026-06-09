import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum OtpChannel {
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
}

export class SendOtpDto {
  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  recipient!: string;

  @ApiProperty({ enum: OtpChannel, example: OtpChannel.SMS })
  @IsEnum(OtpChannel)
  channel!: OtpChannel;
}