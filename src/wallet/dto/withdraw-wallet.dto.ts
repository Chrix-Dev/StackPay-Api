import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WithdrawWalletDto {
  @ApiProperty({ example: 2000 })
  @IsNumber()
  @Min(100)
  amount!: number;

  @ApiProperty({ example: '1234' })
  @IsString()
  pin!: string;

  @ApiProperty({ example: 'idem_key_123', required: false })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}