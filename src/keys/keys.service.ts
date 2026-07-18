import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuditLogService } from '../common/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKeyDto } from './dto/create-key.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class KeysService {
  constructor(private prisma: PrismaService, private auditLog: AuditLogService,) {}

  private generateKey(): string {
    const random = crypto.randomBytes(32).toString('hex');
    return `sk_live_${random}`;
  }

  async createKey(developerId: string, dto: CreateKeyDto) {
    const rawKey = this.generateKey();
    const hashedKey = await bcrypt.hash(rawKey, 10);

    const key = await this.prisma.apiKey.create({
      data: {
        key: hashedKey,
        name: dto.name,
        developerId,
      },
    });

    return {
      message: 'API key created. Store this key safely — it will not be shown again.',
      key: {
        id: key.id,
        name: key.name,
        key: rawKey,
        createdAt: key.createdAt,
      },
    };
  }

  async listKeys(developerId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { developerId },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    return keys;
  }

  async revokeKey(developerId: string, keyId: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!apiKey) throw new NotFoundException('Key not found');

    if (apiKey.developerId !== developerId) {
      throw new ForbiddenException('This key does not belong to you');
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });
    await this.auditLog.log(developerId, 'API_KEY_REVOKED', { keyId });

    return { message: 'API key revoked' };
  }

  async validateKey(rawKey: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { isActive: true },
      include: { developer: true },
    });

    for (const key of keys) {
      const match = await bcrypt.compare(rawKey, key.key);
      if (match) return key;
    }

    return null;
  }

  async getUsage(developerId: string, keyId: string) {
  const apiKey = await this.prisma.apiKey.findUnique({
    where: { id: keyId },
  });

  if (!apiKey) throw new NotFoundException('API key not found');
  if (apiKey.developerId !== developerId) {
    throw new ForbiddenException('This key does not belong to you');
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalRequests, todayRequests, monthRequests, successRequests, lastLog] = await Promise.all([
    this.prisma.requestLog.count({ where: { apiKeyId: keyId } }),
    this.prisma.requestLog.count({ where: { apiKeyId: keyId, createdAt: { gte: startOfDay } } }),
    this.prisma.requestLog.count({ where: { apiKeyId: keyId, createdAt: { gte: startOfMonth } } }),
    this.prisma.requestLog.count({ where: { apiKeyId: keyId, statusCode: { gte: 200, lt: 300 } } }),
    this.prisma.requestLog.findFirst({ where: { apiKeyId: keyId }, orderBy: { createdAt: 'desc' } }),
  ]);

  const successRate = totalRequests > 0
    ? ((successRequests / totalRequests) * 100).toFixed(2)
    : '0.00';

  return {
    keyId,
    name: apiKey.name,
    isActive: apiKey.isActive,
    totalRequests,
    todayRequests,
    monthRequests,
    successRate: `${successRate}%`,
    lastUsedAt: lastLog?.createdAt ?? null,
  };
}
}