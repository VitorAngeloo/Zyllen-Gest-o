-- AlterTable
ALTER TABLE "FollowupChecklistItem" ADD COLUMN     "quantity" INTEGER;

-- CreateTable
CREATE TABLE "FollowupChecklistCatalogItem" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowupChecklistCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FollowupChecklistCatalogItem_normalizedText_key" ON "FollowupChecklistCatalogItem"("normalizedText");

ALTER TABLE "FollowupChecklistItem" ADD CONSTRAINT "FollowupChecklistItem_quantity_positive"
    CHECK ("quantity" IS NULL OR "quantity" > 0);

ALTER TABLE "FollowupChecklistCatalogItem" ENABLE ROW LEVEL SECURITY;

-- Requested initial catalog: copy labels from every existing checklist without
-- changing the original entries, details, completion state or quantities.
WITH labels AS (
    SELECT btrim(regexp_replace("text", '[[:space:]]+', ' ', 'g')) AS "text",
           "createdAt", "id"
    FROM "FollowupChecklistItem"
), unique_labels AS (
    SELECT DISTINCT ON (lower("text")) "text", lower("text") AS "normalizedText"
    FROM labels
    WHERE length("text") > 0
    ORDER BY lower("text"), "createdAt", "id"
)
INSERT INTO "FollowupChecklistCatalogItem" ("id", "text", "normalizedText", "updatedAt")
SELECT gen_random_uuid()::text, "text", "normalizedText", CURRENT_TIMESTAMP
FROM unique_labels
ON CONFLICT ("normalizedText") DO NOTHING;

