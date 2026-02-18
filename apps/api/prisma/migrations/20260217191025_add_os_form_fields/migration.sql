/*
  Warnings:

  - The required column `osNumber` was added to the `MaintenanceOS` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MaintenanceOS" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "osNumber" TEXT NOT NULL,
    "formType" TEXT NOT NULL DEFAULT 'TERCEIRIZADO',
    "assetId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedById" TEXT,
    "openedByContractorId" TEXT,
    "closedById" TEXT,
    "notes" TEXT,
    "formData" TEXT,
    "clientName" TEXT,
    "clientCity" TEXT,
    "clientState" TEXT,
    "scheduledDate" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceOS_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceOS_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "InternalUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceOS_openedByContractorId_fkey" FOREIGN KEY ("openedByContractorId") REFERENCES "ContractorUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceOS_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "InternalUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MaintenanceOS" ("assetId", "closedById", "createdAt", "id", "notes", "openedByContractorId", "openedById", "status", "updatedAt") SELECT "assetId", "closedById", "createdAt", "id", "notes", "openedByContractorId", "openedById", "status", "updatedAt" FROM "MaintenanceOS";
DROP TABLE "MaintenanceOS";
ALTER TABLE "new_MaintenanceOS" RENAME TO "MaintenanceOS";
CREATE UNIQUE INDEX "MaintenanceOS_osNumber_key" ON "MaintenanceOS"("osNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
