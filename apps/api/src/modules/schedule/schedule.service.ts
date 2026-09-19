import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StructureCyclesService } from '../structures/structure-cycles.service';

const tripSelect = { id: true, scheduleId: true, originCity: true, originState: true, destinationCity: true, destinationState: true,
    contractors: { select: { user: { select: { id: true, name: true } } } } } as const;

@Injectable()
export class ScheduleService {
    constructor(private readonly prisma: PrismaService, private readonly cycles: StructureCyclesService) {}

    private readonly linkedSelect = {
        id: true, scheduleId: true, projectId: true, urgency: true, color: true, requiresTravel: true,
        marker: { select: { id: true, name: true } },
        project: { select: { name: true, address: true } },
        contractors: { select: { user: { select: { id: true, name: true } } } },
    } as const;

    private linkedService(client: Prisma.TransactionClient, scheduleId: string) {
        return client.projectService.findUnique({ where: { scheduleId }, select: this.linkedSelect });
    }

    private tripContext(trip: Prisma.TripGetPayload<{ select: typeof tripSelect }> | null) {
        return trip ? { ...trip, contractors: trip.contractors.map(item => item.user) } : null;
    }

    async conflictingAssignments(client: Prisma.TransactionClient, input: { startDate: string; endDate: string; installerIds: string[]; contractorIds: string[]; excludeScheduleIds?: string[] }) {
        return client.schedule.count({ where: {
            id: { notIn: input.excludeScheduleIds ?? [] }, status: { not: 'CANCELLED' },
            startDate: { lt: new Date(input.endDate) }, endDate: { gt: new Date(input.startDate) },
            OR: [{ installers: { some: { installerId: { in: input.installerIds } } } },
                { projectService: { contractors: { some: { userId: { in: input.contractorIds } } } } },
                { trip: { contractors: { some: { userId: { in: input.contractorIds } } } } }],
        } });
    }

    private utcTimestamp(value: string | Date) {
        const iso = new Date(value).toISOString();
        return Prisma.sql`(${iso}::timestamptz AT TIME ZONE 'UTC')`;
    }

