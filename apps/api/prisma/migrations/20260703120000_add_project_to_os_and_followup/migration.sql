-- AlterTable: MaintenanceOS — optional project link
ALTER TABLE "MaintenanceOS" ADD COLUMN "projectId" TEXT;

-- AlterTable: Followup — optional project link
ALTER TABLE "Followup" ADD COLUMN "projectId" TEXT;

-- CreateIndex
CREATE INDEX "MaintenanceOS_projectId_idx" ON "MaintenanceOS"("projectId");

-- CreateIndex
CREATE INDEX "Followup_projectId_idx" ON "Followup"("projectId");

-- AddForeignKey
ALTER TABLE "MaintenanceOS" ADD CONSTRAINT "MaintenanceOS_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Followup" ADD CONSTRAINT "Followup_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
