-- RemoveTable: MantItemPart (legacy junction, superseded by MantItemVehiclePart)
DELETE FROM "MantItemPart";
DROP INDEX IF EXISTS "MantItemPart_mantItemId_masterPartId_key";
DROP INDEX IF EXISTS "MantItemPart_mantItemId_idx";
DROP INDEX IF EXISTS "MantItemPart_masterPartId_idx";
ALTER TABLE "MantItemPart" DROP CONSTRAINT IF EXISTS "MantItemPart_mantItemId_fkey";
ALTER TABLE "MantItemPart" DROP CONSTRAINT IF EXISTS "MantItemPart_masterPartId_fkey";
DROP TABLE "MantItemPart";
