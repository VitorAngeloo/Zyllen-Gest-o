-- Generated offline by schema diff. Apply after reviewing all pending migrations.
-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "isMainWarehouse" BOOLEAN,
ADD COLUMN     "kind" TEXT,
ADD COLUMN     "projectId" TEXT;

-- CreateTable
CREATE TABLE "InventoryTransfer" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "movementTypeId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "approvalRequestId" TEXT,
    "reason" TEXT NOT NULL,
    "returnStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransferItem" (
    "transferId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "movementId" TEXT,

    CONSTRAINT "InventoryTransferItem_pkey" PRIMARY KEY ("transferId","assetId")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransfer_approvalRequestId_key" ON "InventoryTransfer"("approvalRequestId");

-- CreateIndex
CREATE INDEX "InventoryTransfer_requestedById_createdAt_idx" ON "InventoryTransfer"("requestedById", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryTransfer_status_idx" ON "InventoryTransfer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransferItem_movementId_key" ON "InventoryTransferItem"("movementId");

-- CreateIndex
CREATE INDEX "InventoryTransferItem_assetId_idx" ON "InventoryTransferItem"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_isMainWarehouse_key" ON "Location"("isMainWarehouse");

-- CreateIndex
CREATE INDEX "Location_companyId_idx" ON "Location"("companyId");

-- CreateIndex
CREATE INDEX "Location_projectId_idx" ON "Location"("projectId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_movementTypeId_fkey" FOREIGN KEY ("movementTypeId") REFERENCES "MovementType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransferItem" ADD CONSTRAINT "InventoryTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "InventoryTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransferItem" ADD CONSTRAINT "InventoryTransferItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransferItem" ADD CONSTRAINT "InventoryTransferItem_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "StockMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Structured custody is only accessed through the authenticated server; no public policies.
ALTER TABLE "InventoryTransfer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryTransferItem" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Location" ADD CONSTRAINT "Location_custody_check" CHECK (COALESCE((kind IS NULL AND "companyId" IS NULL AND "projectId" IS NULL AND "isMainWarehouse" IS NULL) OR (kind = 'INTERNAL' AND "companyId" IS NULL AND "projectId" IS NULL AND ("isMainWarehouse" IS NULL OR "isMainWarehouse" = true)) OR (kind = 'CLIENT' AND "companyId" IS NOT NULL AND "isMainWarehouse" IS NULL), false));
