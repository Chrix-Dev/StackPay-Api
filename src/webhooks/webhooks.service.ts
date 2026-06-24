import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(
  private prisma: PrismaService,
  private http: HttpService,
  @InjectQueue('webhooks') private webhookQueue: Queue,

) {}

  private generateSecret(): string {
    return `whsec_${crypto.randomBytes(32).toString('hex')}`;
  }

  async createWebhook(developerId: string, dto: CreateWebhookDto) {
    const webhook = await this.prisma.webhook.create({
      data: {
        url: dto.url,
        description: dto.description,
        secret: this.generateSecret(),
        developerId,
      },
    });

    return {
      message: 'Webhook registered',
      webhook,
    };
  }

  async listWebhooks(developerId: string) {
    return this.prisma.webhook.findMany({
      where: { developerId },
    });
  }

  async deleteWebhook(developerId: string, webhookId: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) throw new NotFoundException('Webhook not found');
    if (webhook.developerId !== developerId) {
      throw new ForbiddenException('This webhook does not belong to you');
    }

    await this.prisma.webhook.delete({ where: { id: webhookId } });
    return { message: 'Webhook deleted' };
  }

  async getDeliveries(developerId: string, webhookId: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) throw new NotFoundException('Webhook not found');
    if (webhook.developerId !== developerId) {
      throw new ForbiddenException('This webhook does not belong to you');
    }

    return this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async testWebhook(developerId: string, webhookId: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) throw new NotFoundException('Webhook not found');
    if (webhook.developerId !== developerId) {
      throw new ForbiddenException('This webhook does not belong to you');
    }

    const payload = {
      event: 'test.event',
      data: { message: 'This is a test event from StackPay' },
      timestamp: new Date().toISOString(),
    };

    await this.deliverWebhook(webhook, payload);
    return { message: 'Test event sent' };
  }

  async deliverWebhook(webhook: any, payload: any, deliveryId?: string, attempts: number = 1) {
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    let statusCode: number | null = null;
    let success = false;

    try {
      const response = await firstValueFrom(
        this.http.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'x-stackpay-signature': signature,
          },
          timeout: 5000,
        }),
      );
      statusCode = response.status;
      success = true;
    } catch (error: any) {
      statusCode = error?.response?.status ?? null;
    }

    if (deliveryId) {
    await this.prisma.webhookDelivery.upsert({
      where: { id: deliveryId },
      create: {
        id: deliveryId,
        webhookId: webhook.id,
        event: payload.event,
        payload,
        statusCode,
        success,
        attempts,
      },
      update: {
        statusCode,
        success,
        attempts,
      },
    });
  } else {

    await this.prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        event: payload.event,
        payload,
        statusCode,
        success,
        attempts,
      },
    });
  }
  return success;
  }

  async emitEvent(developerId: string, event: string, data: any) {
  const webhooks = await this.prisma.webhook.findMany({
    where: { developerId, isActive: true },
  });

  const payload = {
    event,
    data,
    timestamp: new Date().toISOString(),
  };

  for (const webhook of webhooks) {
    const deliveryId = crypto.randomUUID();

    await this.webhookQueue.add(
      'deliver',
      { webhook, payload, deliveryId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );
  }
}}