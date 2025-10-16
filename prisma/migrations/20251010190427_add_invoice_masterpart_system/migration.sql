-- CreateEnum
CREATE TYPE "public"."ItemType" AS ENUM ('ACTION', 'PART', 'SERVICE');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."CompatibilityLevel" AS ENUM ('RECOMMENDED', 'COMPATIBLE', 'CONDITIONAL', 'INCOMPATIBLE');

-- AlterTable
ALTER TABLE "public"."MaintenanceAlert" ADD COLUMN     "customNotes" TEXT,
ADD COLUMN     "recommendedParts" JSONB,
ADD COLUMN     "technicalNotes" TEXT;

-- AlterTable
ALTER TABLE "public"."MantItem" ADD COLUMN     "technicalNotes" TEXT,
ADD COLUMN     "type" "public"."ItemType" NOT NULL DEFAULT 'ACTION';

-- CreateTable
CREATE TABLE "public"."MasterPart" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'UNIDAD',
    "referencePrice" DECIMAL(10,2),
    "lastPriceUpdate" TIMESTAMP(3),
    "specifications" JSONB,
    "alternativeFor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MantItemPart" (
    "id" TEXT NOT NULL,
    "mantItemId" INTEGER NOT NULL,
    "masterPartId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MantItemPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "supplierId" INTEGER NOT NULL,
    "workOrderId" INTEGER,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "registeredBy" TEXT NOT NULL,
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "masterPartId" TEXT,
    "workOrderItemId" INTEGER,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PartPriceHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "masterPartId" TEXT NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" TEXT,
    "approvedBy" TEXT,
    "purchasedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "registeredBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PartCompatibility" (
    "id" TEXT NOT NULL,
    "masterPartId" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "yearFrom" INTEGER,
    "yearTo" INTEGER,
    "engineType" TEXT,
    "transmission" TEXT,
    "compatibility" "public"."CompatibilityLevel" NOT NULL DEFAULT 'COMPATIBLE',
    "notes" TEXT,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartCompatibility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterPart_code_key" ON "public"."MasterPart"("code");

-- CreateIndex
CREATE INDEX "MasterPart_category_idx" ON "public"."MasterPart"("category");

-- CreateIndex
CREATE INDEX "MasterPart_tenantId_idx" ON "public"."MasterPart"("tenantId");

-- CreateIndex
CREATE INDEX "MasterPart_code_idx" ON "public"."MasterPart"("code");

-- CreateIndex
CREATE INDEX "MasterPart_isActive_idx" ON "public"."MasterPart"("isActive");

-- CreateIndex
CREATE INDEX "MantItemPart_mantItemId_idx" ON "public"."MantItemPart"("mantItemId");

-- CreateIndex
CREATE INDEX "MantItemPart_masterPartId_idx" ON "public"."MantItemPart"("masterPartId");

-- CreateIndex
CREATE UNIQUE INDEX "MantItemPart_mantItemId_masterPartId_key" ON "public"."MantItemPart"("mantItemId", "masterPartId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_idx" ON "public"."Invoice"("tenantId");

-- CreateIndex
CREATE INDEX "Invoice_supplierId_idx" ON "public"."Invoice"("supplierId");

-- CreateIndex
CREATE INDEX "Invoice_workOrderId_idx" ON "public"."Invoice"("workOrderId");

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "public"."Invoice"("invoiceDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_invoiceNumber_key" ON "public"."Invoice"("tenantId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "public"."InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceItem_masterPartId_idx" ON "public"."InvoiceItem"("masterPartId");

-- CreateIndex
CREATE INDEX "InvoiceItem_workOrderItemId_idx" ON "public"."InvoiceItem"("workOrderItemId");

-- CreateIndex
CREATE INDEX "PartPriceHistory_masterPartId_supplierId_idx" ON "public"."PartPriceHistory"("masterPartId", "supplierId");

-- CreateIndex
CREATE INDEX "PartPriceHistory_tenantId_idx" ON "public"."PartPriceHistory"("tenantId");

-- CreateIndex
CREATE INDEX "PartPriceHistory_recordedAt_idx" ON "public"."PartPriceHistory"("recordedAt");

-- CreateIndex
CREATE INDEX "PartPriceHistory_approvedBy_idx" ON "public"."PartPriceHistory"("approvedBy");

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "public"."InvoicePayment"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoicePayment_paymentDate_idx" ON "public"."InvoicePayment"("paymentDate");

-- CreateIndex
CREATE INDEX "PartCompatibility_masterPartId_idx" ON "public"."PartCompatibility"("masterPartId");

-- CreateIndex
CREATE INDEX "PartCompatibility_brand_model_idx" ON "public"."PartCompatibility"("brand", "model");

-- CreateIndex
CREATE INDEX "MantItem_type_idx" ON "public"."MantItem"("type");

-- AddForeignKey
ALTER TABLE "public"."MasterPart" ADD CONSTRAINT "MasterPart_alternativeFor_fkey" FOREIGN KEY ("alternativeFor") REFERENCES "public"."MasterPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MantItemPart" ADD CONSTRAINT "MantItemPart_mantItemId_fkey" FOREIGN KEY ("mantItemId") REFERENCES "public"."MantItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MantItemPart" ADD CONSTRAINT "MantItemPart_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "public"."MasterPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "public"."WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "public"."MasterPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES "public"."WorkOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "public"."MasterPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartPriceHistory" ADD CONSTRAINT "PartPriceHistory_purchasedBy_fkey" FOREIGN KEY ("purchasedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoicePayment" ADD CONSTRAINT "InvoicePayment_registeredBy_fkey" FOREIGN KEY ("registeredBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PartCompatibility" ADD CONSTRAINT "PartCompatibility_masterPartId_fkey" FOREIGN KEY ("masterPartId") REFERENCES "public"."MasterPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
