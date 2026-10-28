-- CreateTable
CREATE TABLE "ProjectServicePending" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "responsible" TEXT NOT NULL DEFAULT '',
    "deadline" TEXT,
    "detail" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,

    CONSTRAINT "ProjectServicePending_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectServiceNote" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "ProjectServiceNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectServicePending_serviceId_resolvedAt_createdAt_idx" ON "ProjectServicePending"("serviceId", "resolvedAt", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectServiceNote_serviceId_createdAt_idx" ON "ProjectServiceNote"("serviceId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectServicePending" ADD CONSTRAINT "ProjectServicePending_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ProjectService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectServicePending" ADD CONSTRAINT "ProjectServicePending_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectServicePending" ADD CONSTRAINT "ProjectServicePending_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectServiceNote" ADD CONSTRAINT "ProjectServiceNote_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ProjectService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectServiceNote" ADD CONSTRAINT "ProjectServiceNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectServicePending" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectServiceNote" ENABLE ROW LEVEL SECURITY;
