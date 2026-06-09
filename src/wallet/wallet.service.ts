import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { TransferWalletDto } from './dto/transfer-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  private generateReference(): string {
    return `txn_${Date.now()}_${uuidv4().substring(0, 8)}`;
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
    const wallet = await this.getOrCreateWallet(developerId);
    return wallet;
  }

  async fundWallet(developerId: string, dto: FundWalletDto) {
    if (dto.idempotencyKey) {
      const existing = await this.prisma.walletTransaction.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return { message: 'Duplicate request', transaction: existing };
    }

    const wallet = await this.getOrCreateWallet(developerId);
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + dto.amount;

    const transaction = await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
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

    if (!senderWallet.pin) {
      throw new BadRequestException('Please set a transaction PIN first');
    }

    const pinValid = await bcrypt.compare(dto.pin, senderWallet.pin);
    if (!pinValid) throw new UnauthorizedException('Invalid PIN');

    if (senderWallet.balance < dto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const recipientWallet = await this.getOrCreateWallet(dto.recipientId);

    const transactions = await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: senderWallet.balance - dto.amount },
      });

      await tx.wallet.update({
        where: { id: recipientWallet.id },
        data: { balance: recipientWallet.balance + dto.amount },
      });

      const ref = this.generateReference();

      const debit = await tx.walletTransaction.create({
        data: {
          walletId: senderWallet.id,
          type: 'DEBIT',
          amount: dto.amount,
          balanceBefore: senderWallet.balance,
          balanceAfter: senderWallet.balance - dto.amount,
          reference: ref,
          idempotencyKey: dto.idempotencyKey,
          description: `Transfer to ${dto.recipientId}`,
        },
      });

      const credit = await tx.walletTransaction.create({
        data: {
          walletId: recipientWallet.id,
          type: 'CREDIT',
          amount: dto.amount,
          balanceBefore: recipientWallet.balance,
          balanceAfter: recipientWallet.balance + dto.amount,
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

    if (!wallet.pin) {
      throw new BadRequestException('Please set a transaction PIN first');
    }

    const pinValid = await bcrypt.compare(dto.pin, wallet.pin);
    if (!pinValid) throw new UnauthorizedException('Invalid PIN');

    if (wallet.balance < dto.amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - dto.amount;

    const transaction = await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
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
}