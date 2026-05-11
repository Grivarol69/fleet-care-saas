-- DropColumn: isMandatory from DocumentRequirement
-- The existence of a row is the requirement definition — no boolean flag is needed.
ALTER TABLE "DocumentRequirement" DROP COLUMN "isMandatory";
