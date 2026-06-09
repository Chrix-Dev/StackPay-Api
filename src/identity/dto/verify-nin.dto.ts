import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyNinDto {
  @ApiProperty({ example: '12345678901' })
  @IsString()
  @Length(11, 11)
  nin!: string;
}