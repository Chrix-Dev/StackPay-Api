import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(developerId: string) {
    const totalRequests = await this.prisma.requestLog.count({
      where: { developerId },
    });

    const successRequests = await this.prisma.requestLog.count({
      where: { developerId, statusCode: { gte: 200, lt: 300 } },
    });

    const errorRequests = await this.prisma.requestLog.count({
      where: { developerId, statusCode: { gte: 400 } },
    });

    const totalKeys = await this.prisma.apiKey.count({
      where: { developerId, isActive: true },
    });

    const totalWebhooks = await this.prisma.webhook.count({
      where: { developerId, isActive: true },
    });

    const successRate = totalRequests > 0
      ? ((successRequests / totalRequests) * 100).toFixed(2)
      : '0.00';

    return {
      totalRequests,
      successRequests,
      errorRequests,
      successRate: `${successRate}%`,
      totalKeys,
      totalWebhooks,
    };
  }

  async getLogs(developerId: string) {
    return this.prisma.requestLog.findMany({
      where: { developerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getLog(developerId: string, logId: string) {
    return this.prisma.requestLog.findFirst({
      where: { id: logId, developerId },
    });
  }
}