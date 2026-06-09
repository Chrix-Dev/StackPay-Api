import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePinDto {
  @ApiProperty({ example: '1234' })
  @IsString()
  @Length(4, 4)
  oldPin!: string;

  @ApiProperty({ example: '5678' })
  @IsString()
  @Length(4, 4)
  newPin!: string;
}