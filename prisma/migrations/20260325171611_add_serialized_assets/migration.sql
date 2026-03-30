-- CreateEnum
CREATE TYPE "SerializedItemType" AS ENUM ('TIRE', 'EXTINGUISHER', 'OTHER');

-- CreateEnum
CREATE TYPE "SerializedItemStatus" AS ENUM ('IN_STOCK', 'INSTALLED', 'RETIRED');

-- CreateEnum
CREATE TYPE "SerializedItemAlertStatus" AS ENUM ('ACTIVE', 'RESOLVED');

-- AlterEnum
ALTER TYPE "AlertType" ADD VALUE 'TIRE_WEAR';

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "axleConfig" TEXT DEFAULT 'STANDARD_4';

-- CreateTable
CREATE TABLE "SerializedItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceItemId" TEXT,
    "serialNumber" TEXT NOT NULL,
    "batchNumber" TEXT,
    "type" "SerializedItemType" NOT NULL,
    "status" "SerializedItemStatus" NOT NULL DEFAULT 'IN_STOCK',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiredAt" TIMESTAMP(3),
    "specs" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SerializedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SerializedItemEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serializedItemId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performedById" TEXT NOT NULL,
    "vehicleKm" INTEGER,
    "specs" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SerializedItemEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleItemAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "serializedItemId" TEXT NOT NULL,
    "position" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleItemAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SerializedItemAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serializedItemId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "alertType" TEXT NOT NULL,
    "status" "SerializedItemAlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "SerializedItemAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SerializedItem_tenantId_idx" ON "SerializedItem"("tenantId");

-- CreateIndex
CREATE INDEX "SerializedItem_type_idx" ON "SerializedItem"("type");

-- CreateIndex
CREATE INDEX "SerializedItem_status_idx" ON "SerializedItem"("status");

-- CreateIndex
CREATE INDEX "SerializedItem_batchNumber_idx" ON "SerializedItem"("batchNumber");

-- CreateIndex
CREATE INDEX "SerializedItem_invoiceItemId_idx" ON "SerializedItem"("invoiceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "SerializedItem_tenantId_serialNumber_key" ON "SerializedItem"("tenantId", "serialNumber");

-- CreateIndex
CREATE INDEX "SerializedItemEvent_tenantId_idx" ON "SerializedItemEvent"("tenantId");

-- CreateIndex
CREATE INDEX "SerializedItemEvent_serializedItemId_idx" ON "SerializedItemEvent"("serializedItemId");

-- CreateIndex
CREATE INDEX "SerializedItemEvent_performedAt_idx" ON "SerializedItemEvent"("performedAt");

-- CreateIndex
CREATE INDEX "VehicleItemAssignment_tenantId_idx" ON "VehicleItemAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleItemAssignment_vehicleId_idx" ON "VehicleItemAssignment"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleItemAssignment_serializedItemId_idx" ON "VehicleItemAssignment"("serializedItemId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleItemAssignment_serializedItemId_removedAt_key" ON "VehicleItemAssignment"("serializedItemId", "removedAt");

-- CreateIndex
CREATE INDEX "SerializedItemAlert_tenantId_status_idx" ON "SerializedItemAlert"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SerializedItemAlert_serializedItemId_status_idx" ON "SerializedItemAlert"("serializedItemId", "status");

-- CreateIndex
CREATE INDEX "SerializedItemAlert_tenantId_vehicleId_status_idx" ON "SerializedItemAlert"("tenantId", "vehicleId", "status");

-- AddForeignKey
ALTER TABLE "SerializedItem" ADD CONSTRAINT "SerializedItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerializedItem" ADD CONSTRAINT "SerializedItem_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "InvoiceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerializedItemEvent" ADD CONSTRAINT "SerializedItemEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerializedItemEvent" ADD CONSTRAINT "SerializedItemEvent_serializedItemId_fkey" FOREIGN KEY ("serializedItemId") REFERENCES "SerializedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerializedItemEvent" ADD CONSTRAINT "SerializedItemEvent_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleItemAssignment" ADD CONSTRAINT "VehicleItemAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleItemAssignment" ADD CONSTRAINT "VehicleItemAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleItemAssignment" ADD CONSTRAINT "VehicleItemAssignment_serializedItemId_fkey" FOREIGN KEY ("serializedItemId") REFERENCES "SerializedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerializedItemAlert" ADD CONSTRAINT "SerializedItemAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerializedItemAlert" ADD CONSTRAINT "SerializedItemAlert_serializedItemId_fkey" FOREIGN KEY ("serializedItemId") REFERENCES "SerializedItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerializedItemAlert" ADD CONSTRAINT "SerializedItemAlert_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SerializedItemAlert" ADD CONSTRAINT "SerializedItemAlert_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
