/*
  Warnings:

  - The `specialty` column on the `Provider` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `specialty` column on the `Technician` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."OdometerMeasureType" AS ENUM ('KILOMETERS', 'HOURS');

-- CreateEnum
CREATE TYPE "public"."TechnicianSpecialty" AS ENUM ('MOTOR', 'TRANSMISION', 'FRENOS', 'SUSPENSION', 'ELECTRICO', 'ELECTRONICO', 'AIRE_ACONDICIONADO', 'PINTURA', 'CARROCERIA', 'SOLDADURA', 'GENERAL');

-- CreateEnum
CREATE TYPE "public"."ProviderSpecialty" AS ENUM ('REPUESTOS', 'LUBRICANTES', 'NEUMATICOS', 'BATERIAS', 'FILTROS', 'FRENOS', 'SUSPENSION', 'ELECTRICO', 'PINTURA', 'CARROCERIA', 'SOLDADURA', 'SERVICIOS_GENERALES', 'GRUA', 'SEGUROS');

-- AlterTable
ALTER TABLE "public"."OdometerLog" ADD COLUMN     "driverId" INTEGER,
ADD COLUMN     "hours" INTEGER,
ADD COLUMN     "measureType" "public"."OdometerMeasureType" NOT NULL DEFAULT 'KILOMETERS',
ALTER COLUMN "kilometers" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Provider" DROP COLUMN "specialty",
ADD COLUMN     "specialty" "public"."ProviderSpecialty";

-- AlterTable
ALTER TABLE "public"."Technician" DROP COLUMN "specialty",
ADD COLUMN     "specialty" "public"."TechnicianSpecialty";

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "public"."Driver" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VehicleDriver" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vehicleId" INTEGER NOT NULL,
    "driverId" INTEGER NOT NULL,
    "status" "public"."Status" NOT NULL DEFAULT 'ACTIVE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "assignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleDriver_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Driver_tenantId_idx" ON "public"."Driver"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_tenantId_licenseNumber_key" ON "public"."Driver"("tenantId", "licenseNumber");

-- CreateIndex
CREATE INDEX "VehicleDriver_tenantId_idx" ON "public"."VehicleDriver"("tenantId");

-- CreateIndex
CREATE INDEX "VehicleDriver_vehicleId_idx" ON "public"."VehicleDriver"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleDriver_driverId_idx" ON "public"."VehicleDriver"("driverId");

-- CreateIndex
CREATE INDEX "VehicleDriver_status_idx" ON "public"."VehicleDriver"("status");

-- CreateIndex
CREATE INDEX "VehicleDriver_startDate_idx" ON "public"."VehicleDriver"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleDriver_tenantId_vehicleId_driverId_key" ON "public"."VehicleDriver"("tenantId", "vehicleId", "driverId");

-- CreateIndex
CREATE INDEX "OdometerLog_driverId_idx" ON "public"."OdometerLog"("driverId");

-- AddForeignKey
ALTER TABLE "public"."Driver" ADD CONSTRAINT "Driver_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleDriver" ADD CONSTRAINT "VehicleDriver_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleDriver" ADD CONSTRAINT "VehicleDriver_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VehicleDriver" ADD CONSTRAINT "VehicleDriver_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OdometerLog" ADD CONSTRAINT "OdometerLog_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
