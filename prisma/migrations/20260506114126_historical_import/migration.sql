-- CreateEnum
CREATE TYPE "WorkOrderSource" AS ENUM ('OPERATIONAL', 'HISTORICAL_IMPORT');

-- AlterTable: WorkOrder — additive only
ALTER TABLE "WorkOrder" ADD COLUMN "source" "WorkOrderSource" NOT NULL DEFAULT 'OPERATIONAL';
ALTER TABLE "WorkOrder" ADD COLUMN "importBatchId" TEXT;

-- AlterTable: Invoice — additive only
ALTER TABLE "Invoice" ADD COLUMN "importBatchId" TEXT;
