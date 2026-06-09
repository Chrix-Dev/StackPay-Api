import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResolveBankDto {
  @ApiProperty({ example: '0001234567' })
  @IsString()
  @Length(10, 10)
  accountNumber!: string;

  @ApiProperty({ example: '058' })
  @IsString()
  bankCode!: string;
}