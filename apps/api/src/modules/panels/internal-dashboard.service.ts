import { Injectable } from '@nestjs/common';
import { Prisma, type Ticket } from '@prisma/client';
import { type InternalDashboardData, type InternalDashboardTicket, type TicketPriority } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProjectStatisticsService } from '../project-services/project-statistics.service';
import { VehiclesService } from '../vehicles/vehicles.service';

const ticketSelect = {
    id: true,
    title: true,
    description: true,
    priority: true,
    status: true,
    createdAt: true,
    firstResponseAt: true,
    assignedTo: { select: { name: true } },
} satisfies Prisma.TicketSelect;

type TicketRow = Pick<Ticket, 'id' | 'title' | 'description' | 'priority' | 'status' | 'createdAt' | 'firstResponseAt'> & {
    assignedTo: { name: string } | null;
};

@Injectable()
export class InternalDashboardService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly projects: ProjectStatisticsService,
        private readonly vehicles: VehiclesService,
    ) {}

    private ticket(row: TicketRow): InternalDashboardTicket {
        return {
            id: row.id,
            title: row.title,
            description: row.description,
            priority: row.priority as TicketPriority,
            status: row.status as InternalDashboardTicket['status'],
            createdAt: row.createdAt.toISOString(),
            firstResponseAt: row.firstResponseAt?.toISOString() ?? null,
            assignedTo: row.assignedTo,
        };
    }

    async get(userId: string): Promise<InternalDashboardData> {
        const now = new Date();
        const period = { start: new Date(now.getTime() - 30 * 86_400_000).toISOString(), end: now.toISOString(), type: 'ALL' as const };
        const own = (status: 'OPEN' | 'IN_PROGRESS'): Prisma.TicketWhereInput => ({
            source: 'INTERNAL',
            internalUserId: userId,
            status,
        });

        const ticketData = await this.prisma.retry(() => this.prisma.$transaction([
            this.prisma.ticket.findMany({ where: own('OPEN'), select: ticketSelect, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 20 }),
            this.prisma.ticket.count({ where: own('OPEN') }),
            this.prisma.ticket.findMany({ where: own('IN_PROGRESS'), select: ticketSelect, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 20 }),
            this.prisma.ticket.count({ where: own('IN_PROGRESS') }),
        ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
        const projectData = await this.projects.get(period);
        const vehicleData = await this.vehicles.statistics();

        const [open, openTotal, inProgress, inProgressTotal] = ticketData;
        const reservation = (row: typeof vehicleData.current[number]) => ({
            id: row.id,
            title: row.title,
            vehicleName: row.vehicle.name,
            responsibleName: row.responsible.name,
            startDate: row.startDate,
            endDate: row.endDate,
        });

        return {
            generatedAt: now.toISOString(),
            tickets: {
                open: { total: openTotal, items: open.map(row => this.ticket(row)) },
                inProgress: { total: inProgressTotal, items: inProgress.map(row => this.ticket(row)) },
            },
            projects: {
                current: projectData.current,
                highlights: projectData.highlights.map(row => ({
                    name: row.name,
                    companyName: row.companyName,
                    type: row.type,
                    status: row.status,
                    startDate: row.startDate,
                    endDate: row.endDate,
                })),
            },
            vehicles: {
                active: vehicleData.activeVehicles,
                available: vehicleData.availableVehicles,
                occupied: vehicleData.occupiedVehicles,
                current: vehicleData.current.map(reservation),
                upcoming: vehicleData.upcoming.map(reservation),
            },
        };
    }
}
