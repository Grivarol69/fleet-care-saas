-- CreateTable
CREATE TABLE "WatchdogConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT,
    "threshold" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchdogConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatchdogConfiguration_tenantId_idx" ON "WatchdogConfiguration"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchdogConfiguration_tenantId_category_key" ON "WatchdogConfiguration"("tenantId", "category");

-- AddForeignKey
ALTER TABLE "WatchdogConfiguration" ADD CONSTRAINT "WatchdogConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
