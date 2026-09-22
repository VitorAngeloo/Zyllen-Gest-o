import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { TripInput, TripListQuery, TripRecord, TripServiceChoice, TripStatusInput } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ScheduleService } from '../schedule/schedule.service';

const publicPerson = { id: true, name: true, agendaColor: true } as const;
const serviceSelect = { id: true, type: true, tripId: true, scheduleId: true, project: { select: { name: true, address: true, company: { select: { name: true } } } } } as const;
const include = { schedule: { include: { installers: { include: { installer: { select: publicPerson } } } } },
    contractors: { include: { user: { select: { id: true, name: true } } } }, services: { select: serviceSelect } } satisfies Prisma.TripInclude;
type TripRow = Prisma.TripGetPayload<{ include: typeof include }>;
function choice(service: TripRow['services'][number]): TripServiceChoice {
    return { id: service.id, name: service.project.name, companyName: service.project.company.name, address: service.project.address, type: service.type as TripServiceChoice['type'], tripId: service.tripId };
}
function record(row: TripRow): TripRecord {
    return {
        id: row.id, title: row.schedule.title, scheduleId: row.scheduleId,
        originCity: row.originCity, originState: row.originState, destinationCity: row.destinationCity, destinationState: row.destinationState,
        interstate: row.originState !== row.destinationState, notes: row.schedule.notes, status: row.schedule.status as TripRecord['status'],
        startDate: row.schedule.startDate.toISOString(), endDate: row.schedule.endDate.toISOString(),
        startedAt: row.schedule.startedAt?.toISOString() ?? null, completedAt: row.schedule.completedAt?.toISOString() ?? null, cancelledAt: row.schedule.cancelledAt?.toISOString() ?? null,
        internalAssignees: row.schedule.installers.map(item => item.installer), contractors: row.contractors.map(item => item.user),
        services: row.services.map(choice), createdAt: row.createdAt.toISOString(),
    };
}

@Injectable()
export class TripsService {
    constructor(private readonly prisma: PrismaService, private readonly schedules: ScheduleService) {}

    async find(id: string) {
        const row = await this.prisma.retry(() => this.prisma.trip.findUnique({ where: { id }, include }));
        if (!row) throw new NotFoundException('Viagem não encontrada');
        return record(row);
    }

    async options() {
        const [internalUsers, contractors, services] = await this.prisma.retry(() => Promise.all([
            this.prisma.internalUser.findMany({ where: { isActive: true }, select: publicPerson, orderBy: { name: 'asc' } }),
            this.prisma.contractorUser.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
            this.prisma.projectService.findMany({ select: serviceSelect, orderBy: { project: { name: 'asc' } } }),
        ]));
        return { internalUsers, contractors, services: services.map(choice) };
    }

