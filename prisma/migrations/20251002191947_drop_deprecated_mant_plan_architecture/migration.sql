/*
  Warnings:

  - You are about to drop the `MantPlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlanTask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VehicleMantPackage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VehicleMantPlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VehicleMantPlanItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."MantPlan" DROP CONSTRAINT "MantPlan_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MantPlan" DROP CONSTRAINT "MantPlan_vehicleBrandId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MantPlan" DROP CONSTRAINT "MantPlan_vehicleLineId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlanTask" DROP CONSTRAINT "PlanTask_mantItemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PlanTask" DROP CONSTRAINT "PlanTask_planId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VehicleMantPackage" DROP CONSTRAINT "VehicleMantPackage_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VehicleMantPackage" DROP CONSTRAINT "VehicleMantPackage_vehicleMantPlanId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VehicleMantPackage" DROP CONSTRAINT "VehicleMantPackage_workOrderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VehicleMantPlan" DROP CONSTRAINT "VehicleMantPlan_mantPlanId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VehicleMantPlan" DROP CONSTRAINT "VehicleMantPlan_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VehicleMantPlan" DROP CONSTRAINT "VehicleMantPlan_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VehicleMantPlanItem" DROP CONSTRAINT "VehicleMantPlanItem_mantItemId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VehicleMantPlanItem" DROP CONSTRAINT "VehicleMantPlanItem_providerId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VehicleMantPlanItem" DROP CONSTRAINT "VehicleMantPlanItem_technicianId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VehicleMantPlanItem" DROP CONSTRAINT "VehicleMantPlanItem_vehicleMantPackageId_fkey";

-- DropForeignKey
ALTER TABLE "public"."VehicleMantPlanItem" DROP CONSTRAINT "VehicleMantPlanItem_vehicleMantPlanId_fkey";

-- DropTable
DROP TABLE "public"."MantPlan";

-- DropTable
DROP TABLE "public"."PlanTask";

-- DropTable
DROP TABLE "public"."VehicleMantPackage";

-- DropTable
DROP TABLE "public"."VehicleMantPlan";

-- DropTable
DROP TABLE "public"."VehicleMantPlanItem";
