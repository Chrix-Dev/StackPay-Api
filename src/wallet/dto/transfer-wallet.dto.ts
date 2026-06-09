import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferWalletDto {
  @ApiProperty({ example: 'developer-id-here' })
  @IsString()
  recipientId!: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(100)
  amount!: number;

  @ApiProperty({ example: 'idem_key_123', required: false })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  pin!: string;
}