-- Generated offline; review before publication.
CREATE TABLE "PanelAttentionClient" (
    "ownerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PanelAttentionClient_pkey" PRIMARY KEY ("ownerId", "companyId")
);

CREATE INDEX "PanelAttentionClient_companyId_idx" ON "PanelAttentionClient"("companyId");

ALTER TABLE "PanelAttentionClient"
ADD CONSTRAINT "PanelAttentionClient_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PanelAttentionClient"
ADD CONSTRAINT "PanelAttentionClient_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PanelAttentionClient" ENABLE ROW LEVEL SECURITY;
