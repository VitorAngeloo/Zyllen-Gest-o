-- Generated offline; review with all pending migrations before publication.
-- AlterTable
ALTER TABLE "ProjectService" ADD COLUMN     "removalCycleId" TEXT;

-- CreateTable
CREATE TABLE "OperationalStructure" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StructureCycle" (
    "id" TEXT NOT NULL,
    "structureId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StructureCycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationalStructure_companyId_nameKey_key" ON "OperationalStructure"("companyId", "nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "StructureCycle_installationId_key" ON "StructureCycle"("installationId");

-- CreateIndex
CREATE INDEX "StructureCycle_structureId_createdAt_idx" ON "StructureCycle"("structureId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectService_removalCycleId_idx" ON "ProjectService"("removalCycleId");

-- AddForeignKey
ALTER TABLE "ProjectService" ADD CONSTRAINT "ProjectService_removalCycleId_fkey" FOREIGN KEY ("removalCycleId") REFERENCES "StructureCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalStructure" ADD CONSTRAINT "OperationalStructure_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StructureCycle" ADD CONSTRAINT "StructureCycle_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "OperationalStructure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StructureCycle" ADD CONSTRAINT "StructureCycle_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "ProjectService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "OperationalStructure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StructureCycle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OperationalStructure" ADD CONSTRAINT "OperationalStructure_kind_check" CHECK (kind IN ('ROOM','TOTEM','OTHER'));
