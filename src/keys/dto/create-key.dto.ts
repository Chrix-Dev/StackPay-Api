import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum KeyEnvironment {
  TEST = 'TEST',
  LIVE = 'LIVE',
}

export class CreateKeyDto {
  @ApiProperty({ example: 'Production' })
  @IsString()
  name!: string;

  @ApiProperty({ enum: KeyEnvironment, example: KeyEnvironment.TEST, required: false })
  @IsEnum(KeyEnvironment)
  @IsOptional()
  environment?: KeyEnvironment;
}