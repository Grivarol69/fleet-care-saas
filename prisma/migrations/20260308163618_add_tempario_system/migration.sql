-- CreateEnum
CREATE TYPE "WorkOrderSubTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "MantItemProcedure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "mantItemId" TEXT NOT NULL,
    "vehicleBrandId" TEXT,
    "vehicleLineId" TEXT,
    "baseHours" DECIMAL(6,2) NOT NULL,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MantItemProcedure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderSubTask" (
    "id" TEXT NOT NULL,
    "workOrderItemId" TEXT NOT NULL,
    "procedureId" TEXT,
    "stepOrder" INTEGER,
    "description" TEXT NOT NULL,
    "standardHours" DECIMAL(6,2),
    "directHours" DECIMAL(6,2),
    "indirectHours" DECIMAL(6,2),
    "status" "WorkOrderSubTaskStatus" NOT NULL DEFAULT 'PENDING',
    "technicianId" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrderSubTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MantItemProcedure_mantItemId_idx" ON "MantItemProcedure"("mantItemId");

-- CreateIndex
CREATE INDEX "MantItemProcedure_vehicleBrandId_vehicleLineId_idx" ON "MantItemProcedure"("vehicleBrandId", "vehicleLineId");

-- CreateIndex
CREATE INDEX "MantItemProcedure_isGlobal_idx" ON "MantItemProcedure"("isGlobal");

-- CreateIndex
CREATE INDEX "MantItemProcedure_tenantId_idx" ON "MantItemProcedure"("tenantId");

-- CreateIndex
CREATE INDEX "WorkOrderSubTask_workOrderItemId_idx" ON "WorkOrderSubTask"("workOrderItemId");

-- CreateIndex
CREATE INDEX "WorkOrderSubTask_procedureId_idx" ON "WorkOrderSubTask"("procedureId");

-- CreateIndex
CREATE INDEX "WorkOrderSubTask_technicianId_idx" ON "WorkOrderSubTask"("technicianId");

-- CreateIndex
CREATE INDEX "WorkOrderSubTask_status_idx" ON "WorkOrderSubTask"("status");

-- AddForeignKey
ALTER TABLE "MantItemProcedure" ADD CONSTRAINT "MantItemProcedure_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "MantItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemProcedure" ADD CONSTRAINT "MantItemProcedure_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "VehicleBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemProcedure" ADD CONSTRAINT "MantItemProcedure_vehicleLineId_fkey" FOREIGN KEY ("vehicleLineId") REFERENCES "VehicleLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MantItemProcedure" ADD CONSTRAINT "MantItemProcedure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderSubTask" ADD CONSTRAINT "WorkOrderSubTask_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "WorkOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderSubTask" ADD CONSTRAINT "WorkOrderSubTask_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "MantItemProcedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderSubTask" ADD CONSTRAINT "WorkOrderSubTask_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;
