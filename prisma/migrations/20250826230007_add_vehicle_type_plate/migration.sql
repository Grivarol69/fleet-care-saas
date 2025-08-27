-- CreateEnum
CREATE TYPE "public"."PlateType" AS ENUM ('PARTICULAR', 'PUBLICO');

-- AlterTable
ALTER TABLE "public"."Vehicle" ADD COLUMN     "typePlate" "public"."PlateType" NOT NULL DEFAULT 'PARTICULAR';
