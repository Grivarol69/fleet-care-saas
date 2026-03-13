-- AlterEnum
ALTER TYPE "VehicleOwner" ADD VALUE 'THIRD_PARTY';

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "costCenterId" TEXT;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "costCenterId" TEXT;

-- AlterTable
ALTER TABLE "WorkOrderItem" ADD COLUMN     "billingPrice" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "CostCenter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "taxId" TEXT,
    "billingEmail" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "siigoId" TEXT,
    "siigoIdType" "SiigoIdType",
    "siigoPersonType" "SiigoPersonType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostCenter_tenantId_idx" ON "CostCenter"("tenantId");

-- CreateIndex
CREATE INDEX "CostCenter_isActive_idx" ON "CostCenter"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CostCenter_tenantId_code_key" ON "CostCenter"("tenantId", "code");

-- AddForeignKey
ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
