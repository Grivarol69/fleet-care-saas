-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WorkOrderStatus" ADD VALUE 'OPENING';
ALTER TYPE "WorkOrderStatus" ADD VALUE 'INSPECTING';
ALTER TYPE "WorkOrderStatus" ADD VALUE 'DRAFTING';

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "actualDeliveryDate" TIMESTAMP(3),
ADD COLUMN     "authorizedAt" TIMESTAMP(3),
ADD COLUMN     "closingSummary" TEXT,
ADD COLUMN     "openingBy" TEXT,
ADD COLUMN     "openingDate" TIMESTAMP(3),
ADD COLUMN     "openingDescription" TEXT;

-- CreateTable
CREATE TABLE "WorkOrderInspection" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "inspectedBy" TEXT NOT NULL,
    "vehicleGrounded" BOOLEAN NOT NULL DEFAULT false,
    "estimatedRepairHours" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WONotificationRecipient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WONotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkOrderInspection_tenantId_idx" ON "WorkOrderInspection"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrderInspection_workOrderId_key" ON "WorkOrderInspection"("workOrderId");

-- CreateIndex
CREATE INDEX "WONotificationRecipient_tenantId_idx" ON "WONotificationRecipient"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WONotificationRecipient_tenantId_userId_key" ON "WONotificationRecipient"("tenantId", "userId");

-- AddForeignKey
ALTER TABLE "WorkOrderInspection" ADD CONSTRAINT "WorkOrderInspection_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderInspection" ADD CONSTRAINT "WorkOrderInspection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WONotificationRecipient" ADD CONSTRAINT "WONotificationRecipient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WONotificationRecipient" ADD CONSTRAINT "WONotificationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
