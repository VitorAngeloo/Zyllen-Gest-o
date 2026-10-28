-- CreateTable
CREATE TABLE "ProjectPlanningLegacyImport" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceSha256" TEXT NOT NULL,
    "artifactSha256" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importedBy" TEXT NOT NULL,

    CONSTRAINT "ProjectPlanningLegacyImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPlanningLegacyRecord" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "payloadSha256" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "rawSource" JSONB NOT NULL,

    CONSTRAINT "ProjectPlanningLegacyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPlanningLegacyImport_sourceSha256_key" ON "ProjectPlanningLegacyImport"("sourceSha256");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPlanningLegacyRecord_importId_sourceId_key" ON "ProjectPlanningLegacyRecord"("importId", "sourceId");

-- AddForeignKey
ALTER TABLE "ProjectPlanningLegacyRecord" ADD CONSTRAINT "ProjectPlanningLegacyRecord_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ProjectPlanningLegacyImport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectPlanningLegacyImport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectPlanningLegacyRecord" ENABLE ROW LEVEL SECURITY;
