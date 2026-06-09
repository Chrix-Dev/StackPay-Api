import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKeyDto } from './dto/create-key.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class KeysService {
  constructor(private prisma: PrismaService) {}

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
}