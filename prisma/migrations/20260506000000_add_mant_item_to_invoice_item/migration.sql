-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN "mantItemId" TEXT;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "MantItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "InvoiceItem_mantItemId_idx" ON "InvoiceItem"("mantItemId");
