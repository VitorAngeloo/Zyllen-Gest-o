import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ProjectServiceInput, StructureCycleRecord, StructureCycleService } from '@zyllen/shared';

export const cycleInclude = {
    structure: { include: { company: { select: { name: true } } } },
    installation: { include: { project: { select: { name: true } }, schedule: true } },
    removals: { include: { project: { select: { name: true } }, schedule: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
} satisfies Prisma.StructureCycleInclude;
type CycleRow = Prisma.StructureCycleGetPayload<{ include: typeof cycleInclude }>;
type StateRow = { schedule: { status: string; completedAt: Date | null } | null; cancelledAt: Date | null };
function state(row: StateRow) { return row.schedule?.status ?? (row.cancelledAt ? 'CANCELLED' : 'PENDING'); }
function summary(row: CycleRow['installation']): StructureCycleService {
    return { id: row.id, projectName: row.project.name, status: state(row), completedAt: state(row) === 'DONE' ? row.schedule?.completedAt?.toISOString() ?? null : null };
}

export function cycleRecord(row: CycleRow, now = Date.now()): StructureCycleRecord {
    const installation = summary(row.installation), removals = row.removals.map(summary);
    const removed = removals.find(item => item.status === 'DONE');
    const installedAt = installation.completedAt, removedAt = removed?.completedAt ?? null;
    const end = removed ? (removedAt ? Date.parse(removedAt) : null) : now;
    const durationDays = installedAt && end !== null && end >= Date.parse(installedAt) ? Math.floor((end - Date.parse(installedAt)) / 86_400_000) : null;
    const status = installation.status === 'CANCELLED' ? 'CANCELLED' : !['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'DONE'].includes(installation.status) ? 'UNCLASSIFIED' : installation.status !== 'DONE' ? 'PLANNED'
        : !installedAt || (removed && (!removedAt || Date.parse(removedAt) < Date.parse(installedAt))) ? 'UNCLASSIFIED' : removed ? 'REMOVED' : 'INSTALLED';
    return { id: row.id, structureId: row.structureId, structureName: row.structure.name, companyName: row.structure.company.name,
        installation, removals, installedAt, removedAt, durationDays, status, createdAt: row.createdAt.toISOString() };
}

@Injectable()
export class StructureCyclesService {
    private lock(tx: Prisma.TransactionClient, structureId: string) {
        return tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('structure-cycles'), hashtext(${structureId}))`;
    }
    private cycles(tx: Prisma.TransactionClient, structureId: string) {
        return tx.structureCycle.findMany({ where: { structureId }, include: cycleInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
    }
    private open(row: CycleRow) {
        const installedAt = row.installation.schedule?.completedAt;
        return state(row.installation) !== 'CANCELLED' && !row.removals.some(item => state(item) === 'DONE'
            && installedAt && item.schedule?.completedAt && item.schedule.completedAt >= installedAt);
    }

    async attach(tx: Prisma.TransactionClient, id: string, input: ProjectServiceInput, actorId: string) {
        const existing = await tx.projectService.findUnique({ where: { id }, include: { installationCycle: true, removalCycle: true, schedule: true } });
        if (!existing) throw new NotFoundException('Serviço não encontrado');
        const previous = existing.installationCycle ?? existing.removalCycle;
        if (previous) {
            if (input.type !== existing.type || (input.structureId !== undefined && input.structureId !== previous.structureId)
                || (input.removalCycleId !== undefined && input.removalCycleId !== (existing.removalCycleId ?? null))) {
                throw new BadRequestException('O vínculo da estrutura e do ciclo é permanente; crie outro projeto para outro serviço');
            }
            return;
        }
        if (!input.structureId && !input.removalCycleId) return;
        if (!['PENDING', 'SCHEDULED'].includes(state(existing)) || existing.schedule?.startedAt) throw new BadRequestException('Associe a estrutura antes de iniciar o serviço');
        const cycle = input.removalCycleId ? await tx.structureCycle.findUnique({ where: { id: input.removalCycleId } }) : null;
        if (input.removalCycleId && !cycle) throw new BadRequestException('Ciclo não encontrado');
        const structureId = input.structureId ?? cycle?.structureId;
        if (!structureId || (cycle && cycle.structureId !== structureId)) throw new BadRequestException('Ciclo não pertence à estrutura selecionada');
        await this.lock(tx, structureId);
        const structure = await tx.operationalStructure.findUnique({ where: { id: structureId } });
        if (!structure || structure.companyId !== input.companyId) throw new BadRequestException('Estrutura não pertence ao cliente selecionado');
        const cycles = await this.cycles(tx, structureId);
        if (input.type === 'INSTALLATION') {
            if (cycles.some(row => this.open(row))) throw new ConflictException('Esta estrutura já possui um ciclo aberto. Conclua a desinstalação ou cancele a instalação pendente.');
            await tx.structureCycle.create({ data: { structureId, installationId: id } });
        } else {
            const target = cycles.find(row => row.id === input.removalCycleId);
            if (!target || state(target.installation) !== 'DONE' || !target.installation.schedule?.completedAt) throw new BadRequestException('Desinstalação exige uma instalação concluída com data real');
            if (target.removals.some(row => state(row) !== 'CANCELLED')) throw new ConflictException('O ciclo já possui uma desinstalação vigente. Tentativas canceladas são preservadas.');
            if (cycles[0]?.id !== target.id) throw new BadRequestException('Selecione o ciclo atual da estrutura');
            await tx.projectService.update({ where: { id }, data: { removalCycleId: target.id } });
        }
        await tx.auditLog.create({ data: { action: 'STRUCTURE_CYCLE_LINK', entityType: 'ProjectService', entityId: id, userId: actorId,
            details: { structureId, removalCycleId: input.removalCycleId ?? null, type: input.type } } });
    }

    // Called from the canonical agenda path, including direct agenda updates.
    async validateChange(tx: Prisma.TransactionClient, id: string, nextStatus?: string, nextType?: string) {
        const service = await tx.projectService.findUnique({ where: { id }, include: { installationCycle: true, removalCycle: true, schedule: true } });
        const cycle = service?.installationCycle ?? service?.removalCycle;
        if (!service || !cycle) return;
        await this.lock(tx, cycle.structureId);
        if (nextType && nextType !== service.type) throw new BadRequestException('Não altere o tipo de um serviço vinculado a ciclo');
        if (!nextStatus || nextStatus === state(service)) return;
        const cycles = await this.cycles(tx, cycle.structureId), target = cycles.find(row => row.id === cycle.id)!;
        if (service.installationCycle) {
            if (state(service) === 'DONE' && nextStatus !== 'DONE' && target.removals.some(row => state(row) !== 'CANCELLED')) throw new BadRequestException('Cancele a desinstalação pendente antes de reabrir a instalação. Uma desinstalação concluída preserva a instalação.');
            if (nextStatus !== 'CANCELLED' && cycles.some(row => row.id !== target.id && this.open(row))) throw new ConflictException('Outro ciclo da estrutura já está aberto');
            if (nextStatus !== 'CANCELLED' && cycles[0]?.id !== target.id) throw new BadRequestException('Um ciclo posterior já existe; preserve o histórico desta instalação');
        } else if (nextStatus !== 'CANCELLED') {
            if (cycles[0]?.id !== target.id) throw new BadRequestException('Um ciclo posterior já existe; preserve o histórico desta desinstalação');
            if (state(target.installation) !== 'DONE' || !target.installation.schedule?.completedAt) throw new BadRequestException('Conclua a instalação correspondente antes de iniciar ou concluir a desinstalação');
            if (target.removals.some(row => row.id !== id && state(row) !== 'CANCELLED')) throw new ConflictException('Outra desinstalação está vigente para este ciclo');
        }
    }
}
