-- Step 1: Rename columns
ALTER TABLE "FuelVoucher" RENAME COLUMN "liters" TO "quantity";
ALTER TABLE "FuelVoucher" RENAME COLUMN "pricePerLiter" TO "pricePerUnit";

-- Step 2: Migrate GASOIL rows to DIESEL BEFORE touching the enum
UPDATE "FuelVoucher" SET "fuelType" = 'DIESEL' WHERE "fuelType" = 'GASOIL';

-- Step 3: Recreate FuelVoucherFuelType without GASOIL
ALTER TYPE "FuelVoucherFuelType" RENAME TO "FuelVoucherFuelType_old";
CREATE TYPE "FuelVoucherFuelType" AS ENUM ('NAFTA_SUPER', 'NAFTA_PREMIUM', 'GNC', 'DIESEL', 'DIESEL_PREMIUM');
ALTER TABLE "FuelVoucher" ALTER COLUMN "fuelType" TYPE "FuelVoucherFuelType" USING "fuelType"::text::"FuelVoucherFuelType";
DROP TYPE "FuelVoucherFuelType_old";

-- Step 4: Add VolumeUnit enum and column
CREATE TYPE "VolumeUnit" AS ENUM ('LITERS', 'GALLONS');
ALTER TABLE "FuelVoucher" ADD COLUMN "volumeUnit" "VolumeUnit" NOT NULL DEFAULT 'LITERS';
