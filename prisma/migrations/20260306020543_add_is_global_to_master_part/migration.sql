-- AlterTable
ALTER TABLE "MasterPart" ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "MasterPart_isGlobal_idx" ON "MasterPart"("isGlobal");
