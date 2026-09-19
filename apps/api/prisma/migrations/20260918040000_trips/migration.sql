-- Generated offline by schema diff. Apply after reviewing all pending migrations.
-- AlterTable
ALTER TABLE "ProjectService" ADD COLUMN     "tripId" TEXT;

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "originState" TEXT NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "destinationState" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripContractor" (
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TripContractor_pkey" PRIMARY KEY ("tripId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trip_scheduleId_key" ON "Trip"("scheduleId");

-- CreateIndex
CREATE INDEX "TripContractor_userId_idx" ON "TripContractor"("userId");

-- CreateIndex
CREATE INDEX "ProjectService_tripId_idx" ON "ProjectService"("tripId");

-- AddForeignKey
ALTER TABLE "ProjectService" ADD CONSTRAINT "ProjectService_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripContractor" ADD CONSTRAINT "TripContractor_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripContractor" ADD CONSTRAINT "TripContractor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ContractorUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Trips are only accessed through the authenticated server; no public policies.
ALTER TABLE "Trip" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TripContractor" ENABLE ROW LEVEL SECURITY;
