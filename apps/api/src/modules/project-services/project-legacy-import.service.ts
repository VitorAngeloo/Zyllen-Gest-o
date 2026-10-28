import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { z } from 'zod';
import { projectLegacyPayloadSchema } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
const snapshotSchema = z.object({
    sourceName: z.string().min(1).max(200), sourceSha256: z.string().regex(/^[a-f0-9]{64}$/), artifactSha256: z.string().regex(/^[a-f0-9]{64}$/),
    importedBy: z.string().min(1).max(200),
    rows: z.array(z.object({ id: z.string().uuid(), sourceId: z.string().min(1), payload: projectLegacyPayloadSchema, rawSource: z.record(z.unknown()) }).strict()).min(1).max(10000),
}).strict().superRefine((input, ctx) => {
    if (new Set(input.rows.map(row => row.id)).size !== input.rows.length || new Set(input.rows.map(row => row.sourceId)).size !== input.rows.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Identidades de origem duplicadas' });
});
const canonical = (input: unknown): string => input && typeof input === 'object' ? Array.isArray(input) ? `[${input.map(canonical).join(',')}]`
    : `{${Object.keys(input).sort().map(key => `${JSON.stringify(key)}:${canonical((input as Record<string, unknown>)[key])}`).join(',')}}` : JSON.stringify(input);
@Injectable()
export class ProjectLegacyImportService {
    constructor(private readonly prisma: PrismaService) {}
    /** Reviewed release CLI only; no HTTP import route exists. */
    async importSnapshot(value: unknown) {
        const input = snapshotSchema.parse(value);
        const rows = input.rows.map(row => ({ ...row, payloadSha256: createHash('sha256').update(canonical({ payload: row.payload, rawSource: row.rawSource })).digest('hex') }));
        return this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'project-planning-legacy-import'}))`;
            const previous = await tx.projectPlanningLegacyImport.findUnique({
                where: { sourceSha256: input.sourceSha256 }, include: { records: { select: { id: true, payloadSha256: true } } },
            });
            if (previous) {
                const hashes = new Map(previous.records.map(row => [row.id, row.payloadSha256]));
                if (previous.artifactSha256 !== input.artifactSha256 || hashes.size !== rows.length || rows.some(row => hashes.get(row.id) !== row.payloadSha256)) throw new ConflictException('Fonte já importada com conteúdo diferente');
                return { id: previous.id, records: rows.length, alreadyImported: true };
            }
            if (await tx.projectPlanningLegacyRecord.count({ where: { id: { in: rows.map(row => row.id) } } })) throw new ConflictException('Identidade de origem usada por outro retrato; nenhuma sobrescrita foi realizada');
            const batch = await tx.projectPlanningLegacyImport.create({ data: { sourceName: input.sourceName, sourceSha256: input.sourceSha256, artifactSha256: input.artifactSha256, importedBy: input.importedBy } });
            // Bound query size while retaining one atomic transaction for the snapshot.
            for (let offset = 0; offset < rows.length; offset += 25) {
                await tx.projectPlanningLegacyRecord.createMany({ data: rows.slice(offset, offset + 25).map(row => ({ id: row.id, importId: batch.id, sourceId: row.sourceId, payloadSha256: row.payloadSha256,
                    payload: row.payload, rawSource: row.rawSource as Prisma.InputJsonObject })) });
            }
            return { id: batch.id, records: rows.length, alreadyImported: false };
        }, { timeout: 60000 });
    }
}
