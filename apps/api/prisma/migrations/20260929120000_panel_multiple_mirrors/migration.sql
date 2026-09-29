-- Generated offline; review before publication.
-- Preserve every existing mirror while allowing an owner to keep more than one active address.
DROP INDEX "PanelMirror_ownerId_key";

CREATE INDEX "PanelMirror_ownerId_revokedAt_idx" ON "PanelMirror"("ownerId", "revokedAt");
