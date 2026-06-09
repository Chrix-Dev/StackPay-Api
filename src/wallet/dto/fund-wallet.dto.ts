import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FundWalletDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(100)
  amount!: number;

  @ApiProperty({ example: 'idem_key_123', required: false })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}