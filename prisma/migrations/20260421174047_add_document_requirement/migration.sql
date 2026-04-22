/*
  Warnings:

  - The `bodyWork` column on the `Vehicle` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[tenantId,code]` on the table `WorkOrder` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `vehicleTypeId` to the `MaintenanceTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BodyWorkType" AS ENUM ('SEDAN', 'COUPE', 'HATCHBACK', 'FAMILIAR', 'CONVERTIBLE', 'PICK_UP', 'CAMPERO', 'VAN', 'FURGON', 'MICROBUS', 'BUSETA', 'BUS', 'CAMION', 'VOLQUETA', 'TRACTOCAMION', 'CISTERNA', 'PLANCHON', 'GRUA', 'SEMIRREMOLQUE', 'REMOLQUE', 'MOTOCICLETA', 'MOTOCAR', 'TRICIMOTO', 'CUATRIMOTO', 'MAQUINARIA_AGRICOLA', 'MAQUINARIA_INDUSTRIAL');

-- CreateEnum
CREATE TYPE "IncidentAlertStatus" AS ENUM ('REPORTED', 'REVIEWED', 'WO_CREATED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('OK', 'OBSERVATION', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ChecklistItemStatus" AS ENUM ('OK', 'OBSERVATION', 'CRITICAL');

-- DropForeignKey
ALTER TABLE "MaintenanceTemplate" DROP CONSTRAINT "MaintenanceTemplate_vehicleBrandId_fkey";

-- DropForeignKey
ALTER TABLE "MaintenanceTemplate" DROP CONSTRAINT "MaintenanceTemplate_vehicleLineId_fkey";

-- AlterTable
ALTER TABLE "MaintenanceTemplate" ADD COLUMN     "clonedFromId" TEXT,
ADD COLUMN     "vehicleTypeId" TEXT NOT NULL,
ALTER COLUMN "vehicleBrandId" DROP NOT NULL,
ALTER COLUMN "vehicleLineId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "bodyWork",
ADD COLUMN     "bodyWork" "BodyWorkType";

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "code" TEXT;

-- CreateTable
CREATE TABLE "TenantSequence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "prefix" TEXT,

    CONSTRAINT "TenantSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequirement" (
    "id" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentAlert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientUuid" TEXT NOT NULL,
    "code" TEXT,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "reportedBy" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "severity" "AlertLevel" NOT NULL,
    "status" "IncidentAlertStatus" NOT NULL DEFAULT 'REPORTED',
    "workOrderId" TEXT,
    "dismissedBy" TEXT,
    "dismissNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyChecklist" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientUuid" TEXT NOT NULL,
    "code" TEXT,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "odometer" INTEGER NOT NULL,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'OK',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "templateId" TEXT,

    CONSTRAINT "DailyChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" "ChecklistItemStatus" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverTraining" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "certificateUrl" TEXT,

    CONSTRAINT "DriverTraining_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,
    "countryCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clonedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantSequence_tenantId_idx" ON "TenantSequence"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSequence_tenantId_entityType_key" ON "TenantSequence"("tenantId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRequirement_documentTypeId_vehicleTypeId_key" ON "DocumentRequirement"("documentTypeId", "vehicleTypeId");

-- CreateIndex
CREATE INDEX "IncidentAlert_tenantId_idx" ON "IncidentAlert"("tenantId");

-- CreateIndex
CREATE INDEX "IncidentAlert_vehicleId_idx" ON "IncidentAlert"("vehicleId");

-- CreateIndex
CREATE INDEX "IncidentAlert_status_idx" ON "IncidentAlert"("status");

-- CreateIndex
CREATE INDEX "IncidentAlert_severity_idx" ON "IncidentAlert"("severity");

-- CreateIndex
CREATE INDEX "IncidentAlert_createdAt_idx" ON "IncidentAlert"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentAlert_tenantId_clientUuid_key" ON "IncidentAlert"("tenantId", "clientUuid");

-- CreateIndex
CREATE INDEX "DailyChecklist_tenantId_idx" ON "DailyChecklist"("tenantId");

-- CreateIndex
CREATE INDEX "DailyChecklist_vehicleId_idx" ON "DailyChecklist"("vehicleId");

-- CreateIndex
CREATE INDEX "DailyChecklist_driverId_idx" ON "DailyChecklist"("driverId");

-- CreateIndex
CREATE INDEX "DailyChecklist_createdAt_idx" ON "DailyChecklist"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChecklist_tenantId_clientUuid_key" ON "DailyChecklist"("tenantId", "clientUuid");

-- CreateIndex
CREATE INDEX "ChecklistItem_checklistId_idx" ON "ChecklistItem"("checklistId");

-- CreateIndex
CREATE INDEX "DriverTraining_tenantId_idx" ON "DriverTraining"("tenantId");

-- CreateIndex
CREATE INDEX "DriverTraining_driverId_idx" ON "DriverTraining"("driverId");

-- CreateIndex
CREATE INDEX "DriverTraining_expiresAt_idx" ON "DriverTraining"("expiresAt");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_tenantId_idx" ON "ChecklistTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_vehicleTypeId_idx" ON "ChecklistTemplate"("vehicleTypeId");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_isGlobal_idx" ON "ChecklistTemplate"("isGlobal");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_isActive_idx" ON "ChecklistTemplate"("isActive");

-- CreateIndex
CREATE INDEX "ChecklistTemplateItem_templateId_idx" ON "ChecklistTemplateItem"("templateId");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_vehicleTypeId_idx" ON "MaintenanceTemplate"("vehicleTypeId");

-- CreateIndex
CREATE INDEX "MaintenanceTemplate_clonedFromId_idx" ON "MaintenanceTemplate"("clonedFromId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_tenantId_code_key" ON "WorkOrder"("tenantId", "code");

-- AddForeignKey
ALTER TABLE "TenantSequence" ADD CONSTRAINT "TenantSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTemplate" ADD CONSTRAINT "MaintenanceTemplate_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTemplate" ADD CONSTRAINT "MaintenanceTemplate_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "VehicleBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTemplate" ADD CONSTRAINT "MaintenanceTemplate_vehicleLineId_fkey" FOREIGN KEY ("vehicleLineId") REFERENCES "VehicleLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceTemplate" ADD CONSTRAINT "MaintenanceTemplate_clonedFromId_fkey" FOREIGN KEY ("clonedFromId") REFERENCES "MaintenanceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentTypeConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAlert" ADD CONSTRAINT "IncidentAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAlert" ADD CONSTRAINT "IncidentAlert_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAlert" ADD CONSTRAINT "IncidentAlert_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAlert" ADD CONSTRAINT "IncidentAlert_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChecklist" ADD CONSTRAINT "DailyChecklist_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChecklist" ADD CONSTRAINT "DailyChecklist_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChecklist" ADD CONSTRAINT "DailyChecklist_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyChecklist" ADD CONSTRAINT "DailyChecklist_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "DailyChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverTraining" ADD CONSTRAINT "DriverTraining_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverTraining" ADD CONSTRAINT "DriverTraining_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_clonedFromId_fkey" FOREIGN KEY ("clonedFromId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplateItem" ADD CONSTRAINT "ChecklistTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
