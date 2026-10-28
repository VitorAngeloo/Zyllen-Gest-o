import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { projectLegacyData, projectLegacyDataSchema, projectLegacyPayloadSchema, type ProjectLegacyPayload, type ProjectLegacyUpdate,
    type ProjectPendingCreate, type ProjectPendingUpdate, type ProjectNoteCreate, type projectPlanningChangeSchema, type projectObservationsChangeSchema, type projectLegacyCancellationSchema } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { legacyInclude, legacyRecord } from './project-legacy-record';

@Injectable()
export class ProjectLegacyEditingService {
    constructor(private readonly prisma: PrismaService) {}
    private async mutate(id: string, actorId: string, action: string, change: (current: ProjectLegacyPayload, version: number, actor: string, stamp: string) => ProjectLegacyPayload, reason = '') {
        return this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "ProjectPlanningLegacyRecord" WHERE id = ${id} FOR UPDATE`;
            const row = await tx.projectPlanningLegacyRecord.findUnique({ where: { id }, include: legacyInclude });
            if (!row) throw new NotFoundException('Registro importado não encontrado');
            const actor = await tx.internalUser.findUniqueOrThrow({ where: { id: actorId }, select: { name: true } });
            const current = projectLegacyPayloadSchema.parse(row.edit?.payload ?? row.payload), version = row.edit?.version ?? 0;
            const next = projectLegacyPayloadSchema.parse(change(structuredClone(current), version, actor.name, new Date().toISOString()));
            if (JSON.stringify(current) === JSON.stringify(next)) return legacyRecord(row);
            if (next.planning.stage === 'cancelado' && current.planning.stage !== 'cancelado' && reason.trim().length < 5) throw new BadRequestException('Informe a justificativa do cancelamento');
            await tx.projectPlanningLegacyEdit.upsert({ where: { recordId: id }, create: { recordId: id, payload: next, version: 1, updatedById: actorId },
                update: { payload: next, version: { increment: 1 }, updatedById: actorId } });
            await tx.auditLog.create({ data: { entityType: 'ProjectPlanningLegacyRecord', entityId: id, userId: actorId, action,
                details: { previous: current, next, previousVersion: version, version: version + 1, ...(reason ? { reason } : {}) } as Prisma.InputJsonObject } });
            return legacyRecord(await tx.projectPlanningLegacyRecord.findUniqueOrThrow({ where: { id }, include: legacyInclude }));
        });
    }
    async update(id: string, input: ProjectLegacyUpdate, actorId: string) {
        return this.mutate(id, actorId, 'PROJECT_LEGACY_UPDATE', (current, version) => {
            if (version !== input.expectedVersion) throw new ConflictException('O registro mudou. Atualize o card antes de editar. Seu preenchimento foi preservado.');
            const data = projectLegacyDataSchema.parse(input.data);
            if (current.start && data.start && current.start !== data.start && !data.original) data.original = current.start;
            return { ...current, ...data };
        }, input.reason);
    }
    async planning(id: string, input: z.infer<typeof projectPlanningChangeSchema>, actorId: string) {
        return this.mutate(id, actorId, 'PROJECT_LEGACY_PLANNING', current => {
            if (JSON.stringify(current.planning) !== JSON.stringify(input.expected)) throw new ConflictException('O planejamento mudou. Atualize o card antes de editar.');
            const parsed = projectLegacyDataSchema.safeParse({ ...projectLegacyData(current), planning: input.next ?? { stage: null, forecast: null } });
            if (!parsed.success) throw new BadRequestException(parsed.error.issues.map(item => item.message).join('. '));
            return { ...current, planning: parsed.data.planning };
        });
    }
    async observations(id: string, input: z.infer<typeof projectObservationsChangeSchema>, actorId: string) {
        return this.mutate(id, actorId, 'PROJECT_LEGACY_OBSERVATIONS', current => {
            if (current.notes !== (input.expected ?? '')) throw new ConflictException('As observações mudaram. Atualize o card antes de editar.');
            return { ...current, notes: input.next };
        });
    }
    async cancel(id: string, input: z.infer<typeof projectLegacyCancellationSchema>, actorId: string) {
        return this.mutate(id, actorId, 'PROJECT_LEGACY_CANCEL', current => {
            if (current.planning.stage === 'cancelado') return current;
            if (current.planning.stage !== input.expectedStage) throw new ConflictException('O status mudou. Atualize o card antes de cancelar.');
            return { ...current, planning: { ...current.planning, stage: 'cancelado' } };
        }, input.reason);
    }
    async addPending(id: string, input: ProjectPendingCreate, actorId: string) {
        return this.mutate(id, actorId, 'PROJECT_LEGACY_PENDING_CREATE', (current, _version, actor, stamp) => {
            const existing = current.pending.find(item => item.sourceId === input.id);
            if (existing) {
                if (existing.type !== input.type || existing.responsible !== input.responsible || existing.deadline !== input.deadline || existing.detail !== input.detail) throw new ConflictException('Essa pendência já foi registrada com outros dados.');
                return current;
            }
            current.pending.push({ sourceId: input.id, type: input.type, responsible: input.responsible, deadline: input.deadline, detail: input.detail,
                open: true, createdAt: stamp, createdBy: actor, resolvedAt: '', resolvedBy: '', version: 0 });
            return current;
        });
    }
    async updatePending(id: string, pendingId: string, input: ProjectPendingUpdate, actorId: string) {
        return this.mutate(id, actorId, 'PROJECT_LEGACY_PENDING_UPDATE', current => {
            const item = current.pending.find(pending => pending.sourceId === pendingId);
            if (!item) throw new NotFoundException('Pendência não encontrada');
            if (!item.open || (item.version ?? 0) !== input.expectedVersion) throw new ConflictException('A pendência mudou. Atualize o card antes de editar.');
            Object.assign(item, { type: input.type, responsible: input.responsible, deadline: input.deadline, detail: input.detail, version: (item.version ?? 0) + 1 });
            return current;
        });
    }
    async resolvePending(id: string, pendingId: string, expectedVersion: number, actorId: string) {
        return this.mutate(id, actorId, 'PROJECT_LEGACY_PENDING_RESOLVE', (current, _version, actor, stamp) => {
            const item = current.pending.find(pending => pending.sourceId === pendingId);
            if (!item) throw new NotFoundException('Pendência não encontrada');
            if (!item.open) return current;
            if ((item.version ?? 0) !== expectedVersion) throw new ConflictException('A pendência mudou. Atualize o card antes de resolver.');
            Object.assign(item, { open: false, version: expectedVersion + 1, resolvedAt: stamp, resolvedBy: actor });
            return current;
        });
    }
    async addNote(id: string, input: ProjectNoteCreate, actorId: string) {
        return this.mutate(id, actorId, 'PROJECT_LEGACY_NOTE_CREATE', (current, _version, actor, stamp) => {
            const existing = current.annotations.find(item => item.sourceId === input.id);
            if (existing) { if (existing.text !== input.text) throw new ConflictException('Essa anotação já foi registrada com outro texto.'); return current; }
            current.annotations.push({ sourceId: input.id, date: stamp, author: actor, text: input.text });
            return current;
        });
    }
}
