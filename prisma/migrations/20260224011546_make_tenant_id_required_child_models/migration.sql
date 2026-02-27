/*
  Warnings:

  - Made the column `tenantId` on table `ExpenseAuditLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `InvoiceItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `OdometerLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `PurchaseOrderItem` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `TicketLaborEntry` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `TicketPartEntry` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `WorkOrderApproval` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `WorkOrderExpense` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `WorkOrderItem` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ExpenseAuditLog" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "InvoiceItem" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "OdometerLog" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "PurchaseOrderItem" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "TicketLaborEntry" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "TicketPartEntry" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "WorkOrderApproval" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "WorkOrderExpense" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "WorkOrderItem" ALTER COLUMN "tenantId" SET NOT NULL;
