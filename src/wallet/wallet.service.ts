import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { TransferWalletDto } from './dto/transfer-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  private generateReference(): string {
    return `txn_${Date.now()}_${uuidv4().substring(0, 8)}`;
  }

  private async handleFailedPin(wallet: any) {
    const attempts = wallet.failedPinAttempts + 1;

    if (attempts >= 3) {
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          failedPinAttempts: attempts,
          isLocked: true,
          lockReason: 'Too many failed PIN attempts',
        },
      });
      throw new UnauthorizedException('Wallet locked due to too many failed PIN attempts. Contact support.');
    }

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { failedPinAttempts: attempts },
    });

    throw new UnauthorizedException(`Invalid PIN. ${3 - attempts} attempt(s) remaining.`);
  }

  async getOrCreateWallet(developerId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { developerId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { developerId },
      });
    }

    return wallet;
  }

  async getWallet(developerId: string) {
    return this.getOrCreateWallet(developerId);
  }

  async fundWallet(developerId: string, dto: FundWalletDto) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.walletTransaction.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return { message: 'Duplicate request', transaction: existing };
    }

    const wallet = await this.getOrCreateWallet(developerId);

    if (wallet.isLocked) {
      throw new BadRequestException('Wallet is locked. Contact support to unlock.');
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = Number(balanceBefore) + dto.amount;

    const transaction = await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.CREDIT,
          amount: dto.amount,
          balanceBefore,
          balanceAfter,
          reference: this.generateReference(),
          idempotencyKey: dto.idempotencyKey,
          description: 'Wallet funding',
        },
      });
    });

    return { message: 'Wallet funded', transaction };
  }

  async transfer(developerId: string, dto: TransferWalletDto) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.walletTransaction.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return { message: 'Duplicate request', transaction: existing };
    }

    const senderWallet = await this.getOrCreateWallet(developerId);

    if (senderWallet.isLocked) {
      throw new BadRequestException('Wallet is locked. Contact support to unlock.');
    }

    if (!senderWallet.pin) {
      throw new BadRequestException('Please set a transaction PIN first');
    }

    const pinValid = await bcrypt.compare(dto.pin, senderWallet.pin);
    if (!pinValid) await this.handleFailedPin(senderWallet);

    await this.prisma.wallet.update({
      where: { id: senderWallet.id },
      data: { failedPinAttempts: 0 },
    });

    if (Number(senderWallet.balance) < dto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const recipientWallet = await this.getOrCreateWallet(dto.recipientId);

    const transactions = await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: Number(senderWallet.balance) - dto.amount },
      });

      await tx.wallet.update({
        where: { id: recipientWallet.id },
        data: { balance: Number(recipientWallet.balance) + dto.amount },
      });

      const ref = this.generateReference();

      const debit = await tx.walletTransaction.create({
        data: {
          walletId: senderWallet.id,
          type: TransactionType.DEBIT,
          amount: dto.amount,
          balanceBefore: senderWallet.balance,
          balanceAfter: Number(senderWallet.balance) - dto.amount,
          reference: ref,
          idempotencyKey: dto.idempotencyKey,
          description: `Transfer to ${dto.recipientId}`,
        },
      });

      const credit = await tx.walletTransaction.create({
        data: {
          walletId: recipientWallet.id,
          type: TransactionType.CREDIT,
          amount: dto.amount,
          balanceBefore: recipientWallet.balance,
          balanceAfter: Number(recipientWallet.balance) + dto.amount,
          reference: `${ref}_cr`,
          description: `Transfer from ${developerId}`,
        },
      });

      return { debit, credit };
    });

    return { message: 'Transfer successful', transactions };
  }

  async withdraw(developerId: string, dto: WithdrawWalletDto) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.walletTransaction.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return { message: 'Duplicate request', transaction: existing };
    }

    const wallet = await this.getOrCreateWallet(developerId);

    if (wallet.isLocked) {
      throw new BadRequestException('Wallet is locked. Contact support to unlock.');
    }

    if (!wallet.pin) {
      throw new BadRequestException('Please set a transaction PIN first');
    }

    const pinValid = await bcrypt.compare(dto.pin, wallet.pin);
    if (!pinValid) await this.handleFailedPin(wallet);

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { failedPinAttempts: 0 },
    });

    if (Number(wallet.balance) < dto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = Number(balanceBefore) - dto.amount;

    const transaction = await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.DEBIT,
          amount: dto.amount,
          balanceBefore,
          balanceAfter,
          reference: this.generateReference(),
          idempotencyKey: dto.idempotencyKey,
          description: 'Wallet withdrawal',
        },
      });
    });

    return { message: 'Withdrawal successful', transaction };
  }

  async setPin(developerId: string, pin: string) {
    const wallet = await this.getOrCreateWallet(developerId);
    const hashed = await bcrypt.hash(pin, 10);

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { pin: hashed },
    });

    return { message: 'PIN set successfully' };
  }

  async changePin(developerId: string, oldPin: string, newPin: string) {
    const wallet = await this.getOrCreateWallet(developerId);

    if (!wallet.pin) {
      throw new BadRequestException('No PIN set. Use /wallet/pin to set one first');
    }

    const pinValid = await bcrypt.compare(oldPin, wallet.pin);
    if (!pinValid) throw new UnauthorizedException('Invalid current PIN');

    const hashed = await bcrypt.hash(newPin, 10);

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { pin: hashed },
    });

    return { message: 'PIN changed successfully' };
  }

  async unlockWallet(developerId: string) {
    const wallet = await this.getOrCreateWallet(developerId);

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        isLocked: false,
        failedPinAttempts: 0,
        lockReason: null,
      },
    });

    return { message: 'Wallet unlocked successfully' };
  }

  async getTransactions(developerId: string, query: QueryTransactionsDto) {
  const wallet = await this.getOrCreateWallet(developerId);

  const page = query.page ?? 1;
  const limit = query.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: any = { walletId: wallet.id };

  if (query.type) {
    where.type = query.type;
  }

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }

  const [transactions, total] = await Promise.all([
    this.prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    this.prisma.walletTransaction.count({ where }),
  ]);

  return {
    data: transactions,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async getTransaction(developerId: string, transactionId: string) {
  const wallet = await this.getOrCreateWallet(developerId);

  const transaction = await this.prisma.walletTransaction.findFirst({
    where: { id: transactionId, walletId: wallet.id },
  });

  if (!transaction) throw new NotFoundException('Transaction not found');

  return transaction;
}
}