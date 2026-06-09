import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateKeyDto {
  @ApiProperty({ example: 'Production' })
  @IsString()
  name!: string;
}