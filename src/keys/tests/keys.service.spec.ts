import { Test, TestingModule } from '@nestjs/testing';
import { KeysService } from '../keys.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/audit-log.service';
import { RedisService } from '../../common/redis.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockPrisma = {
  apiKey: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  requestLog: {
    count: jest.fn(),
    findFirst: jest.fn(),
  },
};

const mockAuditLog = { log: jest.fn() };
const mockRedis = { getCount: jest.fn() };

describe('KeysService', () => {
  let keysService: KeysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeysService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    keysService = module.get<KeysService>(KeysService);
    jest.clearAllMocks();
  });

  describe('createKey', () => {
    it('should create a key and return raw key once', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({
        id: 'k1',
        name: 'Production',
        createdAt: new Date(),
      });

      const result = await keysService.createKey('d1', { name: 'Production' });

      expect(result.message).toContain('Store this key safely');
      expect(result.key.key).toMatch(/^sk_live_/);
      expect(mockPrisma.apiKey.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('revokeKey', () => {
    it('should throw if key not found', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);

      await expect(keysService.revokeKey('d1', 'k1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if key belongs to another developer', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'k1',
        developerId: 'd2',
      });

      await expect(keysService.revokeKey('d1', 'k1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should revoke key and log audit event', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'k1',
        developerId: 'd1',
      });
      mockPrisma.apiKey.update.mockResolvedValue({});

      const result = await keysService.revokeKey('d1', 'k1');

      expect(result.message).toBe('API key revoked');
      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'k1' },
        data: { isActive: false },
      });
      expect(mockAuditLog.log).toHaveBeenCalledWith('d1', 'API_KEY_REVOKED', { keyId: 'k1' });
    });
  });

  describe('validateKey', () => {
    it('should return null if no keys match', async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([]);

      const result = await keysService.validateKey('sk_live_invalid');
      expect(result).toBeNull();
    });

    it('should return key if hash matches', async () => {
      const rawKey = 'sk_live_testkey123';
      const hashedKey = await bcrypt.hash(rawKey, 10);

      mockPrisma.apiKey.findMany.mockResolvedValue([
        { id: 'k1', key: hashedKey, developer: { id: 'd1', email: 'test@test.com' } },
      ]);

      const result = await keysService.validateKey(rawKey);
      expect(result?.id).toBe('k1');
    });
  });

  describe('getQuota', () => {
    it('should throw if key not found', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null);

      await expect(keysService.getQuota('d1', 'k1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return quota info for FREE plan', async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'k1',
        developerId: 'd1',
        developer: { plan: 'FREE' },
      });
      mockRedis.getCount.mockResolvedValue(250);

      const result = await keysService.getQuota('d1', 'k1');

      expect(result.plan).toBe('FREE');
      expect(result.limit).toBe(1000);
      expect(result.used).toBe(250);
      expect(result.remaining).toBe(750);
    });
  });
});