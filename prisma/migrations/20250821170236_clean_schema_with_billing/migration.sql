/*
  Warnings:

  - You are about to drop the column `rut_nit` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `actualCost` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `completedDate` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedCost` on the `WorkOrder` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledDate` on the `WorkOrder` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenantId,name]` on the table `Technician` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[subscriptionId]` on the table `Tenant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Tenant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creationMileage` to the `WorkOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mantType` to the `WorkOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PENDING_PAYMENT', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'IN_PROCESS');

-- CreateEnum
CREATE TYPE "public"."VehicleSituation" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."VehicleOwner" AS ENUM ('OWN', 'LEASED', 'RENTED');

-- CreateEnum
CREATE TYPE "public"."MantType" AS ENUM ('PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "public"."AlertLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('SOAT', 'TECNOMECANICA', 'INSURANCE', 'REGISTRATION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'EXPIRING_SOON');

-- DropIndex
DROP INDEX "public"."User_email_key";

-- DropIndex
DROP INDEX "public"."WorkOrder_technicianId_idx";

-- AlterTable
ALTER TABLE "public"."Tenant" DROP COLUMN "rut_nit",
ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "settings" JSONB,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" "public"."SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."Vehicle" ADD COLUMN     "bodyWork" TEXT,
ADD COLUMN     "chasisNumber" TEXT,
ADD COLUMN     "cylinder" INTEGER,
ADD COLUMN     "engineNumber" TEXT,
ADD COLUMN     "lastKilometers" INTEGER,
ADD COLUMN     "lastRecorder" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "owner" "public"."VehicleOwner" NOT NULL DEFAULT 'OWN',
ADD COLUMN     "ownerCard" TEXT,
ADD COLUMN     "photo" TEXT,
ADD COLUMN     "situation" "public"."VehicleSituation" NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE "public"."WorkOrder" DROP COLUMN "actualCost",
DROP COLUMN "completedDate",
DROP COLUMN "estimatedCost",
DROP COLUMN "scheduledDate",
ADD COLUMN     "creationMileage" INTEGER NOT NULL,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "mantType" "public"."MantType" NOT NULL,
ADD COLUMN     "plannedAmount" DECIMAL(10,2),
ADD COLUMN     "providerId" INTEGER,
ADD COLUMN     "realAmount" DECIMAL(10,2),
ADD COLUMN     "startDate" TIMESTAMP(3),
ALTER COLUMN "priority" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mercadoPagoUserId" TEXT,
    "preapprovalId" TEXT,
    "planId" TEXT NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "lastPaymentId" TEXT,
    "failedPaymentAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "mercadoPagoId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "status" "public"."PaymentStatus" NOT NULL,
    "paymentMethod" TEXT,
    "description" TEXT,
    "failureReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MantCategory" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MantCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MantItem" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mantType" "public"."MantType" NOT NULL,
    "estimatedTime" DECIMAL(5,2) NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MantItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MantPlan" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vehicleBrandId" INTEGER NOT NULL,
    "vehicleLineId" INTEGER NOT NULL,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MantPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlanTask" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "mantItemId" INTEGER NOT NULL,
    "triggerKm" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleMantPlan" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "mantPlanId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastKmCheck" INTEGER,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMantPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleMantPlanItem" (
    "id" SERIAL NOT NULL,
    "vehicleMantPlanId" INTEGER NOT NULL,
    "mantItemId" INTEGER NOT NULL,
    "executionMileage" INTEGER NOT NULL,
    "technicianId" INTEGER,
    "providerId" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "cost" DECIMAL(10,2),
    "notes" TEXT,
    "status" "public"."WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleMantPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WorkOrderItem" (
    "id" SERIAL NOT NULL,
    "workOrderId" INTEGER NOT NULL,
    "mantItemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "cost" DECIMAL(10,2),
    "executionMileage" INTEGER,
    "notes" TEXT,
    "status" "public"."WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Provider" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "specialty" TEXT,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OdometerLog" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "kilometers" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OdometerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaintenanceAlert" (
    "id" SERIAL NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "mantItemDescription" TEXT NOT NULL,
    "currentKm" INTEGER NOT NULL,
    "executionKm" INTEGER NOT NULL,
    "kmToMaintenance" INTEGER NOT NULL,
    "alertLevel" "public"."AlertLevel" NOT NULL,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "type" "public"."DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_preapprovalId_key" ON "public"."Subscription"("preapprovalId");

-- CreateIndex
CREATE INDEX "Subscription_tenantId_idx" ON "public"."Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "Subscription_mercadoPagoUserId_idx" ON "public"."Subscription"("mercadoPagoUserId");

-- CreateIndex
CREATE INDEX "Subscription_preapprovalId_idx" ON "public"."Subscription"("preapprovalId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_mercadoPagoId_key" ON "public"."Payment"("mercadoPagoId");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_idx" ON "public"."Payment"("subscriptionId");

-- CreateIndex
CREATE INDEX "Payment_mercadoPagoId_idx" ON "public"."Payment"("mercadoPagoId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE INDEX "MantCategory_tenantId_idx" ON "public"."MantCategory"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MantCategory_tenantId_name_key" ON "public"."MantCategory"("tenantId", "name");

-- CreateIndex
CREATE INDEX "MantItem_tenantId_idx" ON "public"."MantItem"("tenantId");

-- CreateIndex
CREATE INDEX "MantItem_categoryId_idx" ON "public"."MantItem"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MantItem_tenantId_name_key" ON "public"."MantItem"("tenantId", "name");

-- CreateIndex
CREATE INDEX "MantPlan_tenantId_idx" ON "public"."MantPlan"("tenantId");

-- CreateIndex
CREATE INDEX "MantPlan_vehicleBrandId_idx" ON "public"."MantPlan"("vehicleBrandId");

-- CreateIndex
CREATE INDEX "MantPlan_vehicleLineId_idx" ON "public"."MantPlan"("vehicleLineId");

-- CreateIndex
CREATE UNIQUE INDEX "MantPlan_tenantId_vehicleBrandId_vehicleLineId_name_key" ON "public"."MantPlan"("tenantId", "vehicleBrandId", "vehicleLineId", "name");

-- CreateIndex
CREATE INDEX "PlanTask_planId_idx" ON "public"."PlanTask"("planId");

-- CreateIndex
CREATE INDEX "PlanTask_mantItemId_idx" ON "public"."PlanTask"("mantItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanTask_planId_mantItemId_key" ON "public"."PlanTask"("planId", "mantItemId");

-- CreateIndex
CREATE INDEX "VehicleMantPlan_tenantId_idx" ON "public"."VehicleMantPlan"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleMantPlan_vehicleId_idx" ON "public"."VehicleMantPlan"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleMantPlan_mantPlanId_idx" ON "public"."VehicleMantPlan"("mantPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleMantPlan_vehicleId_mantPlanId_key" ON "public"."VehicleMantPlan"("vehicleId", "mantPlanId");

-- CreateIndex
CREATE INDEX "VehicleMantPlanItem_vehicleMantPlanId_idx" ON "public"."VehicleMantPlanItem"("vehicleMantPlanId");

-- CreateIndex
CREATE INDEX "VehicleMantPlanItem_mantItemId_idx" ON "public"."VehicleMantPlanItem"("mantItemId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleMantPlanItem_vehicleMantPlanId_mantItemId_key" ON "public"."VehicleMantPlanItem"("vehicleMantPlanId", "mantItemId");

-- CreateIndex
CREATE INDEX "WorkOrderItem_workOrderId_idx" ON "public"."WorkOrderItem"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderItem_mantItemId_idx" ON "public"."WorkOrderItem"("mantItemId");

-- CreateIndex
CREATE INDEX "Provider_tenantId_idx" ON "public"."Provider"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_tenantId_name_key" ON "public"."Provider"("tenantId", "name");

-- CreateIndex
CREATE INDEX "OdometerLog_vehicleId_idx" ON "public"."OdometerLog"("vehicleId");

-- CreateIndex
CREATE INDEX "OdometerLog_recordedAt_idx" ON "public"."OdometerLog"("recordedAt");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_vehicleId_idx" ON "public"."MaintenanceAlert"("vehicleId");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_alertLevel_idx" ON "public"."MaintenanceAlert"("alertLevel");

-- CreateIndex
CREATE INDEX "MaintenanceAlert_status_idx" ON "public"."MaintenanceAlert"("status");

-- CreateIndex
CREATE INDEX "Document_tenantId_idx" ON "public"."Document"("tenantId");

-- CreateIndex
CREATE INDEX "Document_vehicleId_idx" ON "public"."Document"("vehicleId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "public"."Document"("type");

-- CreateIndex
CREATE INDEX "Document_expiryDate_idx" ON "public"."Document"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_tenantId_name_key" ON "public"."Technician"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "public"."Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_subscriptionId_key" ON "public"."Tenant"("subscriptionId");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "public"."Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_subscriptionStatus_idx" ON "public"."Tenant"("subscriptionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "public"."User"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Vehicle_licensePlate_idx" ON "public"."Vehicle"("licensePlate");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "public"."WorkOrder"("status");

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MantCategory" ADD CONSTRAINT "MantCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MantItem" ADD CONSTRAINT "MantItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MantItem" ADD CONSTRAINT "MantItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."MantCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MantPlan" ADD CONSTRAINT "MantPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MantPlan" ADD CONSTRAINT "MantPlan_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "public"."VehicleBrand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MantPlan" ADD CONSTRAINT "MantPlan_vehicleLineId_fkey" FOREIGN KEY ("vehicleLineId") REFERENCES "public"."VehicleLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlanTask" ADD CONSTRAINT "PlanTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."MantPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlanTask" ADD CONSTRAINT "PlanTask_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "public"."MantItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMantPlan" ADD CONSTRAINT "VehicleMantPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMantPlan" ADD CONSTRAINT "VehicleMantPlan_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMantPlan" ADD CONSTRAINT "VehicleMantPlan_mantPlanId_fkey" FOREIGN KEY ("mantPlanId") REFERENCES "public"."MantPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMantPlanItem" ADD CONSTRAINT "VehicleMantPlanItem_vehicleMantPlanId_fkey" FOREIGN KEY ("vehicleMantPlanId") REFERENCES "public"."VehicleMantPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMantPlanItem" ADD CONSTRAINT "VehicleMantPlanItem_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "public"."MantItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMantPlanItem" ADD CONSTRAINT "VehicleMantPlanItem_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "public"."Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleMantPlanItem" ADD CONSTRAINT "VehicleMantPlanItem_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrder" ADD CONSTRAINT "WorkOrder_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "public"."Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "public"."MantItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Provider" ADD CONSTRAINT "Provider_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OdometerLog" ADD CONSTRAINT "OdometerLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
