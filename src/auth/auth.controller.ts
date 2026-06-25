import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
   @Throttle({ default: { ttl: 60000, limit: 5 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
   @Throttle({ default: { ttl: 60000, limit: 5 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
  
  @Post('refresh')
refresh(@Body() dto: RefreshTokenDto) {
  return this.authService.refresh(dto.refreshToken);
}

@Post('logout')
logout(@Body() dto: RefreshTokenDto) {
  return this.authService.logout(dto.refreshToken);
}

  @Post('verify-email/:token')
  verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

 @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  getMe(@Req() req: any) {
    return this.authService.getMe(req.user.id);
  }
}