import { IsEmail, IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitializePaymentDto {
  @ApiProperty({ example: 'chris@test.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: 'NGN', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 'Order #123', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}