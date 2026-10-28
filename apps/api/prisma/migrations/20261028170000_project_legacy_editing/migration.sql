-- CreateTable
CREATE TABLE "ProjectPlanningLegacyEdit" (
    "recordId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT NOT NULL,

    CONSTRAINT "ProjectPlanningLegacyEdit_pkey" PRIMARY KEY ("recordId")
);

-- AddForeignKey
ALTER TABLE "ProjectPlanningLegacyEdit" ADD CONSTRAINT "ProjectPlanningLegacyEdit_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "ProjectPlanningLegacyRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPlanningLegacyEdit" ADD CONSTRAINT "ProjectPlanningLegacyEdit_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "ProjectPlanningLegacyEdit" ADD CONSTRAINT "ProjectPlanningLegacyEdit_version_positive" CHECK ("version" > 0);
ALTER TABLE "ProjectPlanningLegacyEdit" ENABLE ROW LEVEL SECURITY;
