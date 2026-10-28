import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { projectLegacyPayloadSchema, type ProjectLegacyRecord } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
const include = { batch: true } as const;
const record = (row: Prisma.ProjectPlanningLegacyRecordGetPayload<{ include: typeof include }>): ProjectLegacyRecord => ({
    ...projectLegacyPayloadSchema.parse(row.payload), id: row.id, sourceId: row.sourceId,
    source: { name: row.batch.sourceName, sha256: row.batch.sourceSha256, importedAt: row.batch.importedAt.toISOString() },
});
@Injectable()
export class ProjectLegacyService {
    constructor(private readonly prisma: PrismaService) {}
    async list(page: number, limit: number) {
        const [rows, total] = await this.prisma.retry(() => this.prisma.$transaction([
            this.prisma.projectPlanningLegacyRecord.findMany({ include, orderBy: { id: 'asc' }, skip: (page - 1) * limit, take: limit }),
            this.prisma.projectPlanningLegacyRecord.count(),
        ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
        return { data: rows.map(record), total, page, limit };
    }
    async find(id: string) {
        const row = await this.prisma.retry(() => this.prisma.projectPlanningLegacyRecord.findUnique({ where: { id }, include }));
        if (!row) throw new NotFoundException('Registro legado não encontrado');
        return record(row);
    }
}
