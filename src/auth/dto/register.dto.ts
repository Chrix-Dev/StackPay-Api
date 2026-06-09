import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Chris' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Umunna' })
  @IsString()
  lastName!: string;

  @ApiProperty({ example: 'chris@test.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password!: string;
}