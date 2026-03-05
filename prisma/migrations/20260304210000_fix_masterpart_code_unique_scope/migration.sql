-- Migration: fix-masterpart-code-unique-scope
-- Remove global unique constraint on MasterPart.code
-- Add scoped unique constraint (tenantId, code) to allow tenant copies of global parts

-- Step 1: Drop the existing global unique index on code (Prisma creates @unique as an index)
DROP INDEX IF EXISTS "MasterPart_code_key";
ALTER TABLE "MasterPart" DROP CONSTRAINT IF EXISTS "MasterPart_code_key";

-- Step 2: Add scoped unique constraint (tenantId, code)
-- PostgreSQL treats NULL != NULL in unique indexes, so:
--   (null, "BOSCH-OIL-FILTER") and ("org_xxx", "BOSCH-OIL-FILTER") are both allowed.
CREATE UNIQUE INDEX IF NOT EXISTS "MasterPart_tenantId_code_key" ON "MasterPart"("tenantId", "code");
