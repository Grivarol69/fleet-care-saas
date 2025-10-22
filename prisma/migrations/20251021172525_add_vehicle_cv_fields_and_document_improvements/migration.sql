-- CreateEnum
CREATE TYPE "public"."FuelType" AS ENUM ('DIESEL', 'GASOLINA', 'GAS', 'ELECTRICO', 'HIBRIDO');

-- CreateEnum
CREATE TYPE "public"."ServiceType" AS ENUM ('PUBLICO', 'PARTICULAR', 'OFICIAL');

-- AlterTable
ALTER TABLE "public"."Document" ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "entity" TEXT;

-- AlterTable
ALTER TABLE "public"."Vehicle" ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "fuelType" "public"."FuelType",
ADD COLUMN     "serviceType" "public"."ServiceType";

-- CreateIndex
CREATE INDEX "Document_documentNumber_idx" ON "public"."Document"("documentNumber");
