/*
  Warnings:

  - You are about to drop the `VehicleDriver` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VehicleDriver" DROP CONSTRAINT "VehicleDriver_driverId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleDriver" DROP CONSTRAINT "VehicleDriver_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "VehicleDriver" DROP CONSTRAINT "VehicleDriver_vehicleId_fkey";

-- AlterTable
ALTER TABLE "ChecklistTemplate" ADD COLUMN     "vehicleBrandId" TEXT,
ADD COLUMN     "vehicleLineId" TEXT;

-- DropTable
DROP TABLE "VehicleDriver";

-- CreateIndex
CREATE INDEX "ChecklistTemplate_vehicleBrandId_idx" ON "ChecklistTemplate"("vehicleBrandId");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_vehicleLineId_idx" ON "ChecklistTemplate"("vehicleLineId");

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_vehicleBrandId_fkey" FOREIGN KEY ("vehicleBrandId") REFERENCES "VehicleBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_vehicleLineId_fkey" FOREIGN KEY ("vehicleLineId") REFERENCES "VehicleLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
