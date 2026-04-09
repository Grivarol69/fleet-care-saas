-- CreateEnum
CREATE TYPE "FuelVoucherFuelType" AS ENUM ('NAFTA_SUPER', 'NAFTA_PREMIUM', 'GASOIL', 'GNC', 'DIESEL', 'DIESEL_PREMIUM');

-- AlterTable
ALTER TABLE "OdometerLog" ADD COLUMN "fuelVoucherId" TEXT;

-- CreateTable
CREATE TABLE "FuelVoucher" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "providerId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "fuelType" "FuelVoucherFuelType" NOT NULL,
    "liters" DECIMAL(10,3) NOT NULL,
    "odometer" INTEGER NOT NULL,
    "pricePerLiter" DECIMAL(10,4),
    "totalAmount" DECIMAL(12,2),
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FuelVoucher_tenantId_idx" ON "FuelVoucher"("tenantId");

-- CreateIndex
CREATE INDEX "FuelVoucher_vehicleId_idx" ON "FuelVoucher"("vehicleId");

-- CreateIndex
CREATE INDEX "FuelVoucher_driverId_idx" ON "FuelVoucher"("driverId");

-- CreateIndex
CREATE INDEX "FuelVoucher_date_idx" ON "FuelVoucher"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FuelVoucher_tenantId_voucherNumber_key" ON "FuelVoucher"("tenantId", "voucherNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OdometerLog_fuelVoucherId_key" ON "OdometerLog"("fuelVoucherId");

-- AddForeignKey
ALTER TABLE "OdometerLog" ADD CONSTRAINT "OdometerLog_fuelVoucherId_fkey" FOREIGN KEY ("fuelVoucherId") REFERENCES "FuelVoucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelVoucher" ADD CONSTRAINT "FuelVoucher_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelVoucher" ADD CONSTRAINT "FuelVoucher_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelVoucher" ADD CONSTRAINT "FuelVoucher_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelVoucher" ADD CONSTRAINT "FuelVoucher_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