    async list(query: TripListQuery) {
        const filter = Prisma.sql`${query.status ? Prisma.sql`s.status = ${query.status}` : Prisma.sql`TRUE`}
            AND ${query.interstate ? query.interstate === 'true' ? Prisma.sql`t."originState" <> t."destinationState"` : Prisma.sql`t."originState" = t."destinationState"` : Prisma.sql`TRUE`}
            AND ${query.search ? Prisma.sql`(s.title ILIKE ${'%' + query.search + '%'} OR t."destinationCity" ILIKE ${'%' + query.search + '%'})` : Prisma.sql`TRUE`}`;
        const result = await this.prisma.retry(() => this.prisma.$transaction(async tx => {
            const [ids, counts] = await Promise.all([
                tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT t.id FROM "Trip" t JOIN "Schedule" s ON s.id = t."scheduleId" WHERE ${filter}
                    ORDER BY CASE s.status WHEN 'IN_PROGRESS' THEN 0 WHEN 'SCHEDULED' THEN 1 ELSE 2 END, s."startDate" ASC, t.id ASC
                    LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`),
                tx.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS total FROM "Trip" t JOIN "Schedule" s ON s.id = t."scheduleId" WHERE ${filter}`),
            ]);
            const rows = await tx.trip.findMany({ where: { id: { in: ids.map(item => item.id) } }, include });
            const map = new Map(rows.map(row => [row.id, record(row)]));
            return { data: ids.map(item => map.get(item.id)!), total: Number(counts[0].total) };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
        return { ...result, page: query.page, limit: query.limit };
    }

    private route(input: TripInput) {
        return { originCity: input.originCity, originState: input.originState, destinationCity: input.destinationCity, destinationState: input.destinationState };
    }

    private async validate(tx: Prisma.TransactionClient, input: TripInput, tripId?: string) {
        const internalIds = [...new Set(input.installerIds)], contractorIds = [...new Set(input.contractorIds)], serviceIds = [...new Set(input.serviceIds)];
        if (serviceIds.length) await tx.$queryRaw`SELECT id FROM "ProjectService" WHERE id = ANY(${serviceIds}::text[]) ORDER BY id FOR UPDATE`;
        const [users, contractors, services] = await Promise.all([
            tx.internalUser.count({ where: { id: { in: internalIds }, isActive: true } }),
            tx.contractorUser.count({ where: { id: { in: contractorIds }, isActive: true } }),
            tx.projectService.findMany({ where: { id: { in: serviceIds } }, select: { id: true, tripId: true, scheduleId: true } }),
        ]);
        if (users !== internalIds.length || contractors !== contractorIds.length) throw new BadRequestException('Um responsável está inativo ou não existe');
        if (services.length !== serviceIds.length) throw new BadRequestException('Um serviço selecionado não existe');
        if (services.some(service => service.tripId && service.tripId !== tripId)) throw new ConflictException('Um serviço já está vinculado a outra viagem. Desvincule na viagem anterior antes de transferir.');
        const previous = tripId ? await tx.trip.findUnique({ where: { id: tripId }, select: { scheduleId: true } }) : null;
        if (!input.allowConflicts && await this.schedules.conflictingAssignments(tx, { startDate: input.startDate, endDate: input.endDate, installerIds: internalIds, contractorIds,
            excludeScheduleIds: [...(previous ? [previous.scheduleId] : []), ...services.flatMap(service => service.scheduleId ? [service.scheduleId] : [])] })) {
            throw new ConflictException('Há conflito de horário para um responsável. Confira e confirme a viagem com conflito.');
        }
        return { internalIds, contractorIds, serviceIds };
    }

    private async links(tx: Prisma.TransactionClient, tripId: string, values: { contractorIds: string[]; serviceIds: string[] }) {
        await tx.tripContractor.deleteMany({ where: { tripId } });
        if (values.contractorIds.length) await tx.tripContractor.createMany({ data: values.contractorIds.map(userId => ({ tripId, userId })) });
        await tx.projectService.updateMany({ where: { tripId, id: { notIn: values.serviceIds } }, data: { tripId: null } });
        await tx.projectService.updateMany({ where: { id: { in: values.serviceIds } }, data: { tripId, requiresTravel: true } });
    }

    async create(input: TripInput, actorId: string) {
        const id = await this.prisma.$transaction(async tx => {
            const values = await this.validate(tx, input);
            const schedule = await this.schedules.createInTransaction({ title: input.title, type: 'OTHER', startDate: input.startDate, endDate: input.endDate,
                notes: input.notes, installerIds: values.internalIds }, actorId, tx);
            const trip = await tx.trip.create({ data: { ...this.route(input), scheduleId: schedule.id, createdAt: new Date() } });
            await this.links(tx, trip.id, values);
            await tx.auditLog.create({ data: { action: 'TRIP_CREATE', entityType: 'Trip', entityId: trip.id, userId: actorId, createdAt: new Date(), details: { serviceIds: values.serviceIds, ...this.route(input) } } });
            return trip.id;
        }, { timeout: 20_000 });
        return this.find(id);
    }

    async update(id: string, input: TripInput, actorId: string) {
        await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${id} FOR UPDATE`;
            const previous = await tx.trip.findUnique({ where: { id }, include });
            if (!previous) throw new NotFoundException('Viagem não encontrada');
            if (['DONE', 'CANCELLED'].includes(previous.schedule.status)) throw new BadRequestException('Reabra a viagem antes de alterar seu planejamento');
            if (previous.schedule.status === 'IN_PROGRESS' && (previous.originCity !== input.originCity || previous.originState !== input.originState || previous.destinationCity !== input.destinationCity || previous.destinationState !== input.destinationState)) throw new BadRequestException('Origem e destino ficam preservados enquanto a viagem está em andamento');
            const values = await this.validate(tx, input, id);
            await tx.trip.update({ where: { id }, data: this.route(input) });
            await this.links(tx, id, values);
            await this.schedules.updateInTransaction(previous.scheduleId, { title: input.title, notes: input.notes, startDate: input.startDate, endDate: input.endDate,
                installerIds: values.internalIds, allowConflicts: input.allowConflicts }, tx, actorId);
            await tx.auditLog.create({ data: { action: 'TRIP_UPDATE', entityType: 'Trip', entityId: id, userId: actorId, createdAt: new Date(), details: {
                previousServiceIds: previous.services.map(service => service.id), serviceIds: values.serviceIds,
                previousOriginCity: previous.originCity, previousOriginState: previous.originState, previousDestinationCity: previous.destinationCity, previousDestinationState: previous.destinationState,
            } } });
        }, { timeout: 20_000 });
        return this.find(id);
    }

    async status(id: string, input: TripStatusInput, actorId: string) {
        await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${id} FOR UPDATE`;
            const trip = await tx.trip.findUnique({ where: { id }, select: { scheduleId: true } });
            if (!trip) throw new NotFoundException('Viagem não encontrada');
            await this.schedules.updateInTransaction(trip.scheduleId, input, tx, actorId);
        });
        return this.find(id);
    }
}
