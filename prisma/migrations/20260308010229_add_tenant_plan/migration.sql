-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('STARTER', 'GROWTH', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "plan" "TenantPlan" NOT NULL DEFAULT 'ENTERPRISE';
