import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  recipient!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  code!: string;
}