-- Link one existing followup to the operational project without rewriting historical followups.
ALTER TABLE "ProjectService" ADD COLUMN "followupId" TEXT;

CREATE UNIQUE INDEX "ProjectService_followupId_key" ON "ProjectService"("followupId");

ALTER TABLE "ProjectService" ADD CONSTRAINT "ProjectService_followupId_fkey"
    FOREIGN KEY ("followupId") REFERENCES "Followup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
