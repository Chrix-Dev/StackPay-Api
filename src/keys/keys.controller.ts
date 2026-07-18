import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { KeysService } from './keys.service';
import { CreateKeyDto } from './dto/create-key.dto';

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/keys')
export class KeysController {
  constructor(private keysService: KeysService) {}

  @Get()
  listKeys(@Req() req: any) {
    return this.keysService.listKeys(req.user.id);
  }

  @Post()
  createKey(@Req() req: any, @Body() dto: CreateKeyDto) {
    return this.keysService.createKey(req.user.id, dto);
  }

  @Patch(':id/revoke')
  revokeKey(@Req() req: any, @Param('id') id: string) {
    return this.keysService.revokeKey(req.user.id, id);
  }

  @Get(':id/usage')
  getUsage(@Req() req: any, @Param('id') id: string) {
    return this.keysService.getUsage(req.user.id, id);
}
  @Get(':id/quota')
  getQuota(@Req() req: any, @Param('id') id: string) {
    return this.keysService.getQuota(req.user.id, id);
}
}