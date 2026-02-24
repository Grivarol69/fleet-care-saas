-- AlterTable
ALTER TABLE "ExpenseAuditLog" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "OdometerLog" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "PurchaseOrderItem" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "TicketLaborEntry" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "TicketPartEntry" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "WorkOrderApproval" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "WorkOrderExpense" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "WorkOrderItem" ADD COLUMN     "tenantId" TEXT;

-- CreateIndex
CREATE INDEX "ExpenseAuditLog_tenantId_idx" ON "ExpenseAuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "InvoiceItem_tenantId_idx" ON "InvoiceItem"("tenantId");

-- CreateIndex
CREATE INDEX "OdometerLog_tenantId_idx" ON "OdometerLog"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_tenantId_idx" ON "PurchaseOrderItem"("tenantId");

-- CreateIndex
CREATE INDEX "TicketLaborEntry_tenantId_idx" ON "TicketLaborEntry"("tenantId");

-- CreateIndex
CREATE INDEX "TicketPartEntry_tenantId_idx" ON "TicketPartEntry"("tenantId");

-- CreateIndex
CREATE INDEX "WorkOrderApproval_tenantId_idx" ON "WorkOrderApproval"("tenantId");

-- CreateIndex
CREATE INDEX "WorkOrderExpense_tenantId_idx" ON "WorkOrderExpense"("tenantId");

-- CreateIndex
CREATE INDEX "WorkOrderItem_tenantId_idx" ON "WorkOrderItem"("tenantId");

-- AddForeignKey
ALTER TABLE "WorkOrderItem" ADD CONSTRAINT "WorkOrderItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderExpense" ADD CONSTRAINT "WorkOrderExpense_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderApproval" ADD CONSTRAINT "WorkOrderApproval_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAuditLog" ADD CONSTRAINT "ExpenseAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdometerLog" ADD CONSTRAINT "OdometerLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLaborEntry" ADD CONSTRAINT "TicketLaborEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketPartEntry" ADD CONSTRAINT "TicketPartEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
