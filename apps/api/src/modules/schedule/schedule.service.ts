import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ScheduleService {
    constructor(private readonly prisma: PrismaService) {}

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
            conditions.push(Prisma.sql`s."startDate" >= ${new Date(params.startDate)}`);
        }
        if (params.endDate) {
            conditions.push(Prisma.sql`s."endDate" <= ${new Date(params.endDate)}`);
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
            ORDER BY s."startDate" ASC
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

        return { data: schedules, total: Number(countRow.count) };
    }

    async findById(id: string) {
        const rows = await this.prisma.$queryRaw<any[]>`
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

        const installers = await this.prisma.$queryRaw<any[]>`
            SELECT u.id, u.name, u.email, u.sector, u."agendaColor"
            FROM "ScheduleInstaller" si
            JOIN "InternalUser" u ON si."installerId" = u.id
            WHERE si."scheduleId" = ${id}
        `;
        schedule.installers = installers;

        const recRows = await this.prisma.$queryRaw<any[]>`
            SELECT * FROM "ScheduleRecurrence" WHERE "scheduleId" = ${id}
        `;
        schedule.recurrence = recRows[0] ?? null;

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
        const idRows = await this.prisma.$queryRaw<[{ id: string }]>`
            INSERT INTO "Schedule" (
                id, title, type, status, "startDate", "endDate",
                address, notes, "companyId", "projectId", "createdById", "updatedAt"
            ) VALUES (
                gen_random_uuid(),
                ${data.title},
                ${data.type},
                'SCHEDULED',
                ${new Date(data.startDate)},
                ${new Date(data.endDate)},
                ${data.address ?? null},
                ${data.notes ?? null},
                ${data.companyId ?? null},
                ${data.projectId ?? null},
                ${createdById},
                NOW()
            )
            RETURNING id
        `;

        const scheduleId = idRows[0].id;

        for (const installerId of data.installerIds) {
            await this.prisma.$executeRaw`
                INSERT INTO "ScheduleInstaller" (id, "scheduleId", "installerId")
                VALUES (gen_random_uuid(), ${scheduleId}, ${installerId})
                ON CONFLICT ("scheduleId", "installerId") DO NOTHING
            `;
        }

        if (data.recurrence) {
            const rec = data.recurrence;

            await this.prisma.$executeRaw`
                INSERT INTO "ScheduleRecurrence" (id, "scheduleId", type, interval, count, "endDate")
                VALUES (
                    gen_random_uuid(),
                    ${scheduleId},
                    ${rec.type},
                    ${rec.interval},
                    ${rec.count ?? null},
                    ${rec.endDate ? new Date(rec.endDate) : null}
                )
            `;

            const instances = this.generateInstances(
                new Date(data.startDate),
                new Date(data.endDate),
                rec,
            );

            for (const inst of instances) {
                const childRows = await this.prisma.$queryRaw<[{ id: string }]>`
                    INSERT INTO "Schedule" (
                        id, title, type, status, "startDate", "endDate",
                        address, notes, "companyId", "projectId", "createdById", "parentScheduleId", "updatedAt"
                    ) VALUES (
                        gen_random_uuid(),
                        ${data.title},
                        ${data.type},
                        'SCHEDULED',
                        ${inst.startDate},
                        ${inst.endDate},
                        ${data.address ?? null},
                        ${data.notes ?? null},
                        ${data.companyId ?? null},
                        ${data.projectId ?? null},
                        ${createdById},
                        ${scheduleId},
                        NOW()
                    )
                    RETURNING id
                `;
                const childId = childRows[0].id;
                for (const installerId of data.installerIds) {
                    await this.prisma.$executeRaw`
                        INSERT INTO "ScheduleInstaller" (id, "scheduleId", "installerId")
                        VALUES (gen_random_uuid(), ${childId}, ${installerId})
                        ON CONFLICT ("scheduleId", "installerId") DO NOTHING
                    `;
                }
            }
        }

        return this.findById(scheduleId);
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
        },
    ) {
        await this.findById(id);

        const setClauses: Prisma.Sql[] = [Prisma.sql`"updatedAt" = NOW()`];

        if (data.title !== undefined) setClauses.push(Prisma.sql`title = ${data.title}`);
        if (data.type !== undefined) setClauses.push(Prisma.sql`type = ${data.type}`);
        if (data.status !== undefined) setClauses.push(Prisma.sql`status = ${data.status}`);
        if (data.startDate !== undefined) setClauses.push(Prisma.sql`"startDate" = ${new Date(data.startDate)}`);
        if (data.endDate !== undefined) setClauses.push(Prisma.sql`"endDate" = ${new Date(data.endDate)}`);
        if (data.address !== undefined) setClauses.push(Prisma.sql`address = ${data.address}`);
        if (data.notes !== undefined) setClauses.push(Prisma.sql`notes = ${data.notes}`);
        if (data.companyId !== undefined) setClauses.push(Prisma.sql`"companyId" = ${data.companyId}`);
        if (data.projectId !== undefined) setClauses.push(Prisma.sql`"projectId" = ${data.projectId}`);

        if (setClauses.length > 1) {
            await this.prisma.$executeRaw`
                UPDATE "Schedule" SET ${Prisma.join(setClauses, ', ')} WHERE id = ${id}
            `;
        }

        if (data.installerIds !== undefined) {
            await this.prisma.$executeRaw`DELETE FROM "ScheduleInstaller" WHERE "scheduleId" = ${id}`;
            for (const installerId of data.installerIds) {
                await this.prisma.$executeRaw`
                    INSERT INTO "ScheduleInstaller" (id, "scheduleId", "installerId")
                    VALUES (gen_random_uuid(), ${id}, ${installerId})
                    ON CONFLICT ("scheduleId", "installerId") DO NOTHING
                `;
            }
        }

        return this.findById(id);
    }

    async cancel(id: string, cancelSeries = false) {
        const schedule = await this.findById(id);

        if (cancelSeries) {
            const rootId = (schedule as any).parentScheduleId ?? id;
            await this.prisma.$executeRaw`
                UPDATE "Schedule"
                SET status = 'CANCELLED', "updatedAt" = NOW()
                WHERE id = ${rootId} OR "parentScheduleId" = ${rootId}
            `;
            return { message: 'Série de agendamentos cancelada' };
        }

        await this.prisma.$executeRaw`
            UPDATE "Schedule" SET status = 'CANCELLED', "updatedAt" = NOW() WHERE id = ${id}
        `;
        return { message: 'Agendamento cancelado' };
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
                AND s."startDate" < ${new Date(endDate)}
                AND s."endDate" > ${new Date(startDate)}
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
