import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PanelAttentionClient, PanelAttentionClientsData, PanelAttentionClientsInput, PanelStatistics, PanelStatisticsQuery, PanelTicketsQuery, PanelVehiclesData } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { TicketStatisticsService } from '../tickets/ticket-statistics.service';
import { ProjectStatisticsService } from '../project-services/project-statistics.service';
import { OperationsStatisticsService } from '../trips/operations-statistics.service';
import { InventoryStatisticsService } from '../inventory/inventory-statistics.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { PanelAccessService, type PanelActor } from './panel-access.service';

type ActiveTicketSource = 'INTERNAL' | 'CLIENT';

const ticketSelect = { id: true, title: true, description: true, source: true, status: true, priority: true, createdAt: true, firstResponseAt: true, closedAt: true,
    slaDueAt: true, elapsedSeconds: true, resolutionNotes: true, assignedToInternalUserId: true, internalUser: { select: { name: true, sector: true } },
    externalUser: { select: { name: true, company: { select: { name: true } }, project: { select: { name: true } } } }, company: { select: { name: true } }, assignedTo: { select: { name: true } } } satisfies Prisma.TicketSelect;
@Injectable()
export class PanelDataService {
    constructor(private readonly prisma: PrismaService, private readonly access: PanelAccessService, private readonly tickets: TicketStatisticsService,
        private readonly projects: ProjectStatisticsService, private readonly operations: OperationsStatisticsService, private readonly inventory: InventoryStatisticsService,
        private readonly vehiclesService: VehiclesService) {}
    async statistics(actor: PanelActor, query: PanelStatisticsQuery): Promise<PanelStatistics> {
        this.access.require(actor, query.view);
        const period = { start: query.start!, end: query.end! };
        if (query.view === 'atendimentos' || query.view === 'atendimentos-clientes') {
            const source: ActiveTicketSource = query.view === 'atendimentos' ? 'INTERNAL' : 'CLIENT';
            return { view: query.view, data: await this.tickets.get({ ...period, source }, actor) };
        }
        if (query.view === 'projetos') return { view: query.view, data: await this.projects.get({ ...period, type: 'ALL' }) };
        if (query.view === 'operacoes') return { view: query.view, data: await this.operations.get({ ...period, type: 'ALL' }) };
        if (query.view === 'estoque') return { view: query.view, data: await this.inventory.statistics({ context: 'ALL' }) };
        throw new BadRequestException('Esta visão possui uma fonte de dados própria');
    }
    private scope(actor: PanelActor): Prisma.TicketWhereInput {
        return ['Administrador', 'Gestor'].includes(actor.role.name) ? {} : { OR: [{ status: 'OPEN' }, { assignedToInternalUserId: actor.id }] };
    }
    private ticketSource(actor: PanelActor, requested: PanelTicketsQuery['source']): ActiveTicketSource | 'ALL' {
        const internal = actor.views.includes('atendimentos');
        const clients = actor.views.includes('atendimentos-clientes');
        if (requested === 'INTERNAL') {
            this.access.require(actor, 'atendimentos');
            return 'INTERNAL';
        }
        if (requested === 'CLIENT') {
            this.access.require(actor, 'atendimentos-clientes');
            return 'CLIENT';
        }
        if (internal && clients) return 'ALL';
        if (internal) return 'INTERNAL';
        if (clients) return 'CLIENT';
        this.access.require(actor, 'atendimentos');
        return 'INTERNAL';
    }
    async listTickets(actor: PanelActor, query: PanelTicketsQuery) {
        const source = this.ticketSource(actor, query.source);
        const where: Prisma.TicketWhereInput = { AND: [this.scope(actor), { status: query.status }, ...(source === 'ALL' ? [] : [{ source }])] };
        const [data, total] = await this.prisma.retry(() => this.prisma.$transaction([
            this.prisma.ticket.findMany({ where, select: ticketSelect, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
            this.prisma.ticket.count({ where }),
        ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
        return { data, total, page: query.page, limit: query.limit };
    }
    async ticket(actor: PanelActor, id: string) {
        const row = await this.prisma.retry(() => this.prisma.ticket.findFirst({ where: { AND: [{ id, status: { in: ['OPEN', 'IN_PROGRESS'] } }, this.scope(actor)] }, select: ticketSelect }));
        if (!row) throw new NotFoundException('Chamado indisponível neste espelho');
        if (row.source === 'INTERNAL') this.access.require(actor, 'atendimentos');
        else if (row.source === 'CLIENT') this.access.require(actor, 'atendimentos-clientes');
        else throw new NotFoundException('Chamado indisponível neste espelho');
        return { ...row, attachments: [], messages: [], rating: null };
    }
    private async selectedCompanyIds(ownerId: string): Promise<string[]> {
        const rows = await this.prisma.retry(() => this.prisma.$queryRaw<{ companyId: string }[]>`
            SELECT "companyId" FROM "PanelAttentionClient" WHERE "ownerId" = ${ownerId} ORDER BY "createdAt" ASC, "companyId" ASC
        `);
        return rows.map(row => row.companyId);
    }
    private async companies(ids: string[], includeContact = true): Promise<PanelAttentionClient[]> {
        if (!ids.length) return [];
        const rows = await this.prisma.retry(() => this.prisma.company.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, phone: true, externalUsers: { where: { isActive: true }, select: { name: true, phone: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] } },
        }));
        const byId = new Map(rows.map(company => {
            const contact = includeContact ? company.externalUsers.find(user => !!user.phone) ?? company.externalUsers[0] : undefined;
            return [company.id, { id: company.id, name: company.name, contactName: contact?.name ?? null, contactPhone: includeContact ? contact?.phone ?? company.phone ?? null : null } satisfies PanelAttentionClient];
        }));
        return ids.flatMap(id => byId.get(id) ?? []);
    }
    async attentionClients(actor: PanelActor, search = ''): Promise<PanelAttentionClientsData> {
        this.access.require(actor, 'clientes-atencao');
        const selectedIds = await this.selectedCompanyIds(actor.id);
        const optionRows = await this.prisma.retry(() => this.prisma.company.findMany({
            where: { ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}), ...(selectedIds.length ? { id: { notIn: selectedIds } } : {}) },
            select: { id: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 12,
        }));
        const [selected, options] = await Promise.all([this.companies(selectedIds), this.companies(optionRows.map(row => row.id), false)]);
        return { selected, options };
    }
    async updateAttentionClients(actor: PanelActor, input: PanelAttentionClientsInput): Promise<PanelAttentionClientsData> {
        this.access.require(actor, 'clientes-atencao');
        const existing = input.companyIds.length ? await this.prisma.retry(() => this.prisma.company.count({ where: { id: { in: input.companyIds } } })) : 0;
        if (existing !== input.companyIds.length) throw new BadRequestException('Um ou mais clientes não estão disponíveis');
        await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT 1 AS "locked" FROM pg_advisory_xact_lock(hashtext(${`panel-attention:${actor.id}`}))`;
            await tx.$executeRaw`DELETE FROM "PanelAttentionClient" WHERE "ownerId" = ${actor.id}`;
            if (input.companyIds.length) {
                const values = input.companyIds.map(companyId => Prisma.sql`(${actor.id}, ${companyId})`);
                await tx.$executeRaw(Prisma.sql`INSERT INTO "PanelAttentionClient" ("ownerId", "companyId") VALUES ${Prisma.join(values)}`);
            }
            await tx.auditLog.create({ data: { action: 'PANEL_ATTENTION_CLIENTS_UPDATED', entityType: 'PanelAttentionClient', entityId: actor.id, userId: actor.id, details: { companyIds: input.companyIds } } });
        });
        return this.attentionClients(actor);
    }
    async vehicles(actor: PanelActor): Promise<PanelVehiclesData> {
        this.access.require(actor, 'carros');
        return this.vehiclesService.statistics();
    }
}
