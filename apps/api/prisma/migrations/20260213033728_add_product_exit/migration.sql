-- CreateTable
CREATE TABLE "ProductExit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "skuId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductExit_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SkuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductExit_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductExit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "InternalUser" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
