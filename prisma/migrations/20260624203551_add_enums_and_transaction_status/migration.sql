/*
  Warnings:

  - The `role` column on the `Developer` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `WalletTransaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "Developer" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'SUCCESS',
DROP COLUMN "type",
ADD COLUMN     "type" "TransactionType" NOT NULL;
