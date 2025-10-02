/*
  Warnings:

  - Added the required column `requestedBy` to the `WorkOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `WorkOrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchasedBy` to the `WorkOrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `supplier` to the `WorkOrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalCost` to the `WorkOrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitPrice` to the `WorkOrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ExpenseType" AS ENUM ('PARTS', 'LABOR', 'TRANSPORT', 'TOOLS', 'MATERIALS', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('CREATED', 'APPROVED', 'REJECTED', 'MODIFIED', 'PAID', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."ScheduleStatus" AS ENUM ('SCHEDULED', 'DUE', 'OVERDUE', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."MantItem" ADD COLUMN     "estimatedCost" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "public"."VehicleMantPlanItem" ADD COLUMN     "vehicleMantPackageId" INTEGER;

-- AlterTable
ALTER TABLE "public"."WorkOrder" ADD COLUMN     "actualCost" DECIMAL(10,2),
ADD COLUMN     "authorizedBy" TEXT,
ADD COLUMN     "budgetCode" TEXT,
ADD COLUMN     "costCenter" TEXT,
ADD COLUMN     "estimatedCost" DECIMAL(10,2),
ADD COLUMN     "isPackageWork" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "packageName" TEXT,
ADD COLUMN     "requestedBy" TEXT NOT NULL,
ADD COLUMN     "scheduledPackageId" INTEGER;

-- AlterTable
ALTER TABLE "public"."WorkOrderItem" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "partNumber" TEXT,
ADD COLUMN     "purchasedBy" TEXT NOT NULL,
ADD COLUMN     "receiptUrl" TEXT,
ADD COLUMN     "supplier" TEXT NOT NULL,
ADD COLUMN     "totalCost" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "unitPrice" DECIMAL(10,2) NOT NULL;

-- CreateTable
CREATE TABLE "public"."VehicleMantPackage" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleMantPlanId" INTEGER NOT NULL,
    "packageName" TEXT NOT NULL,
    "packageDescription" TEXT,
    "originalTriggerKm" INTEGER NOT NULL,
    "scheduledExecutionKm" INTEGER NOT NULL,
    "actualExecutionKm" INTEGER,
    "deviationKm" INTEGER,
    "onTimeExecution" BOOLEAN,
    "estimatedCost" DECIMAL(10,2),
    "actualCost" DECIMAL(10,2),
    "status" "public"."WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "executedAt" TIMESTAMP(3),
    "workOrderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMantPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaintenanceTemplate" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vehicleBrandId" INTEGER NOT NULL,
    "vehicleLineId" INTEGER NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaintenancePackage" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "triggerKm" INTEGER NOT NULL,
    "description" TEXT,
    "estimatedCost" DECIMAL(10,2),
    "estimatedTime" DECIMAL(5,2),
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "packageType" "public"."MantType" NOT NULL DEFAULT 'PREVENTIVE',
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenancePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PackageItem" (
    "id" SERIAL NOT NULL,
    "packageId" INTEGER NOT NULL,
    "mantItemId" INTEGER NOT NULL,
    "triggerKm" INTEGER NOT NULL,
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "estimatedCost" DECIMAL(10,2),
    "estimatedTime" DECIMAL(5,2),
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleMaintenanceMetrics" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "generatedFrom" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "assignmentKm" INTEGER NOT NULL,
    "nextMaintenanceKm" INTEGER NOT NULL,
    "nextMaintenanceDesc" TEXT,
    "totalMaintenances" INTEGER NOT NULL DEFAULT 0,
    "avgDeviationKm" INTEGER NOT NULL DEFAULT 0,
    "maintenanceScore" INTEGER NOT NULL DEFAULT 100,
    "lastScoreUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alertOffsetKm" INTEGER NOT NULL DEFAULT 1000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMaintenanceMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScheduledPackage" (
    "id" SERIAL NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "packageName" TEXT NOT NULL,
    "packageDescription" TEXT,
    "idealExecutionKm" INTEGER NOT NULL,
    "scheduledExecutionKm" INTEGER NOT NULL,
    "actualExecutionKm" INTEGER,
    "deviationKm" INTEGER,
    "onTimeExecution" BOOLEAN,
    "estimatedCost" DECIMAL(10,2),
    "actualCost" DECIMAL(10,2),
    "status" "public"."ScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "workOrderId" INTEGER,
    "executedAt" TIMESTAMP(3),
    "alertLevel" "public"."AlertLevel" NOT NULL DEFAULT 'LOW',
    "adjustedBy" TEXT,
    "adjustmentReason" TEXT,
    "lastAlertSent" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkOrderExpense" (
    "id" TEXT NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "expenseType" "public"."ExpenseType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "vendor" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "receiptUrl" TEXT,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkOrderApproval" (
    "id" TEXT NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "approverLevel" INTEGER NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExpenseAuditLog" (
    "id" TEXT NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "action" "public"."AuditAction" NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleMantProgram" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "generatedFrom" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "assignmentKm" INTEGER NOT NULL,
    "nextMaintenanceKm" INTEGER,
    "nextMaintenanceDesc" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMantProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleProgramPackage" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "programId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerKm" INTEGER,
    "packageType" "public"."MantType" NOT NULL DEFAULT 'PREVENTIVE',
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "estimatedCost" DECIMAL(10,2),
    "estimatedTime" DECIMAL(5,2),
    "actualCost" DECIMAL(10,2),
    "actualTime" DECIMAL(5,2),
    "status" "public"."WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledKm" INTEGER,
    "executedKm" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "technicianId" INTEGER,
    "providerId" INTEGER,
    "workOrderId" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleProgramPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleProgramItem" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "packageId" INTEGER NOT NULL,
    "mantItemId" INTEGER NOT NULL,
    "mantType" "public"."MantType" NOT NULL,
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "order" INTEGER NOT NULL DEFAULT 0,
    "scheduledKm" INTEGER,
    "detectedKm" INTEGER,
    "executedKm" INTEGER,
    "scheduledDate" TIMESTAMP(3),
    "detectedDate" TIMESTAMP(3),
    "executedDate" TIMESTAMP(3),
    "estimatedCost" DECIMAL(10,2),
    "estimatedTime" DECIMAL(5,2),
    "actualCost" DECIMAL(10,2),
    "actualTime" DECIMAL(5,2),
    "technicianId" INTEGER,
    "providerId" INTEGER,
    "status" "public"."WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "urgency" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "description" TEXT,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleProgramItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleMantPackage_tenantId_idx" ON "public"."VehicleMantPackage"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleMantPackage_vehicleMantPlanId_idx" ON "public"."VehicleMantPackage"("vehicleMantPlanId");

-- CreateIndex
CREATE INDEX "VehicleMantPackage_scheduledExecutionKm_idx" ON "public"."VehicleMantPackage"("scheduledExecutionKm");

-- CreateIndex
CREATE INDEX "VehicleMantPackage_status_idx" ON "public"."VehicleMantPackage"("status");

-- CreateIndex
CREATE INDEX "VehicleMantPackage_onTimeExecution_idx" ON "public"."VehicleMantPackage"("onTimeExecution");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleMantPackage_vehicleMantPlanId_originalTriggerKm_key" ON "public"."VehicleMantPackage"("vehicleMantPlanId", "originalTriggerKm");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_tenantId_idx" ON "public"."MaintenanceTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_vehicleBrandId_idx" ON "public"."MaintenanceTemplate"("vehicleBrandId");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_vehicleLineId_idx" ON "public"."MaintenanceTemplate"("vehicleLineId");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_isDefault_idx" ON "public"."MaintenanceTemplate"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceTemplate_tenantId_name_key" ON "public"."MaintenanceTemplate"("tenantId", "name");

-- CreateIndex
CREATE INDEX "MaintenancePackage_templateId_idx" ON "public"."MaintenancePackage"("templateId");

-- CreateIndex
CREATE INDEX "MaintenancePackage_triggerKm_idx" ON "public"."MaintenancePackage"("triggerKm");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenancePackage_templateId_triggerKm_key" ON "public"."MaintenancePackage"("templateId", "triggerKm");

-- CreateIndex
CREATE INDEX "PackageItem_packageId_idx" ON "public"."PackageItem"("packageId");

-- CreateIndex
CREATE INDEX "PackageItem_mantItemId_idx" ON "public"."PackageItem"("mantItemId");

-- CreateIndex
CREATE INDEX "PackageItem_triggerKm_idx" ON "public"."PackageItem"("triggerKm");

-- CreateIndex
CREATE INDEX "PackageItem_priority_idx" ON "public"."PackageItem"("priority");

-- CreateIndex
CREATE INDEX "PackageItem_status_idx" ON "public"."PackageItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PackageItem_packageId_mantItemId_key" ON "public"."PackageItem"("packageId", "mantItemId");

-- CreateIndex
CREATE INDEX "VehicleMaintenanceMetrics_tenantId_idx" ON "public"."VehicleMaintenanceMetrics"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleMaintenanceMetrics_maintenanceScore_idx" ON "public"."VehicleMaintenanceMetrics"("maintenanceScore");

-- CreateIndex
CREATE INDEX "VehicleMaintenanceMetrics_avgDeviationKm_idx" ON "public"."VehicleMaintenanceMetrics"("avgDeviationKm");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleMaintenanceMetrics_vehicleId_key" ON "public"."VehicleMaintenanceMetrics"("vehicleId");

-- CreateIndex
CREATE INDEX "ScheduledPackage_scheduleId_idx" ON "public"."ScheduledPackage"("scheduleId");

-- CreateIndex
CREATE INDEX "ScheduledPackage_scheduledExecutionKm_idx" ON "public"."ScheduledPackage"("scheduledExecutionKm");

-- CreateIndex
CREATE INDEX "ScheduledPackage_alertLevel_idx" ON "public"."ScheduledPackage"("alertLevel");

-- CreateIndex
CREATE INDEX "ScheduledPackage_deviationKm_idx" ON "public"."ScheduledPackage"("deviationKm");

-- CreateIndex
CREATE INDEX "ScheduledPackage_onTimeExecution_idx" ON "public"."ScheduledPackage"("onTimeExecution");

-- CreateIndex
CREATE INDEX "WorkOrderExpense_workOrderId_idx" ON "public"."WorkOrderExpense"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderExpense_expenseType_idx" ON "public"."WorkOrderExpense"("expenseType");

-- CreateIndex
CREATE INDEX "WorkOrderExpense_vendor_idx" ON "public"."WorkOrderExpense"("vendor");

-- CreateIndex
CREATE INDEX "WorkOrderExpense_recordedBy_idx" ON "public"."WorkOrderExpense"("recordedBy");

-- CreateIndex
CREATE INDEX "WorkOrderApproval_workOrderId_idx" ON "public"."WorkOrderApproval"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderApproval_approverLevel_idx" ON "public"."WorkOrderApproval"("approverLevel");

-- CreateIndex
CREATE INDEX "WorkOrderApproval_approvedBy_idx" ON "public"."WorkOrderApproval"("approvedBy");

-- CreateIndex
CREATE INDEX "WorkOrderApproval_status_idx" ON "public"."WorkOrderApproval"("status");

-- CreateIndex
CREATE INDEX "ExpenseAuditLog_workOrderId_idx" ON "public"."ExpenseAuditLog"("workOrderId");

-- CreateIndex
CREATE INDEX "ExpenseAuditLog_performedBy_idx" ON "public"."ExpenseAuditLog"("performedBy");

-- CreateIndex
CREATE INDEX "ExpenseAuditLog_performedAt_idx" ON "public"."ExpenseAuditLog"("performedAt");

-- CreateIndex
CREATE INDEX "VehicleMantProgram_tenantId_idx" ON "public"."VehicleMantProgram"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleMantProgram_vehicleId_idx" ON "public"."VehicleMantProgram"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleMantProgram_isActive_idx" ON "public"."VehicleMantProgram"("isActive");

-- CreateIndex
CREATE INDEX "VehicleMantProgram_nextMaintenanceKm_idx" ON "public"."VehicleMantProgram"("nextMaintenanceKm");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleMantProgram_vehicleId_key" ON "public"."VehicleMantProgram"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_tenantId_idx" ON "public"."VehicleProgramPackage"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_programId_idx" ON "public"."VehicleProgramPackage"("programId");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_triggerKm_idx" ON "public"."VehicleProgramPackage"("triggerKm");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_status_idx" ON "public"."VehicleProgramPackage"("status");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_scheduledKm_idx" ON "public"."VehicleProgramPackage"("scheduledKm");

-- CreateIndex
CREATE INDEX "VehicleProgramPackage_packageType_idx" ON "public"."VehicleProgramPackage"("packageType");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_tenantId_idx" ON "public"."VehicleProgramItem"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_packageId_idx" ON "public"."VehicleProgramItem"("packageId");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_mantItemId_idx" ON "public"."VehicleProgramItem"("mantItemId");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_mantType_idx" ON "public"."VehicleProgramItem"("mantType");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_status_idx" ON "public"."VehicleProgramItem"("status");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_scheduledKm_idx" ON "public"."VehicleProgramItem"("scheduledKm");

-- CreateIndex
CREATE INDEX "VehicleProgramItem_urgency_idx" ON "public"."VehicleProgramItem"("urgency");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleProgramItem_packageId_mantItemId_key" ON "public"."VehicleProgramItem"("packageId", "mantItemId");

-- CreateIndex
CREATE INDEX "WorkOrder_requestedBy_idx" ON "public"."WorkOrder"("requestedBy");

-- CreateIndex
CREATE INDEX "WorkOrder_authorizedBy_idx" ON "public"."WorkOrder"("authorizedBy");

-- CreateIndex
CREATE INDEX "WorkOrder_isPackageWork_idx" ON "public"."WorkOrder"("isPackageWork");

-- CreateIndex
CREATE INDEX "WorkOrderItem_supplier_idx" ON "public"."WorkOrderItem"("supplier");

-- CreateIndex
CREATE INDEX "WorkOrderItem_purchasedBy_idx" ON "public"."WorkOrderItem"("purchasedBy");

-- AddForeignKey
ALTER TABLE "public"."VehicleMantPlanItem" ADD CONSTRAINT "VehicleMantPlanItem_vehicleMantPackageId_fkey" FOREIGN KEY ("vehicleMantPackageId") REFERENCES "public"."VehicleMantPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMantPackage" ADD CONSTRAINT "VehicleMantPackage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMantPackage" ADD CONSTRAINT "VehicleMantPackage_vehicleMantPlanId_fkey" FOREIGN KEY ("vehicleMantPlanId") REFERENCES "public"."VehicleMantPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMantPackage" ADD CONSTRAINT "VehicleMantPackage_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceTemplate" ADD CONSTRAINT "MaintenanceTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceTemplate" ADD CONSTRAINT "MaintenanceTemplate_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "public"."VehicleBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceTemplate" ADD CONSTRAINT "MaintenanceTemplate_vehicleLineId_fkey" FOREIGN KEY ("vehicleLineId") REFERENCES "public"."VehicleLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenancePackage" ADD CONSTRAINT "MaintenancePackage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."MaintenanceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PackageItem" ADD CONSTRAINT "PackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."MaintenancePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PackageItem" ADD CONSTRAINT "PackageItem_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "public"."MantItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMaintenanceMetrics" ADD CONSTRAINT "VehicleMaintenanceMetrics_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMaintenanceMetrics" ADD CONSTRAINT "VehicleMaintenanceMetrics_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduledPackage" ADD CONSTRAINT "ScheduledPackage_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."VehicleMaintenanceMetrics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduledPackage" ADD CONSTRAINT "ScheduledPackage_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrderExpense" ADD CONSTRAINT "WorkOrderExpense_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrderApproval" ADD CONSTRAINT "WorkOrderApproval_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpenseAuditLog" ADD CONSTRAINT "ExpenseAuditLog_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMantProgram" ADD CONSTRAINT "VehicleMantProgram_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMantProgram" ADD CONSTRAINT "VehicleMantProgram_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."VehicleMantProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "public"."Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramPackage" ADD CONSTRAINT "VehicleProgramPackage_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."VehicleProgramPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "public"."MantItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "public"."Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleProgramItem" ADD CONSTRAINT "VehicleProgramItem_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
