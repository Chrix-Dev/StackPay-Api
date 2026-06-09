import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { WebhooksService } from './webhooks.service';

@Processor('webhooks')
export class WebhookProcessor {
  constructor(private webhooksService: WebhooksService) {}

  @Process('deliver')
  async handleDelivery(job: Job) {
    const { webhook, payload } = job.data;
    await this.webhooksService.deliverWebhook(webhook, payload);
  }
}