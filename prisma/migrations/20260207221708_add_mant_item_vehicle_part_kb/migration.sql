-- CreateEnum
CREATE TYPE "PurchaseOrderType" AS ENUM ('SERVICES', 'PARTS');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIAL', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "POItemStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('EXTERNAL', 'INTERNAL', 'MIXED');

-- CreateEnum
CREATE TYPE "ItemSource" AS ENUM ('EXTERNAL', 'INTERNAL_STOCK', 'INTERNAL_PURCHASE');

-- CreateEnum
CREATE TYPE "MantItemRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "purchaseOrderId" TEXT;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "workType" "WorkType" NOT NULL DEFAULT 'EXTERNAL';

-- AlterTable
ALTER TABLE "WorkOrderItem" ADD COLUMN     "itemSource" "ItemSource" NOT NULL DEFAULT 'EXTERNAL',
ADD COLUMN     "masterPartId" TEXT;

-- CreateTable
CREATE TABLE "MantItemRequest" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "suggestedName" TEXT NOT NULL,
    "description" TEXT,
    "mantType" "MantType" NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "type" "ItemType" NOT NULL DEFAULT 'ACTION',
    "justification" TEXT,
    "similarItems" JSONB,
    "status" "MantItemRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdMantItemId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MantItemRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MantItemVehiclePart" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "mantItemId" INTEGER NOT NULL,
    "vehicleBrandId" INTEGER NOT NULL,
    "vehicleLineId" INTEGER NOT NULL,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "masterPartId" TEXT NOT NULL,
    "alternativePartNumbers" TEXT,
    "notes" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MantItemVehiclePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "type" "PurchaseOrderType" NOT NULL,
    "providerId" INTEGER NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "workOrderItemId" INTEGER,
    "mantItemId" INTEGER,
    "masterPartId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "status" "POItemStatus" NOT NULL DEFAULT 'PENDING',
    "receivedQty" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "invoiceItemId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MantItemRequest_tenantId_idx" ON "MantItemRequest"("tenantId");

-- CreateIndex
CREATE INDEX "MantItemRequest_status_idx" ON "MantItemRequest"("status");

-- CreateIndex
CREATE INDEX "MantItemRequest_requestedBy_idx" ON "MantItemRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "MantItemVehiclePart_mantItemId_idx" ON "MantItemVehiclePart"("mantItemId");

-- CreateIndex
CREATE INDEX "MantItemVehiclePart_vehicleBrandId_vehicleLineId_idx" ON "MantItemVehiclePart"("vehicleBrandId", "vehicleLineId");

-- CreateIndex
CREATE INDEX "MantItemVehiclePart_masterPartId_idx" ON "MantItemVehiclePart"("masterPartId");

-- CreateIndex
CREATE INDEX "MantItemVehiclePart_isGlobal_idx" ON "MantItemVehiclePart"("isGlobal");

-- CreateIndex
CREATE UNIQUE INDEX "MantItemVehiclePart_mantItemId_vehicleBrandId_vehicleLineId_key" ON "MantItemVehiclePart"("mantItemId", "vehicleBrandId", "vehicleLineId", "yearFrom", "masterPartId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_idx" ON "PurchaseOrder"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_workOrderId_idx" ON "PurchaseOrder"("workOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_providerId_idx" ON "PurchaseOrder"("providerId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_tenantId_orderNumber_key" ON "PurchaseOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_workOrderItemId_idx" ON "PurchaseOrderItem"("workOrderItemId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_mantItemId_idx" ON "PurchaseOrderItem"("mantItemId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_masterPartId_idx" ON "PurchaseOrderItem"("masterPartId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_status_idx" ON "PurchaseOrderItem"("status");

-- CreateIndex
CREATE INDEX "Invoice_purchaseOrderId_idx" ON "Invoice"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "MantItemRequest" ADD CONSTRAINT "MantItemRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemRequest" ADD CONSTRAINT "MantItemRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MantCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemVehiclePart" ADD CONSTRAINT "MantItemVehiclePart_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "MantItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemVehiclePart" ADD CONSTRAINT "MantItemVehiclePart_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "VehicleBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemVehiclePart" ADD CONSTRAINT "MantItemVehiclePart_vehicleLineId_fkey" FOREIGN KEY ("vehicleLineId") REFERENCES "VehicleLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemVehiclePart" ADD CONSTRAINT "MantItemVehiclePart_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "MasterPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemVehiclePart" ADD CONSTRAINT "MantItemVehiclePart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "MasterPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "WorkOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "MantItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "MasterPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
