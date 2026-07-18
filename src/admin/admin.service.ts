import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService, private auditLog: AuditLogService,) {}

  async getDashboard() {
    const totalDevelopers = await this.prisma.developer.count();
    const verifiedDevelopers = await this.prisma.developer.count({
      where: { isVerified: true },
    });
    const totalApiKeys = await this.prisma.apiKey.count({
      where: { isActive: true },
    });
    const totalTransactions = await this.prisma.walletTransaction.count();
    const totalWebhooks = await this.prisma.webhook.count();
    const totalWebhookDeliveries = await this.prisma.webhookDelivery.count();
    const failedDeliveries = await this.prisma.webhookDelivery.count({
      where: { success: false },
    });

    const transactionVolume = await this.prisma.walletTransaction.aggregate({
      _sum: { amount: true },
    });

    return {
      totalDevelopers,
      verifiedDevelopers,
      totalApiKeys,
      totalTransactions,
      transactionVolume: transactionVolume._sum.amount ?? 0,
      totalWebhooks,
      totalWebhookDeliveries,
      failedDeliveries,
    };
  }

  async listDevelopers() {
    return this.prisma.developer.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            apiKeys: true,
            requestLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDeveloper(developerId: string) {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        role: true,
        createdAt: true,
        apiKeys: {
          select: {
            id: true,
            name: true,
            isActive: true,
            createdAt: true,
          },
        },
        wallet: {
          select: {
            id: true,
            balance: true,
            isLocked: true,
            failedPinAttempts: true,
            lockReason: true,
          },
        },
        _count: {
          select: { requestLogs: true },
        },
      },
    });

    if (!developer) throw new NotFoundException('Developer not found');
    return developer;
  }

  async toggleDeveloper(developerId: string) {
    const developer = await this.prisma.developer.findUnique({
      where: { id: developerId },
    });

    if (!developer) throw new NotFoundException('Developer not found');

    await this.prisma.developer.update({
      where: { id: developerId },
      data: { isVerified: !developer.isVerified },
    });

    return {
      message: `Developer ${developer.isVerified ? 'deactivated' : 'activated'}`,
    };
  }

  async unlockWallet(developerId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { developerId },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');

    await this.prisma.wallet.update({
      where: { developerId },
      data: {
        isLocked: false,
        failedPinAttempts: 0,
        lockReason: null,
      },
    });
    await this.auditLog.log(developerId, 'ADMIN_WALLET_UNLOCK');
    return { message: 'Wallet unlocked successfully' };
  }

  async listTransactions() {
    return this.prisma.walletTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        wallet: {
          select: {
            developerId: true,
            developer: {
              select: { email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
  }

  async listWebhookDeliveries() {
    return this.prisma.webhookDelivery.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        webhook: {
          select: {
            url: true,
            developerId: true,
          },
        },
      },
    });
  }

  async upgradePlan(developerId: string, plan: string) {
  const developer = await this.prisma.developer.findUnique({
    where: { id: developerId },
  });

  if (!developer) throw new NotFoundException('Developer not found');

  await this.prisma.developer.update({
    where: { id: developerId },
    data: { plan: plan as any },
  });

  return { message: `Developer plan updated to ${plan}` };
}
}