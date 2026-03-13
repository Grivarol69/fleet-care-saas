/*
  Warnings:

  - You are about to drop the column `baseHours` on the `MantItemProcedure` table. All the data in the column will be lost.
  - You are about to drop the column `steps` on the `MantItemProcedure` table. All the data in the column will be lost.
  - You are about to drop the column `indirectHours` on the `WorkOrderSubTask` table. All the data in the column will be lost.
  - You are about to drop the column `stepOrder` on the `WorkOrderSubTask` table. All the data in the column will be lost.
  - You are about to drop the column `technicianId` on the `WorkOrderSubTask` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `Driver` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Technician` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "WorkOrderSubTask" DROP CONSTRAINT "WorkOrderSubTask_technicianId_fkey";

-- DropIndex
DROP INDEX "WorkOrderSubTask_technicianId_idx";

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "MantItemProcedure" DROP COLUMN IF EXISTS "baseHours";
ALTER TABLE "MantItemProcedure" DROP COLUMN IF EXISTS "steps";

-- AlterTable
ALTER TABLE "Technician" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "WorkOrderItem" ADD COLUMN     "indirectHours" DECIMAL(6,2),
ADD COLUMN     "indirectJustification" TEXT,
ADD COLUMN     "technicianId" TEXT;

-- AlterTable
ALTER TABLE "WorkOrderSubTask" DROP COLUMN IF EXISTS "indirectHours";
ALTER TABLE "WorkOrderSubTask" DROP COLUMN IF EXISTS "stepOrder";
ALTER TABLE "WorkOrderSubTask" DROP COLUMN IF EXISTS "technicianId";
ALTER TABLE "WorkOrderSubTask" ADD COLUMN "temparioItemId" TEXT;
ALTER TABLE "WorkOrderSubTask" ALTER COLUMN "description" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Tempario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tempario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemparioItem" (
    "id" TEXT NOT NULL,
    "temparioId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "referenceHours" DECIMAL(6,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemparioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MantItemProcedureStep" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "temparioItemId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "standardHours" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "MantItemProcedureStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tempario_tenantId_idx" ON "Tempario"("tenantId");

-- CreateIndex
CREATE INDEX "Tempario_isGlobal_idx" ON "Tempario"("isGlobal");

-- CreateIndex
CREATE INDEX "TemparioItem_temparioId_idx" ON "TemparioItem"("temparioId");

-- CreateIndex
CREATE INDEX "TemparioItem_code_idx" ON "TemparioItem"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TemparioItem_temparioId_code_key" ON "TemparioItem"("temparioId", "code");

-- CreateIndex
CREATE INDEX "MantItemProcedureStep_procedureId_idx" ON "MantItemProcedureStep"("procedureId");

-- CreateIndex
CREATE INDEX "MantItemProcedureStep_temparioItemId_idx" ON "MantItemProcedureStep"("temparioItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MantItemProcedureStep_procedureId_order_key" ON "MantItemProcedureStep"("procedureId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Technician_userId_key" ON "Technician"("userId");

-- CreateIndex
CREATE INDEX "WorkOrderItem_technicianId_idx" ON "WorkOrderItem"("technicianId");

-- CreateIndex
CREATE INDEX "WorkOrderSubTask_temparioItemId_idx" ON "WorkOrderSubTask"("temparioItemId");

-- AddForeignKey
ALTER TABLE "Tempario" ADD CONSTRAINT "Tempario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemparioItem" ADD CONSTRAINT "TemparioItem_temparioId_fkey" FOREIGN KEY ("temparioId") REFERENCES "Tempario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemProcedureStep" ADD CONSTRAINT "MantItemProcedureStep_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "MantItemProcedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemProcedureStep" ADD CONSTRAINT "MantItemProcedureStep_temparioItemId_fkey" FOREIGN KEY ("temparioItemId") REFERENCES "TemparioItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderSubTask" ADD CONSTRAINT "WorkOrderSubTask_temparioItemId_fkey" FOREIGN KEY ("temparioItemId") REFERENCES "TemparioItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
