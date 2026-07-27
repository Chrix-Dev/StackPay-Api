import { IsEmail, IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';


export enum PaymentProviderEnum {
  PAYSTACK = 'paystack',
  FLUTTERWAVE = 'flutterwave',
}

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

  @ApiProperty({ enum: PaymentProviderEnum, example: PaymentProviderEnum.PAYSTACK, required: false })
  @IsEnum(PaymentProviderEnum)
  @IsOptional()
  provider?: PaymentProviderEnum;
}