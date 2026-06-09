import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';

@ApiTags('Webhooks')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @Get()
  listWebhooks(@Req() req: any) {
    return this.webhooksService.listWebhooks(req.user.id);
  }

  @Post()
  createWebhook(@Req() req: any, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.createWebhook(req.user.id, dto);
  }

  @Delete(':id')
  deleteWebhook(@Req() req: any, @Param('id') id: string) {
    return this.webhooksService.deleteWebhook(req.user.id, id);
  }

  @Get(':id/deliveries')
  getDeliveries(@Req() req: any, @Param('id') id: string) {
    return this.webhooksService.getDeliveries(req.user.id, id);
  }

  @Post(':id/test')
  testWebhook(@Req() req: any, @Param('id') id: string) {
    return this.webhooksService.testWebhook(req.user.id, id);
  }
}