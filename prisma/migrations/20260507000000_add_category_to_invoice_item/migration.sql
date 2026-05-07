-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "InvoiceItem_categoryId_idx" ON "InvoiceItem"("categoryId");

-- AddForeignKey
ALTER TABLE "InvoiceItem"
  ADD CONSTRAINT "InvoiceItem_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "MantCategory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill — snapshot categoryId from MantItem at deploy time
UPDATE "InvoiceItem" ii
   SET "categoryId" = mi."categoryId"
  FROM "MantItem" mi
 WHERE ii."mantItemId" = mi.id
   AND ii."categoryId" IS NULL
   AND mi."categoryId" IS NOT NULL;
