-- CreateEnum
CREATE TYPE "KeyEnvironment" AS ENUM ('TEST', 'LIVE');

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "environment" "KeyEnvironment" NOT NULL DEFAULT 'TEST';
