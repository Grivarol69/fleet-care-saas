-- CreateTable
CREATE TABLE "ProcessedWebhookEvent" (
    "svixId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("svixId")
);

-- CreateIndex
CREATE INDEX "ProcessedWebhookEvent_processedAt_idx" ON "ProcessedWebhookEvent"("processedAt");
