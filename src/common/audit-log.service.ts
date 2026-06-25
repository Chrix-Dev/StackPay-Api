import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(developerId: string, action: string, metadata?: Record<string, any>) {
    await this.prisma.auditLog.create({
      data: {
        developerId,
        action,
        metadata: metadata ?? undefined,
      },
    });
  }

  async getLogs(developerId: string) {
    return this.prisma.auditLog.findMany({
      where: { developerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}