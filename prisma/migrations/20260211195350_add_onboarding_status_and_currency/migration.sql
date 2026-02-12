-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'PROFILE_COMPLETED', 'FLEET_CONFIGURED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'COP',
ADD COLUMN     "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'PENDING';
