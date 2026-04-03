-- Migration: mant-item-model-cleanup
-- 1. Migrate ACTION → SERVICE on MantItem
-- 2. Migrate ACTION → SERVICE on MantItemRequest
-- 3. Recreate ItemType enum without ACTION
-- 4. Drop mantType column from MantItem and MantItemRequest

-- Step 1: Migrate existing ACTION rows to SERVICE
UPDATE "MantItem" SET "type" = 'SERVICE' WHERE "type" = 'ACTION';
UPDATE "MantItemRequest" SET "type" = 'SERVICE' WHERE "type" = 'ACTION';

-- Step 2: Recreate ItemType enum without ACTION
ALTER TYPE "ItemType" RENAME TO "ItemType_old";
CREATE TYPE "ItemType" AS ENUM ('PART', 'SERVICE');

ALTER TABLE "MantItem"
  ALTER COLUMN "type" DROP DEFAULT,
  ALTER COLUMN "type" TYPE "ItemType" USING "type"::text::"ItemType",
  ALTER COLUMN "type" SET DEFAULT 'SERVICE';

ALTER TABLE "MantItemRequest"
  ALTER COLUMN "type" DROP DEFAULT,
  ALTER COLUMN "type" TYPE "ItemType" USING "type"::text::"ItemType",
  ALTER COLUMN "type" SET DEFAULT 'SERVICE';

DROP TYPE "ItemType_old";

-- Step 3: Drop mantType from MantItem
ALTER TABLE "MantItem" DROP COLUMN IF EXISTS "mantType";

-- Step 4: Drop mantType from MantItemRequest
ALTER TABLE "MantItemRequest" DROP COLUMN IF EXISTS "mantType";
