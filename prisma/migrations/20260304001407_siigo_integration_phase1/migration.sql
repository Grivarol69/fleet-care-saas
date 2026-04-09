-- CreateEnum
CREATE TYPE "SiigoSyncStatus" AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SiigoTaxClassification" AS ENUM ('TAXED', 'EXEMPT', 'EXCLUDED');

-- CreateEnum
CREATE TYPE "SiigoIdType" AS ENUM ('NIT', 'CC', 'CE', 'PASSPORT');

-- CreateEnum
CREATE TYPE "SiigoPersonType" AS ENUM ('PERSON', 'COMPANY');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "paymentMeanSiigo" INTEGER,
ADD COLUMN     "siigoError" TEXT,
ADD COLUMN     "siigoId" TEXT,
ADD COLUMN     "siigoSyncStatus" "SiigoSyncStatus",
ADD COLUMN     "siigoSyncedAt" TIMESTAMP(3),
ADD COLUMN     "siigoSyncedBy" TEXT;

-- AlterTable
ALTER TABLE "MasterPart" ADD COLUMN     "accountGroup" INTEGER,
ADD COLUMN     "siigoProductId" TEXT,
ADD COLUMN     "siigoSyncedAt" TIMESTAMP(3),
ADD COLUMN     "siigoTaxClassification" "SiigoTaxClassification",
ADD COLUMN     "siigoUnit" INTEGER;

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "cityCode" TEXT,
ADD COLUMN     "fiscalResponsibilities" TEXT[],
ADD COLUMN     "nit" TEXT,
ADD COLUMN     "siigoId" TEXT,
ADD COLUMN     "siigoIdType" "SiigoIdType",
ADD COLUMN     "siigoPersonType" "SiigoPersonType",
ADD COLUMN     "siigoSyncedAt" TIMESTAMP(3),
ADD COLUMN     "stateCode" TEXT,
ADD COLUMN     "vatResponsible" BOOLEAN;
