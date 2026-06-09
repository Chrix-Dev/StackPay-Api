import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKeyDto } from './dto/create-key.dto';
import * as crypto from 'crypto';

@Injectable()
export class KeysService {
  constructor(private prisma: PrismaService) {}

  private generateKey(): string {
    const random = crypto.randomBytes(32).toString('hex');
    return `sk_live_${random}`;
  }

  async createKey(developerId: string, dto: CreateKeyDto) {
    const key = await this.prisma.apiKey.create({
      data: {
        key: this.generateKey(),
        name: dto.name,
        developerId,
      },
    });

    return {
      message: 'API key created',
      key,
    };
  }

  async listKeys(developerId: string) {
    return this.prisma.apiKey.findMany({
      where: { developerId },
      select: {
        id: true,
        name: true,
        key: true,
        isActive: true,
        createdAt: true,
      },
    });
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
}