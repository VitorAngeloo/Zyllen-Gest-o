-- CreateTable
CREATE TABLE "ItemMediaAttachment" (
    "id" TEXT NOT NULL,
    "skuId" TEXT,
    "stockMovementId" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemMediaAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemMediaAttachment_skuId_idx" ON "ItemMediaAttachment"("skuId");

-- CreateIndex
CREATE INDEX "ItemMediaAttachment_stockMovementId_idx" ON "ItemMediaAttachment"("stockMovementId");

-- CreateIndex
CREATE INDEX "ItemMediaAttachment_uploadedById_idx" ON "ItemMediaAttachment"("uploadedById");

-- AddForeignKey
ALTER TABLE "ItemMediaAttachment" ADD CONSTRAINT "ItemMediaAttachment_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SkuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMediaAttachment" ADD CONSTRAINT "ItemMediaAttachment_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMediaAttachment" ADD CONSTRAINT "ItemMediaAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ensure each attachment belongs to at least one context
ALTER TABLE "ItemMediaAttachment"
ADD CONSTRAINT "ItemMediaAttachment_context_check"
CHECK ("skuId" IS NOT NULL OR "stockMovementId" IS NOT NULL);
