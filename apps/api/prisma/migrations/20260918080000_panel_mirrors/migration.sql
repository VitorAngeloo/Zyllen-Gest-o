-- Generated offline; review before publication.
-- CreateTable
CREATE TABLE "PanelMirror" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "views" TEXT[],
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PanelMirror_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PanelMirror_ownerId_key" ON "PanelMirror"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "PanelMirror_tokenHash_key" ON "PanelMirror"("tokenHash");

-- AddForeignKey
ALTER TABLE "PanelMirror" ADD CONSTRAINT "PanelMirror_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "InternalUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "PanelMirror" ENABLE ROW LEVEL SECURITY;
