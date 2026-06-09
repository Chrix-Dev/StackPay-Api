/*
  Warnings:

  - You are about to alter the column `balance` on the `Wallet` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,2)`.
  - You are about to alter the column `amount` on the `WalletTransaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,2)`.
  - You are about to alter the column `balanceBefore` on the `WalletTransaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,2)`.
  - You are about to alter the column `balanceAfter` on the `WalletTransaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,2)`.

*/
-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "failedPinAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockReason" TEXT,
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(20,2);

-- AlterTable
ALTER TABLE "WalletTransaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,2),
ALTER COLUMN "balanceBefore" SET DATA TYPE DECIMAL(20,2),
ALTER COLUMN "balanceAfter" SET DATA TYPE DECIMAL(20,2);