    private validateInterval(start: string | Date, end: string | Date) {
        const from = new Date(start).getTime(), to = new Date(end).getTime();
        if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) throw new BadRequestException('Informe um intervalo válido, com término após o início');
    }

    async findAll(params: {
        startDate?: string;
        endDate?: string;
        installerId?: string;
        status?: string;
        type?: string;
        companyId?: string;
        skip?: number;
        take?: number;
    }) {
        const { skip = 0, take = 50 } = params;

        const conditions: Prisma.Sql[] = [];

        if (params.startDate) {
            conditions.push(Prisma.sql`s."startDate" >= ${this.utcTimestamp(params.startDate)}`);
        }
        if (params.endDate) {
            conditions.push(Prisma.sql`s."endDate" <= ${this.utcTimestamp(params.endDate)}`);
        }
        if (params.status) {
            conditions.push(Prisma.sql`s.status = ${params.status}`);
        }
        if (params.type) {
            conditions.push(Prisma.sql`s.type = ${params.type}`);
        }
        if (params.companyId) {
            conditions.push(Prisma.sql`s."companyId" = ${params.companyId}`);
        }
        if (params.installerId) {
            conditions.push(Prisma.sql`EXISTS (
                SELECT 1 FROM "ScheduleInstaller" si
                WHERE si."scheduleId" = s.id AND si."installerId" = ${params.installerId}
            )`);
        }

        const whereClause =
            conditions.length > 0
                ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
                : Prisma.empty;

        const schedules = await this.prisma.$queryRaw<any[]>`
            SELECT
                s.*,
                c.name AS "companyName",
                p.name AS "projectName",
                cb.name AS "createdByName"
            FROM "Schedule" s
            LEFT JOIN "Company"       c  ON s."companyId"   = c.id
            LEFT JOIN "Project"       p  ON s."projectId"   = p.id
            LEFT JOIN "InternalUser"  cb ON s."createdById" = cb.id
            ${whereClause}
            ORDER BY s."startDate" ASC, s.id ASC
            LIMIT ${take} OFFSET ${skip}
        `;

        const [countRow] = await this.prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*)::bigint AS count FROM "Schedule" s
            ${whereClause}
        `;

        if (schedules.length > 0) {
            const ids = schedules.map((s) => s.id);
            const installers = await this.prisma.$queryRaw<any[]>`
                SELECT si."scheduleId", u.id, u.name, u."agendaColor"
                FROM "ScheduleInstaller" si
                JOIN "InternalUser" u ON si."installerId" = u.id
                WHERE si."scheduleId" = ANY(${ids}::text[])
            `;

            const installerMap = new Map<string, any[]>();
            for (const inst of installers) {
                if (!installerMap.has(inst.scheduleId)) installerMap.set(inst.scheduleId, []);
                installerMap.get(inst.scheduleId)!.push({
                    id: inst.id,
                    name: inst.name,
                    agendaColor: inst.agendaColor,
                });
            }
            for (const s of schedules) {
                s.installers = installerMap.get(s.id) ?? [];
            }
        }

        if (schedules.length) {
            const linked = await this.prisma.projectService.findMany({
                where: { scheduleId: { in: schedules.map(s => s.id) } }, select: this.linkedSelect,
            });
            const map = new Map(linked.map(service => [service.scheduleId, service]));
            const trips = await this.prisma.trip.findMany({ where: { scheduleId: { in: schedules.map(s => s.id) } }, select: tripSelect });
            const tripMap = new Map(trips.map(trip => [trip.scheduleId, this.tripContext(trip)]));
            for (const schedule of schedules) {
                schedule.projectService = map.get(schedule.id) ?? null;
                schedule.trip = tripMap.get(schedule.id) ?? null;
                if (schedule.projectService) { schedule.title = schedule.projectService.project.name; schedule.address = schedule.projectService.project.address; }
            }
        }
        return { data: schedules, total: Number(countRow.count) };
    }

    async findById(id: string, client: Prisma.TransactionClient = this.prisma) {
        const rows = await client.$queryRaw<any[]>`
            SELECT
                s.*,
                c.name AS "companyName",
                p.name AS "projectName",
                cb.name AS "createdByName"
            FROM "Schedule" s
            LEFT JOIN "Company"       c  ON s."companyId"   = c.id
            LEFT JOIN "Project"       p  ON s."projectId"   = p.id
            LEFT JOIN "InternalUser"  cb ON s."createdById" = cb.id
            WHERE s.id = ${id}
        `;

        if (!rows[0]) throw new NotFoundException('Agendamento não encontrado');
        const schedule = rows[0];

        const installers = await client.$queryRaw<any[]>`
            SELECT u.id, u.name, u.email, u.sector, u."agendaColor"
            FROM "ScheduleInstaller" si
            JOIN "InternalUser" u ON si."installerId" = u.id
            WHERE si."scheduleId" = ${id}
        `;
        schedule.installers = installers;

        const recRows = await client.$queryRaw<any[]>`
            SELECT * FROM "ScheduleRecurrence" WHERE "scheduleId" = ${id}
        `;
        schedule.recurrence = recRows[0] ?? null;

        schedule.projectService = await this.linkedService(client, id);
        schedule.trip = this.tripContext(await client.trip.findUnique({ where: { scheduleId: id }, select: tripSelect }));
        if (schedule.projectService) { schedule.title = schedule.projectService.project.name; schedule.address = schedule.projectService.project.address; }
        return schedule;
    }

    private generateInstances(
        startDate: Date,
        endDate: Date,
        recurrence: { type: string; interval: number; count?: number; endDate?: string },
    ): Array<{ startDate: Date; endDate: Date }> {
        const instances: Array<{ startDate: Date; endDate: Date }> = [];
        const durationMs = endDate.getTime() - startDate.getTime();
        const recEndDate = recurrence.endDate ? new Date(recurrence.endDate) : null;
        // -1 because the parent schedule is occurrence #1
        const maxChildren = recurrence.count ? recurrence.count - 1 : 104;

        let current = new Date(startDate);
        while (instances.length < maxChildren) {
            const next = new Date(current);
            if (recurrence.type === 'DAILY') {
                next.setDate(next.getDate() + recurrence.interval);
            } else if (recurrence.type === 'WEEKLY') {
                next.setDate(next.getDate() + recurrence.interval * 7);
            } else {
                next.setMonth(next.getMonth() + recurrence.interval);
            }
            if (recEndDate && next > recEndDate) break;
            instances.push({ startDate: next, endDate: new Date(next.getTime() + durationMs) });
            current = next;
        }
        return instances;
    }

    async create(
        data: {
            title: string;
            type: string;
            startDate: string;
            endDate: string;
            address?: string;
            notes?: string;
            companyId?: string;
            projectId?: string;
            installerIds: string[];
            recurrence?: { type: string; interval: number; count?: number; endDate?: string };
        },
        createdById: string,
    ) {
        if (data.projectId && await this.prisma.projectService.findUnique({ where: { projectId: data.projectId } })) {
            throw new BadRequestException('Agende o serviço deste projeto pela gestão de projetos');
        }
        return this.prisma.$transaction(tx => this.createInTransaction(data, createdById, tx), { timeout: 20000 });
    }

    async createInTransaction(
        data: {
            title: string;
            type: string;
            startDate: string;
            endDate: string;
            address?: string;
            notes?: string;
            companyId?: string;
            projectId?: string;
            installerIds: string[];
            recurrence?: { type: string; interval: number; count?: number; endDate?: string };
        },
        createdById: string,
        tx: Prisma.TransactionClient,
    ) {
        this.validateInterval(data.startDate, data.endDate);
        const idRows = await tx.$queryRaw<[{ id: string }]>`
            INSERT INTO "Schedule" (
                id, title, type, status, "startDate", "endDate",
                address, notes, "companyId", "projectId", "createdById", "updatedAt", "createdAt"
            ) VALUES (
                gen_random_uuid(),
                ${data.title},
                ${data.type},
                'SCHEDULED',
                ${this.utcTimestamp(data.startDate)},
                ${this.utcTimestamp(data.endDate)},
                ${data.address ?? null},
                ${data.notes ?? null},
                ${data.companyId ?? null},
                ${data.projectId ?? null},
                ${createdById},
                (NOW() AT TIME ZONE 'UTC'),
                (NOW() AT TIME ZONE 'UTC')
            )
            RETURNING id
        `;

        const scheduleId = idRows[0].id;

        for (const installerId of data.installerIds) {
            await tx.$executeRaw`
                INSERT INTO "ScheduleInstaller" (id, "scheduleId", "installerId")
                VALUES (gen_random_uuid(), ${scheduleId}, ${installerId})
                ON CONFLICT ("scheduleId", "installerId") DO NOTHING
            `;
        }

        if (data.recurrence) {
            const rec = data.recurrence;

            await tx.$executeRaw`
                INSERT INTO "ScheduleRecurrence" (id, "scheduleId", type, interval, count, "endDate")
                VALUES (
                    gen_random_uuid(),
                    ${scheduleId},
                    ${rec.type},
                    ${rec.interval},
                    ${rec.count ?? null},
                    ${rec.endDate ? this.utcTimestamp(rec.endDate) : Prisma.sql`NULL`}
                )
            `;

            const instances = this.generateInstances(
                new Date(data.startDate),
                new Date(data.endDate),
                rec,
            );

            for (const inst of instances) {
                const childRows = await tx.$queryRaw<[{ id: string }]>`
                    INSERT INTO "Schedule" (
                        id, title, type, status, "startDate", "endDate",
                        address, notes, "companyId", "projectId", "createdById", "parentScheduleId", "updatedAt", "createdAt"
                    ) VALUES (
                        gen_random_uuid(),
                        ${data.title},
                        ${data.type},
                        'SCHEDULED',
                        ${this.utcTimestamp(inst.startDate)},
                        ${this.utcTimestamp(inst.endDate)},
                        ${data.address ?? null},
                        ${data.notes ?? null},
                        ${data.companyId ?? null},
                        ${data.projectId ?? null},
                        ${createdById},
                        ${scheduleId},
                        (NOW() AT TIME ZONE 'UTC'),
                        (NOW() AT TIME ZONE 'UTC')
                    )
                    RETURNING id
                `;
                const childId = childRows[0].id;
                for (const installerId of data.installerIds) {
                    await tx.$executeRaw`
                        INSERT INTO "ScheduleInstaller" (id, "scheduleId", "installerId")
                        VALUES (gen_random_uuid(), ${childId}, ${installerId})
                        ON CONFLICT ("scheduleId", "installerId") DO NOTHING
                    `;
                }
            }
        }

        return this.findById(scheduleId, tx);
    }

    async update(
        id: string,
        data: {
            title?: string;
            type?: string;
            status?: string;
            startDate?: string;
            endDate?: string;
            address?: string | null;
            notes?: string | null;
            companyId?: string | null;
            projectId?: string | null;
            installerIds?: string[];
            allowConflicts?: boolean;
        },
        actorId?: string,
    ) {
        return this.prisma.$transaction(tx => this.updateInTransaction(id, data, tx, actorId));
    }

    async updateInTransaction(
        id: string,
        data: {
            title?: string;
            type?: string;
            status?: string;
            startDate?: string;
            endDate?: string;
            address?: string | null;
            notes?: string | null;
            companyId?: string | null;
            projectId?: string | null;
            installerIds?: string[];
            allowConflicts?: boolean;
        },
        tx: Prisma.TransactionClient,
        actorId?: string,
    ) {
        const linkedId = await tx.projectService.findUnique({ where: { scheduleId: id }, select: { id: true } });
        const tripId = await tx.trip.findUnique({ where: { scheduleId: id }, select: { id: true } });
        if (linkedId) await tx.$queryRaw`SELECT id FROM "ProjectService" WHERE id = ${linkedId.id} FOR UPDATE`;
        if (tripId) await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${tripId.id} FOR UPDATE`;
        const linked = linkedId ? await tx.projectService.findUnique({ where: { scheduleId: id }, include: { project: true, contractors: true } }) : null;
        const trip = tripId ? await tx.trip.findUnique({ where: { scheduleId: id }, include: { contractors: true, services: { select: { scheduleId: true } } } }) : null;
        await tx.$queryRaw`SELECT id FROM "Schedule" WHERE id = ${id} FOR UPDATE`;
        const previous = await this.findById(id, tx);
        if (linked) await this.cycles.validateChange(tx, linked.id, data.status, data.type);
        this.validateInterval(data.startDate ?? previous.startDate, data.endDate ?? previous.endDate);
        if (trip && ((data.type !== undefined && data.type !== 'OTHER') || data.companyId != null || data.projectId != null)) throw new BadRequestException('A viagem não pode ser transformada em serviço ou vinculada a um único projeto');
        if (trip) {
            const terminal = ['DONE', 'CANCELLED'].includes(previous.status);
            if (terminal && Object.keys(data).some(key => key !== 'status')) throw new BadRequestException('Reabra a viagem antes de alterar seu planejamento');
            const next = data.status;
            if (next && next !== previous.status) {
                const permitted = previous.status === 'SCHEDULED' ? ['IN_PROGRESS', 'CANCELLED'] : previous.status === 'IN_PROGRESS' ? ['DONE', 'CANCELLED', 'SCHEDULED'] : ['SCHEDULED'];
                if (!permitted.includes(next)) throw new BadRequestException('Inicie a viagem antes de finalizar. Viagens encerradas devem ser reabertas como planejadas.');
            }
        }
        if (linked || trip) {
          if (linked) {
            if (data.type && !['INSTALLATION', 'REMOVAL'].includes(data.type)) throw new BadRequestException('Projeto aceita somente instalação ou desinstalação');
            if ((data.projectId !== undefined && data.projectId !== linked.projectId) || (data.companyId !== undefined && data.companyId !== linked.project.companyId)) {
                throw new BadRequestException('O vínculo do serviço com o cliente e o projeto não pode ser trocado');
            }
          }
            const contractors = linked?.contractors ?? trip!.contractors;
            const ids = [...new Set(data.installerIds ?? previous.installers.map((user: { id: string }) => user.id))] as string[];
            if (!ids.length && !contractors.length) throw new BadRequestException('Mantenha pelo menos um responsável');
            const changesPlan = data.startDate !== undefined || data.endDate !== undefined || data.installerIds !== undefined;
            if (changesPlan && await tx.internalUser.count({ where: { id: { in: ids }, isActive: true } }) !== ids.length) throw new BadRequestException('Um responsável está inativo ou não existe');
            if (changesPlan && await tx.contractorUser.count({ where: { id: { in: contractors.map(item => item.userId) }, isActive: true } }) !== contractors.length) throw new BadRequestException('Um terceirizado está inativo ou não existe');
            if (!data.allowConflicts && changesPlan) {
                const linkedTrip = linked?.tripId ? await tx.trip.findUnique({ where: { id: linked.tripId }, select: { scheduleId: true } }) : null;
                const count = await this.conflictingAssignments(tx, {
                    startDate: new Date(data.startDate ?? previous.startDate).toISOString(), endDate: new Date(data.endDate ?? previous.endDate).toISOString(),
                    installerIds: ids, contractorIds: contractors.map(item => item.userId),
                    excludeScheduleIds: [id, ...(linkedTrip ? [linkedTrip.scheduleId] : []), ...(trip ? trip.services.flatMap(service => service.scheduleId ? [service.scheduleId] : []) : [])],
                });
                if (count) throw new ConflictException('Há conflito de horário para um responsável. Ajuste as datas ou confirme no formulário.');
            }
        }

        const setClauses: Prisma.Sql[] = [Prisma.sql`"updatedAt" = (NOW() AT TIME ZONE 'UTC')`];

        if (data.status !== undefined && data.status !== previous.status) {
            if (trip && data.status === 'SCHEDULED') setClauses.push(Prisma.sql`"startedAt" = NULL`);
            if (data.status === 'IN_PROGRESS' && !previous.startedAt) setClauses.push(Prisma.sql`"startedAt" = (NOW() AT TIME ZONE 'UTC')`);
            if (data.status === 'DONE') setClauses.push(Prisma.sql`"completedAt" = (NOW() AT TIME ZONE 'UTC')`);
            else if (previous.status === 'DONE') setClauses.push(Prisma.sql`"completedAt" = NULL`);
            if (data.status === 'CANCELLED') setClauses.push(Prisma.sql`"cancelledAt" = (NOW() AT TIME ZONE 'UTC')`);
            else if (previous.status === 'CANCELLED') setClauses.push(Prisma.sql`"cancelledAt" = NULL`);
        }
        if (data.title !== undefined) setClauses.push(Prisma.sql`title = ${data.title}`);
        if (data.type !== undefined) setClauses.push(Prisma.sql`type = ${data.type}`);
        if (data.status !== undefined) setClauses.push(Prisma.sql`status = ${data.status}`);
        if (data.startDate !== undefined) setClauses.push(Prisma.sql`"startDate" = ${this.utcTimestamp(data.startDate)}`);
        if (data.endDate !== undefined) setClauses.push(Prisma.sql`"endDate" = ${this.utcTimestamp(data.endDate)}`);
        if (data.address !== undefined) setClauses.push(Prisma.sql`address = ${data.address}`);
        if (data.notes !== undefined) setClauses.push(Prisma.sql`notes = ${data.notes}`);
        if (data.companyId !== undefined) setClauses.push(Prisma.sql`"companyId" = ${data.companyId}`);
        if (data.projectId !== undefined) setClauses.push(Prisma.sql`"projectId" = ${data.projectId}`);

        if (setClauses.length > 1) {
            await tx.$executeRaw`
                UPDATE "Schedule" SET ${Prisma.join(setClauses, ', ')} WHERE id = ${id}
            `;
        }

        if (data.installerIds !== undefined) {
            await tx.$executeRaw`DELETE FROM "ScheduleInstaller" WHERE "scheduleId" = ${id}`;
            for (const installerId of data.installerIds) {
                await tx.$executeRaw`
                    INSERT INTO "ScheduleInstaller" (id, "scheduleId", "installerId")
                    VALUES (gen_random_uuid(), ${id}, ${installerId})
                    ON CONFLICT ("scheduleId", "installerId") DO NOTHING
                `;
            }
        }

        if (linked) {
            await tx.projectService.update({ where: { id: linked.id }, data: { type: data.type, notes: data.notes } });
            if (data.title !== undefined || data.address !== undefined) {
                await tx.project.update({ where: { id: linked.projectId }, data: { name: data.title, address: data.address } });
            }
            if (data.installerIds !== undefined) {
                await tx.projectServiceInternal.deleteMany({ where: { serviceId: linked.id } });
                const ids = [...new Set(data.installerIds)];
                if (ids.length) await tx.projectServiceInternal.createMany({ data: ids.map(userId => ({ serviceId: linked.id, userId })) });
            }
        }
        if (actorId) await tx.auditLog.create({ data: { action: 'SCHEDULE_UPDATE', entityType: 'Schedule', entityId: id, userId: actorId, createdAt: new Date(),
            details: { previousStatus: previous.status, status: data.status ?? previous.status,
                previousStart: new Date(previous.startDate).toISOString(), previousEnd: new Date(previous.endDate).toISOString(),
                previousStartedAt: previous.startedAt ? new Date(previous.startedAt).toISOString() : null,
                previousCompletedAt: previous.completedAt ? new Date(previous.completedAt).toISOString() : null,
                previousCancelledAt: previous.cancelledAt ? new Date(previous.cancelledAt).toISOString() : null } } });
        return this.findById(id, tx);
    }

    async cancel(id: string, cancelSeries = false, actorId?: string) {
        if (!cancelSeries) {
            await this.update(id, { status: 'CANCELLED' }, actorId);
            return { message: 'Agendamento cancelado' };
        }
        return this.prisma.$transaction(async tx => {
            const schedule = await this.findById(id, tx);
            if (schedule.trip || schedule.projectService) throw new BadRequestException('Este registro não pertence a uma série recorrente. Cancele somente o agendamento.');
            const rootId = schedule.parentScheduleId ?? id;
            await tx.$executeRaw`
                UPDATE "Schedule" SET status = 'CANCELLED', "updatedAt" = (NOW() AT TIME ZONE 'UTC'),
                    "cancelledAt" = CASE WHEN status != 'CANCELLED' THEN (NOW() AT TIME ZONE 'UTC') ELSE "cancelledAt" END
                WHERE id = ${rootId} OR "parentScheduleId" = ${rootId}
            `;
            if (actorId) await tx.auditLog.create({ data: { action: 'SCHEDULE_CANCEL_SERIES', entityType: 'Schedule', entityId: rootId, userId: actorId, createdAt: new Date() } });
            return { message: 'Série de agendamentos cancelada' };
        });
    }

    async checkConflicts(params: {
        installerIds: string[];
        startDate: string;
        endDate: string;
        excludeScheduleId?: string;
    }) {
        const { installerIds, startDate, endDate, excludeScheduleId } = params;
        if (!installerIds.length) return [];

        const excludeClause = excludeScheduleId
            ? Prisma.sql`AND s.id != ${excludeScheduleId}`
            : Prisma.empty;

        return this.prisma.$queryRaw<any[]>`
            SELECT
                s.id, s.title, s."startDate", s."endDate", s.status,
                u.id AS "installerId", u.name AS "installerName"
            FROM "Schedule" s
            JOIN "ScheduleInstaller" si ON si."scheduleId" = s.id
            JOIN "InternalUser" u ON si."installerId" = u.id
            WHERE
                si."installerId" = ANY(${installerIds}::text[])
                AND s.status != 'CANCELLED'
                AND s."startDate" < ${this.utcTimestamp(endDate)}
                AND s."endDate" > ${this.utcTimestamp(startDate)}
                ${excludeClause}
            ORDER BY s."startDate" ASC
        `;
    }

    async findInstallers(onlyActive?: boolean) {
        const whereClause = onlyActive
            ? Prisma.sql`WHERE "isActive" = true AND "agendaActive" = true`
            : Prisma.sql`WHERE "isActive" = true`;

        const rows = await this.prisma.$queryRaw<any[]>`
            SELECT id, name, email, sector, "agendaColor", "agendaActive"
            FROM "InternalUser"
            ${whereClause}
            ORDER BY name ASC
        `;
        return rows;
    }

    async updateInstallerSettings(userId: string, data: { agendaColor?: string; agendaActive?: boolean }) {
        const setClauses: Prisma.Sql[] = [];

        if (data.agendaColor !== undefined) setClauses.push(Prisma.sql`"agendaColor" = ${data.agendaColor}`);
        if (data.agendaActive !== undefined) setClauses.push(Prisma.sql`"agendaActive" = ${data.agendaActive}`);

        if (setClauses.length > 0) {
            await this.prisma.$executeRaw`
                UPDATE "InternalUser" SET ${Prisma.join(setClauses, ', ')} WHERE id = ${userId}
            `;
        }

        const rows = await this.prisma.$queryRaw<any[]>`
            SELECT id, name, email, sector, "agendaColor", "agendaActive"
            FROM "InternalUser" WHERE id = ${userId}
        `;
        if (!rows[0]) throw new NotFoundException('Usuário não encontrado');
        return rows[0];
    }
}
