import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { projectPlanningSchema, type projectPlanningChangeSchema, type projectObservationsChangeSchema, type projectCancellationSchema } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ScheduleService } from '../schedule/schedule.service';
import { StructureCyclesService } from '../structures/structure-cycles.service';

@Injectable()
export class ProjectActionsService {
    constructor(private readonly prisma: PrismaService, private readonly schedules: ScheduleService, private readonly cycles: StructureCyclesService) {}
    private async lock(tx: Prisma.TransactionClient, id: string) {
        await tx.$queryRaw`SELECT id FROM "ProjectService" WHERE id = ${id} FOR UPDATE`;
        const record = await tx.projectService.findUnique({ where: { id }, include: { schedule: true } });
        if (!record) throw new NotFoundException('Projeto operacional não encontrado');
        return record;
    }
    private async audit(tx: Prisma.TransactionClient, id: string, actorId: string, action: string, details: Prisma.InputJsonObject) {
        await tx.auditLog.create({ data: { entityType: 'ProjectService', entityId: id, userId: actorId, action, details } });
    }
    async planning(id: string, input: z.infer<typeof projectPlanningChangeSchema>, actorId: string) {
        return this.prisma.$transaction(async tx => {
            const record = await this.lock(tx, id), parsed = projectPlanningSchema.safeParse(record.planning);
            const previous = parsed.success ? parsed.data : null;
            if (JSON.stringify(previous) !== JSON.stringify(input.expected)) throw new ConflictException('O planejamento mudou. Atualize o card antes de editar.');
            if (JSON.stringify(previous) === JSON.stringify(input.next)) return { id };
            await tx.projectService.update({ where: { id }, data: { planning: input.next ?? Prisma.DbNull } });
            await this.audit(tx, id, actorId, 'PROJECT_PLANNING_CHANGE', { previousPlanning: previous, planning: input.next });
            return { id };
        });
    }
    async observations(id: string, input: z.infer<typeof projectObservationsChangeSchema>, actorId: string) {
        return this.prisma.$transaction(async tx => {
            const record = await this.lock(tx, id);
            if ((record.notes ?? '') !== (input.expected ?? '')) throw new ConflictException('As observações mudaram. Atualize o card antes de editar.');
            if ((record.notes ?? '') === input.next) return { id };
            if (record.scheduleId) await this.schedules.updateInTransaction(record.scheduleId, { notes: input.next }, tx, actorId);
            else await tx.projectService.update({ where: { id }, data: { notes: input.next || null } });
            await this.audit(tx, id, actorId, 'PROJECT_OBSERVATIONS_CHANGE', { previousNotes: record.notes, notes: input.next });
            return { id };
        });
    }
    async cancel(id: string, input: z.infer<typeof projectCancellationSchema>, actorId: string) {
        return this.prisma.$transaction(async tx => {
            const record = await this.lock(tx, id), status = record.schedule?.status ?? (record.cancelledAt ? 'CANCELLED' : 'PENDING');
            if (status === 'CANCELLED') {
                const audit = await tx.auditLog.findFirst({ where: { entityId: id, entityType: 'ProjectService', action: 'PROJECT_CANCEL_WITH_REASON' }, orderBy: { createdAt: 'desc' } });
                if ((audit?.details as Prisma.JsonObject | null)?.reason === input.reason) return { id };
                throw new ConflictException('O projeto já está cancelado. O histórico foi preservado.');
            }
            if (status !== input.expectedStatus) throw new ConflictException('A execução mudou. Atualize o card antes de cancelar.');
            if (record.scheduleId) await this.schedules.updateInTransaction(record.scheduleId, { status: 'CANCELLED' }, tx, actorId);
            else {
                await this.cycles.validateChange(tx, id, 'CANCELLED');
                await tx.projectService.update({ where: { id }, data: { cancelledAt: new Date() } });
            }
            await this.audit(tx, id, actorId, 'PROJECT_CANCEL_WITH_REASON', { previousStatus: status, status: 'CANCELLED', reason: input.reason });
            return { id };
        });
    }
}
