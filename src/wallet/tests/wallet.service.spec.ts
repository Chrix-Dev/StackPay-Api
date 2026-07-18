import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../wallet.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/audit-log.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TransactionType, TransactionStatus } from '@prisma/client';

const mockPrisma = {
  wallet: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  walletTransaction: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockAuditLog = {
  log: jest.fn(),
};

describe('WalletService', () => {
  let walletService: WalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: mockAuditLog },
      ],
    }).compile();

    walletService = module.get<WalletService>(WalletService);
    jest.clearAllMocks();
  });

  describe('fundWallet', () => {
    it('should fund wallet successfully', async () => {
      const wallet = { id: 'w1', balance: 1000, isLocked: false, developerId: 'd1' };
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(null);

      const txResult = {
        id: 'tx1',
        type: TransactionType.CREDIT,
        status: TransactionStatus.SUCCESS,
        amount: 5000,
        balanceBefore: 1000,
        balanceAfter: 6000,
        reference: 'txn_123',
      };

      mockPrisma.$transaction.mockImplementation(async (cb: any) =>
        cb({
          wallet: { update: jest.fn().mockResolvedValue(wallet) },
          walletTransaction: { create: jest.fn().mockResolvedValue(txResult) },
        }),
      );

      const result = await walletService.fundWallet('d1', { amount: 5000 });
      expect(result.message).toBe('Wallet funded');
      expect(result.transaction.amount).toBe(5000);
    });

    it('should return existing transaction on duplicate idempotency key', async () => {
      const existingTx = { id: 'tx1', amount: 5000, reference: 'txn_123' };
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(existingTx);

      const result = await walletService.fundWallet('d1', {
        amount: 5000,
        idempotencyKey: 'idem_123',
      });

      expect(result.message).toBe('Duplicate request');
      expect(result.transaction).toEqual(existingTx);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw if wallet is locked', async () => {
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'w1',
        balance: 1000,
        isLocked: true,
        developerId: 'd1',
      });

      await expect(
        walletService.fundWallet('d1', { amount: 5000 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('transfer', () => {
    it('should throw if wallet has no PIN set', async () => {
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'w1',
        balance: 10000,
        isLocked: false,
        pin: null,
        developerId: 'd1',
      });

      await expect(
        walletService.transfer('d1', {
          recipientId: 'd2',
          amount: 1000,
          pin: '1234',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if PIN is wrong and increment failed attempts', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'w1',
        balance: 10000,
        isLocked: false,
        pin: hashed,
        failedPinAttempts: 0,
        developerId: 'd1',
      });
      mockPrisma.wallet.update.mockResolvedValue({});

      await expect(
        walletService.transfer('d1', {
          recipientId: 'd2',
          amount: 1000,
          pin: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failedPinAttempts: 1 }),
        }),
      );
    });

    it('should throw if insufficient balance', async () => {
      const hashed = await bcrypt.hash('1234', 10);
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'w1',
        balance: 500,
        isLocked: false,
        pin: hashed,
        failedPinAttempts: 0,
        developerId: 'd1',
      });
      mockPrisma.wallet.update.mockResolvedValue({});

      await expect(
        walletService.transfer('d1', {
          recipientId: 'd2',
          amount: 1000,
          pin: '1234',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should lock wallet after 3 failed PIN attempts', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      mockPrisma.walletTransaction.findUnique.mockResolvedValue(null);
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'w1',
        balance: 10000,
        isLocked: false,
        pin: hashed,
        failedPinAttempts: 2,
        developerId: 'd1',
      });
      mockPrisma.wallet.update.mockResolvedValue({});

      await expect(
        walletService.transfer('d1', {
          recipientId: 'd2',
          amount: 1000,
          pin: 'wrong',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isLocked: true }),
        }),
      );
    });
  });

  describe('setPin', () => {
    it('should hash and save the PIN', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({
        id: 'w1',
        developerId: 'd1',
      });
      mockPrisma.wallet.update.mockResolvedValue({});

      const result = await walletService.setPin('d1', '1234');
      expect(result.message).toBe('PIN set successfully');
      expect(mockPrisma.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pin: expect.any(String),
          }),
        }),
      );
    });
  });
});