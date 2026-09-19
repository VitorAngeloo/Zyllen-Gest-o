-- Generated offline by schema diff. Apply after reviewing all pending migrations.
-- CreateTable
CREATE TABLE "StockMinimum" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "minimum" INTEGER NOT NULL,
    "highOutputThreshold" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockMinimum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMinimum_locationId_idx" ON "StockMinimum"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMinimum_skuId_locationId_key" ON "StockMinimum"("skuId", "locationId");

-- AddForeignKey
ALTER TABLE "StockMinimum" ADD CONSTRAINT "StockMinimum_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SkuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMinimum" ADD CONSTRAINT "StockMinimum_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Minimums are only accessed through the authenticated server; no public policies.
ALTER TABLE "StockMinimum" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockMinimum" ADD CONSTRAINT "StockMinimum_values_check" CHECK (minimum >= 0 AND ("highOutputThreshold" IS NULL OR "highOutputThreshold" > 0));
