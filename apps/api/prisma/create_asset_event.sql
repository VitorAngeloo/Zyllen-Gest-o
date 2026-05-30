CREATE TABLE IF NOT EXISTS "AssetEvent" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "assetId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdByInternalUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetEvent_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AssetEvent_assetId_fkey'
  ) THEN
    ALTER TABLE "AssetEvent" ADD CONSTRAINT "AssetEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AssetEvent_createdByInternalUserId_fkey'
  ) THEN
    ALTER TABLE "AssetEvent" ADD CONSTRAINT "AssetEvent_createdByInternalUserId_fkey" FOREIGN KEY ("createdByInternalUserId") REFERENCES "InternalUser"("id") ON UPDATE CASCADE;
  END IF;
END $$;
