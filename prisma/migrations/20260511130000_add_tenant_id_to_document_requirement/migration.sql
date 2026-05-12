-- AddColumn: tenantId (nullable) to DocumentRequirement
ALTER TABLE "DocumentRequirement" ADD COLUMN "tenantId" TEXT;

-- DropIndex: old unique constraint (documentTypeId, vehicleTypeId)
DROP INDEX "DocumentRequirement_documentTypeId_vehicleTypeId_key";

-- CreateIndex: new three-column unique constraint
CREATE UNIQUE INDEX "DocumentRequirement_tenantId_documentTypeId_vehicleTypeId_key" ON "DocumentRequirement"("tenantId", "documentTypeId", "vehicleTypeId");

-- CreateIndex: tenantId index for compliance query performance
CREATE INDEX "DocumentRequirement_tenantId_idx" ON "DocumentRequirement"("tenantId");

-- AddForeignKey: tenantId -> Tenant.id with CASCADE delete
ALTER TABLE "DocumentRequirement" ADD CONSTRAINT "DocumentRequirement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
