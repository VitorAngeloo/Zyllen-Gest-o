-- AlterTable
ALTER TABLE "InternalUser" ADD COLUMN "description" TEXT;
ALTER TABLE "InternalUser" ADD COLUMN "sector" TEXT;

-- CreateTable
CREATE TABLE "ContractorUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExternalUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "state" TEXT,
    "position" TEXT,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExternalUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ExternalUser" ("companyId", "createdAt", "email", "id", "name", "passwordHash", "updatedAt") SELECT "companyId", "createdAt", "email", "id", "name", "passwordHash", "updatedAt" FROM "ExternalUser";
DROP TABLE "ExternalUser";
ALTER TABLE "new_ExternalUser" RENAME TO "ExternalUser";
CREATE UNIQUE INDEX "ExternalUser_email_key" ON "ExternalUser"("email");
CREATE TABLE "new_MaintenanceOS" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedById" TEXT,
    "openedByContractorId" TEXT,
    "closedById" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MaintenanceOS_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceOS_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "InternalUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceOS_openedByContractorId_fkey" FOREIGN KEY ("openedByContractorId") REFERENCES "ContractorUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MaintenanceOS_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "InternalUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MaintenanceOS" ("assetId", "closedById", "createdAt", "id", "notes", "openedById", "status", "updatedAt") SELECT "assetId", "closedById", "createdAt", "id", "notes", "openedById", "status", "updatedAt" FROM "MaintenanceOS";
DROP TABLE "MaintenanceOS";
ALTER TABLE "new_MaintenanceOS" RENAME TO "MaintenanceOS";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ContractorUser_email_key" ON "ContractorUser"("email");
