/*
  Warnings:

  - You are about to drop the column `executionKm` on the `MaintenanceAlert` table. All the data in the column will be lost.
  - You are about to drop the column `mantItemDescription` on the `MaintenanceAlert` table. All the data in the column will be lost.
  - The `status` column on the `MaintenanceAlert` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[workOrderId]` on the table `MaintenanceAlert` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[programItemId,status]` on the table `MaintenanceAlert` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `alertThresholdKm` to the `MaintenanceAlert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `MaintenanceAlert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currentKmAtCreation` to the `MaintenanceAlert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemName` to the `MaintenanceAlert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `packageName` to the `MaintenanceAlert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `programItemId` to the `MaintenanceAlert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledKm` to the `MaintenanceAlert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `MaintenanceAlert` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."AlertStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'SNOOZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."AlertType" AS ENUM ('PREVENTIVE', 'OVERDUE', 'EARLY_WARNING');

-- CreateEnum
CREATE TYPE "public"."AlertCategory" AS ENUM ('CRITICAL_SAFETY', 'MAJOR_COMPONENT', 'ROUTINE', 'MINOR');

-- AlterTable
ALTER TABLE "public"."MaintenanceAlert" DROP COLUMN "executionKm",
DROP COLUMN "mantItemDescription",
ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "acknowledgedBy" TEXT,
ADD COLUMN     "actualCost" DECIMAL(10,2),
ADD COLUMN     "alertThresholdKm" INTEGER NOT NULL,
ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "category" "public"."AlertCategory" NOT NULL,
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "completionTimeHours" INTEGER,
ADD COLUMN     "costVariance" DECIMAL(10,2),
ADD COLUMN     "currentKmAtCreation" INTEGER NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "estimatedCost" DECIMAL(10,2),
ADD COLUMN     "estimatedDuration" DECIMAL(5,2),
ADD COLUMN     "firstViewedAt" TIMESTAMP(3),
ADD COLUMN     "itemName" TEXT NOT NULL,
ADD COLUMN     "lastNotificationAt" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "notificationsSent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "packageName" TEXT NOT NULL,
ADD COLUMN     "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "priorityScore" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "programItemId" INTEGER NOT NULL,
ADD COLUMN     "responseTimeMinutes" INTEGER,
ADD COLUMN     "scheduledKm" INTEGER NOT NULL,
ADD COLUMN     "snoozeReason" TEXT,
ADD COLUMN     "snoozedBy" TEXT,
ADD COLUMN     "snoozedUntil" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "type" "public"."AlertType" NOT NULL DEFAULT 'PREVENTIVE',
ADD COLUMN     "viewedBy" TEXT[],
ADD COLUMN     "wasOnTime" BOOLEAN,
ADD COLUMN     "workOrderCreatedAt" TIMESTAMP(3),
ADD COLUMN     "workOrderCreatedBy" TEXT,
ADD COLUMN     "workOrderId" INTEGER,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."AlertStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceAlert_workOrderId_key" ON "public"."MaintenanceAlert"("workOrderId");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_tenantId_idx" ON "public"."MaintenanceAlert"("tenantId");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_programItemId_idx" ON "public"."MaintenanceAlert"("programItemId");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_status_idx" ON "public"."MaintenanceAlert"("status");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_type_idx" ON "public"."MaintenanceAlert"("type");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_priority_idx" ON "public"."MaintenanceAlert"("priority");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_scheduledKm_idx" ON "public"."MaintenanceAlert"("scheduledKm");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_wasOnTime_idx" ON "public"."MaintenanceAlert"("wasOnTime");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceAlert_programItemId_status_key" ON "public"."MaintenanceAlert"("programItemId", "status");

-- AddForeignKey
ALTER TABLE "public"."MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_programItemId_fkey" FOREIGN KEY ("programItemId") REFERENCES "public"."VehicleProgramItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
