import { IsString, IsUrl, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWebhookDto {
  @ApiProperty({ example: 'https://myapp.com/webhooks/stackpay' })
  @IsUrl()
  url!: string;

  @ApiProperty({ example: 'Payment notifications', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}