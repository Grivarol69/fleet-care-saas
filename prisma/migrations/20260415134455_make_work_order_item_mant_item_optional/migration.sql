-- DropForeignKey
ALTER TABLE "WorkOrderItem" DROP CONSTRAINT "WorkOrderItem_mantItemId_fkey";

-- AlterTable
ALTER TABLE "WorkOrderItem" ALTER COLUMN "mantItemId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "MantItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
