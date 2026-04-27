-- Add persistent sequence table for non-reusable sequential asset codes
CREATE TABLE "AssetCodeSequence" (
    "id" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetCodeSequence_pkey" PRIMARY KEY ("id")
);
