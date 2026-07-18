-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

-- AlterTable
ALTER TABLE "Developer" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE';
