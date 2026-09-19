-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProjectService" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "markerId" TEXT,
    "type" TEXT NOT NULL,
    "urgency" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#ABFF10',
    "mapsUrl" TEXT,
    "notes" TEXT,
    "sectors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiresTravel" BOOLEAN NOT NULL DEFAULT false,
    "relevant" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectServiceMarker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectServiceMarker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectServiceInternal" (
    "serviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ProjectServiceInternal_pkey" PRIMARY KEY ("serviceId","userId")
);

-- CreateTable
CREATE TABLE "ProjectServiceContractor" (
    "serviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ProjectServiceContractor_pkey" PRIMARY KEY ("serviceId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectService_projectId_key" ON "ProjectService"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectService_scheduleId_key" ON "ProjectService"("scheduleId");

-- CreateIndex
CREATE INDEX "ProjectService_urgency_createdAt_idx" ON "ProjectService"("urgency", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectServiceMarker_nameKey_key" ON "ProjectServiceMarker"("nameKey");

-- CreateIndex
CREATE INDEX "ProjectServiceInternal_userId_idx" ON "ProjectServiceInternal"("userId");

-- CreateIndex
CREATE INDEX "ProjectServiceContractor_userId_idx" ON "ProjectServiceContractor"("userId");

-- AddForeignKey
ALTER TABLE "ProjectService" ADD CONSTRAINT "ProjectService_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectService" ADD CONSTRAINT "ProjectService_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectService" ADD CONSTRAINT "ProjectService_markerId_fkey" FOREIGN KEY ("markerId") REFERENCES "ProjectServiceMarker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectServiceInternal" ADD CONSTRAINT "ProjectServiceInternal_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ProjectService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectServiceInternal" ADD CONSTRAINT "ProjectServiceInternal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectServiceContractor" ADD CONSTRAINT "ProjectServiceContractor_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ProjectService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectServiceContractor" ADD CONSTRAINT "ProjectServiceContractor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ContractorUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- New tables are accessible through the server owner only, not Supabase anon/authenticated.
ALTER TABLE "ProjectService" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectServiceMarker" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectServiceInternal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectServiceContractor" ENABLE ROW LEVEL SECURITY;
