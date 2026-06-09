import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyBvnDto {
  @ApiProperty({ example: '12345678901' })
  @IsString()
  @Length(11, 11)
  bvn!: string;
}