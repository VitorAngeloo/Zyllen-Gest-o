import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ProjectHistoryEntry } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const fields = [
    ['planning', 'previousPlanning', 'Planejamento'], ['notes', 'previousNotes', 'Observações'],
    ['status', 'previousStatus', 'Execução'], ['start', 'previousStart', 'Início agendado'], ['end', 'previousEnd', 'Término agendado'],
    ['specifications', 'previousSpecifications', 'Características técnicas'],
] as const;
const value = (item: Prisma.JsonValue | undefined): string => item == null ? '' : typeof item === 'string' ? item : JSON.stringify(item);
@Injectable()
export class ProjectHistoryService {
    constructor(private readonly prisma: PrismaService) {}
    async list(id: string, page: number, limit: number) {
        return this.prisma.retry(() => this.prisma.$transaction(async tx => {
            const record = await tx.projectService.findUnique({ where: { id }, select: { scheduleId: true } });
            if (!record) throw new NotFoundException('Projeto operacional não encontrado');
            const where: Prisma.AuditLogWhereInput = { OR: [ { entityType: 'ProjectService', entityId: id },
                ...(record.scheduleId ? [{ entityType: 'Schedule', entityId: record.scheduleId }] : []) ] };
            const [rows, total] = await Promise.all([
                tx.auditLog.findMany({ where, include: { user: { select: { name: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
                tx.auditLog.count({ where }),
            ]);
            const data: ProjectHistoryEntry[] = rows.map(row => {
                const details = row.details && !Array.isArray(row.details) && typeof row.details === 'object' ? row.details : {};
                const changes: ProjectHistoryEntry['changes'] = fields.filter(([after]) => Object.hasOwn(details, after)).map(([after, before, label]) => ({ field: label, before: value(details[before]), after: value(details[after]) }));
                if (details.previous && details.next) changes.push({ field: 'Pendência', before: value(details.previous), after: value(details.next) });
                return { id: row.id, action: row.action, createdAt: row.createdAt.toISOString(), author: row.user.name, changes, reason: typeof details.reason === 'string' ? details.reason : null };
            });
            return { data, total, page, limit };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
    }
}
