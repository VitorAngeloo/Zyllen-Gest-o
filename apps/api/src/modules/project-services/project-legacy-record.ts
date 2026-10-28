import { Prisma } from '@prisma/client';
import { projectLegacyPayloadSchema, type ProjectLegacyRecord } from '@zyllen/shared';

export const legacyInclude = { batch: true, edit: { include: { updatedBy: { select: { name: true } } } } } as const;
export function legacyRecord(row: Prisma.ProjectPlanningLegacyRecordGetPayload<{ include: typeof legacyInclude }>): ProjectLegacyRecord {
    return { ...projectLegacyPayloadSchema.parse(row.edit?.payload ?? row.payload), id: row.id, sourceId: row.sourceId,
        source: { name: row.batch.sourceName, sha256: row.batch.sourceSha256, importedAt: row.batch.importedAt.toISOString() },
        editingAvailable: true, version: row.edit?.version ?? 0, editedAt: row.edit?.updatedAt.toISOString() ?? null, editedBy: row.edit?.updatedBy.name ?? null };
}
