-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "AgingReport" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
