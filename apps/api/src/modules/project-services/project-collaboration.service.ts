import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ProjectNoteCreate, ProjectPendingCreate, ProjectPendingUpdate } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class ProjectCollaborationService {
    constructor(private readonly prisma: PrismaService) {}
    private async lock(tx: Prisma.TransactionClient, serviceId: string) {
        const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "ProjectService" WHERE id = ${serviceId} FOR UPDATE`;
        if (!rows.length) throw new NotFoundException('Projeto operacional não encontrado');
    }
    private async audit(tx: Prisma.TransactionClient, serviceId: string, actorId: string, action: string, details: Prisma.InputJsonObject) {
        await tx.auditLog.create({ data: { entityType: 'ProjectService', entityId: serviceId, userId: actorId, action, details } });
    }
    async addPending(serviceId: string, input: ProjectPendingCreate, actorId: string) {
        return this.prisma.$transaction(async tx => {
            await this.lock(tx, serviceId);
            const existing = await tx.projectServicePending.findUnique({ where: { id: input.id } });
            if (existing) {
                if (existing.serviceId === serviceId && existing.createdById === actorId && existing.type === input.type && existing.responsible === input.responsible && existing.deadline === input.deadline && existing.detail === input.detail) return { id: existing.id };
                throw new ConflictException('Esta solicitação já foi utilizada. Atualize o card antes de continuar.');
            }
            const pending = await tx.projectServicePending.create({ data: { ...input, serviceId, createdById: actorId } });
            await this.audit(tx, serviceId, actorId, 'PROJECT_PENDING_CREATE', { pendingId: pending.id, type: input.type, responsible: input.responsible, deadline: input.deadline, detail: input.detail });
            return { id: pending.id };
        });
    }
    async updatePending(serviceId: string, pendingId: string, input: ProjectPendingUpdate, actorId: string) {
        return this.prisma.$transaction(async tx => {
            await this.lock(tx, serviceId);
            const previous = await tx.projectServicePending.findFirst({ where: { id: pendingId, serviceId } });
            if (!previous) throw new NotFoundException('Pendência não encontrada neste projeto');
            if (previous.resolvedAt || previous.version !== input.expectedVersion) throw new ConflictException('A pendência mudou. Atualize o card antes de editar.');
            const { expectedVersion, ...data } = input;
            await tx.projectServicePending.update({ where: { id: pendingId }, data: { ...data, version: { increment: 1 } } });
            await this.audit(tx, serviceId, actorId, 'PROJECT_PENDING_UPDATE', { pendingId, previous: { type: previous.type, responsible: previous.responsible, deadline: previous.deadline, detail: previous.detail, version: previous.version }, next: { ...data, version: expectedVersion + 1 } });
            return { id: pendingId };
        });
    }
    async resolvePending(serviceId: string, pendingId: string, expectedVersion: number, actorId: string) {
        return this.prisma.$transaction(async tx => {
            await this.lock(tx, serviceId);
            const previous = await tx.projectServicePending.findFirst({ where: { id: pendingId, serviceId } });
            if (!previous) throw new NotFoundException('Pendência não encontrada neste projeto');
            if (previous.resolvedAt) return { id: pendingId };
            if (previous.version !== expectedVersion) throw new ConflictException('A pendência mudou. Atualize o card antes de resolver.');
            const resolvedAt = new Date();
            await tx.projectServicePending.update({ where: { id: pendingId }, data: { resolvedAt, resolvedById: actorId, version: { increment: 1 } } });
            await this.audit(tx, serviceId, actorId, 'PROJECT_PENDING_RESOLVE', { pendingId, resolvedAt: resolvedAt.toISOString(), previousVersion: previous.version });
            return { id: pendingId };
        });
    }
    async addNote(serviceId: string, input: ProjectNoteCreate, actorId: string) {
        return this.prisma.$transaction(async tx => {
            await this.lock(tx, serviceId);
            const existing = await tx.projectServiceNote.findUnique({ where: { id: input.id } });
            if (existing) {
                if (existing.serviceId === serviceId && existing.authorId === actorId && existing.text === input.text) return { id: existing.id };
                throw new ConflictException('Esta solicitação já foi utilizada. Atualize o card antes de continuar.');
            }
            await tx.projectServiceNote.create({ data: { ...input, serviceId, authorId: actorId } });
            await this.audit(tx, serviceId, actorId, 'PROJECT_NOTE_CREATE', { noteId: input.id, text: input.text });
            return { id: input.id };
        });
    }
}
