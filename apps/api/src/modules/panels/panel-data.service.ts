import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PanelStatistics, PanelStatisticsQuery, PanelTicketsQuery } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TicketStatisticsService } from '../tickets/ticket-statistics.service';
import { ProjectStatisticsService } from '../project-services/project-statistics.service';
import { OperationsStatisticsService } from '../trips/operations-statistics.service';
import { InventoryStatisticsService } from '../inventory/inventory-statistics.service';
import { PanelAccessService, type PanelActor } from './panel-access.service';

const ticketSelect = { id: true, title: true, description: true, source: true, status: true, priority: true, createdAt: true, firstResponseAt: true, closedAt: true,
    slaDueAt: true, elapsedSeconds: true, resolutionNotes: true, assignedToInternalUserId: true, internalUser: { select: { name: true, sector: true } },
    externalUser: { select: { name: true, company: { select: { name: true } }, project: { select: { name: true } } } }, company: { select: { name: true } }, assignedTo: { select: { name: true } } } satisfies Prisma.TicketSelect;
@Injectable()
export class PanelDataService {
    constructor(private readonly prisma: PrismaService, private readonly access: PanelAccessService, private readonly tickets: TicketStatisticsService,
        private readonly projects: ProjectStatisticsService, private readonly operations: OperationsStatisticsService, private readonly inventory: InventoryStatisticsService) {}
    async statistics(actor: PanelActor, query: PanelStatisticsQuery): Promise<PanelStatistics> {
        this.access.require(actor, query.view);
        const period = { start: query.start!, end: query.end! };
        if (query.view === 'atendimentos') return { view: query.view, data: await this.tickets.get({ ...period, source: query.source }, actor) };
        if (query.view === 'projetos') return { view: query.view, data: await this.projects.get({ ...period, type: 'ALL' }) };
        if (query.view === 'operacoes') return { view: query.view, data: await this.operations.get({ ...period, type: 'ALL' }) };
        return { view: 'estoque', data: await this.inventory.statistics({ context: 'ALL' }) };
    }
    private scope(actor: PanelActor): Prisma.TicketWhereInput {
        return ['Administrador', 'Gestor'].includes(actor.role.name) ? {} : { OR: [{ status: 'OPEN' }, { assignedToInternalUserId: actor.id }] };
    }
    async listTickets(actor: PanelActor, query: PanelTicketsQuery) {
        this.access.require(actor, 'atendimentos');
        const where: Prisma.TicketWhereInput = { AND: [this.scope(actor), { status: query.status }, ...(query.source === 'ALL' ? [] : [{ source: query.source }])] };
        const [data, total] = await this.prisma.retry(() => this.prisma.$transaction([
            this.prisma.ticket.findMany({ where, select: ticketSelect, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
            this.prisma.ticket.count({ where }),
        ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
        return { data, total, page: query.page, limit: query.limit };
    }
    async ticket(actor: PanelActor, id: string) {
        this.access.require(actor, 'atendimentos');
        const row = await this.prisma.retry(() => this.prisma.ticket.findFirst({ where: { AND: [{ id, status: { in: ['OPEN', 'IN_PROGRESS'] } }, this.scope(actor)] }, select: ticketSelect }));
        if (!row) throw new NotFoundException('Chamado indisponível neste espelho');
        return { ...row, attachments: [], messages: [], rating: null };
    }
}
