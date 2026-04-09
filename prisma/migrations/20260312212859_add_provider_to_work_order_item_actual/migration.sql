-- AlterTable
ALTER TABLE "WorkOrderItem" ADD COLUMN     "providerId" TEXT;

-- CreateIndex
CREATE INDEX "WorkOrderItem_providerId_idx" ON "WorkOrderItem"("providerId");

-- AddForeignKey
ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
