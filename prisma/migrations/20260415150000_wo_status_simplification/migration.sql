-- Data migration: map removed statuses to valid ones in ALL tables before ALTER TYPE
UPDATE "WorkOrder" SET status = 'APPROVED' WHERE status IN ('PENDING_APPROVAL', 'IN_PROGRESS');
UPDATE "WorkOrder" SET status = 'COMPLETED' WHERE status = 'PENDING_INVOICE';
UPDATE "WorkOrderItem" SET status = 'APPROVED' WHERE status IN ('PENDING_APPROVAL', 'IN_PROGRESS');
UPDATE "WorkOrderItem" SET status = 'COMPLETED' WHERE status = 'PENDING_INVOICE';
UPDATE "VehicleProgramItem" SET status = 'APPROVED' WHERE status IN ('PENDING_APPROVAL', 'IN_PROGRESS');
UPDATE "VehicleProgramItem" SET status = 'COMPLETED' WHERE status = 'PENDING_INVOICE';
UPDATE "VehicleProgramPackage" SET status = 'APPROVED' WHERE status IN ('PENDING_APPROVAL', 'IN_PROGRESS');
UPDATE "VehicleProgramPackage" SET status = 'COMPLETED' WHERE status = 'PENDING_INVOICE';

-- AlterEnum
CREATE TYPE "WorkOrderStatus_new" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'CLOSED', 'REJECTED', 'CANCELLED');
ALTER TABLE "public"."VehicleProgramItem" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."VehicleProgramPackage" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."WorkOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."WorkOrderItem" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "WorkOrder" ALTER COLUMN "status" TYPE "WorkOrderStatus_new" USING ("status"::text::"WorkOrderStatus_new");
ALTER TABLE "WorkOrderItem" ALTER COLUMN "status" TYPE "WorkOrderStatus_new" USING ("status"::text::"WorkOrderStatus_new");
ALTER TABLE "VehicleProgramPackage" ALTER COLUMN "status" TYPE "WorkOrderStatus_new" USING ("status"::text::"WorkOrderStatus_new");
ALTER TABLE "VehicleProgramItem" ALTER COLUMN "status" TYPE "WorkOrderStatus_new" USING ("status"::text::"WorkOrderStatus_new");
ALTER TYPE "WorkOrderStatus" RENAME TO "WorkOrderStatus_old";
ALTER TYPE "WorkOrderStatus_new" RENAME TO "WorkOrderStatus";
DROP TYPE "public"."WorkOrderStatus_old";
ALTER TABLE "VehicleProgramItem" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "VehicleProgramPackage" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "WorkOrder" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "WorkOrderItem" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable: add legal fields to Tenant for PDF header
ALTER TABLE "Tenant" ADD COLUMN "address" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "taxId" TEXT;
