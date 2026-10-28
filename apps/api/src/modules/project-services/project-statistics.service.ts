import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ProjectDashboardHighlight, ProjectStatistics, ProjectStatisticsQuery } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';

type Summary = {
    total: bigint; pending: bigint; scheduled: bigint; inProgress: bigint; done: bigint; cancelled: bigint;
    completedInPeriod: bigint; cancelledInPeriod: bigint; completedWithoutDate: bigint; cancelledWithoutDate: bigint; unclassified: bigint;
};
type Highlight = Omit<ProjectDashboardHighlight, 'startDate' | 'endDate'> & { startDate: Date | null; endDate: Date | null };

@Injectable()
export class ProjectStatisticsService {
    constructor(private readonly prisma: PrismaService) {}

    async get(query: ProjectStatisticsQuery, includeChronogram = true): Promise<ProjectStatistics> {
        const now = new Date();
        const start = new Date(query.start).toISOString(), end = new Date(query.end).toISOString();
        // Prisma DateTime columns store UTC without a time zone. Never use planned dates for historical totals.
        const startUtc = Prisma.sql`(${start}::timestamptz AT TIME ZONE 'UTC')`;
        const endUtc = Prisma.sql`(${end}::timestamptz AT TIME ZONE 'UTC')`;
        const state = Prisma.sql`COALESCE(s.status, CASE WHEN p."cancelledAt" IS NOT NULL THEN 'CANCELLED' ELSE 'PENDING' END)`;
        const cancellation = Prisma.sql`CASE WHEN s.id IS NOT NULL THEN s."cancelledAt" ELSE p."cancelledAt" END`;
        const base = Prisma.sql`FROM "ProjectService" p LEFT JOIN "Schedule" s ON s.id = p."scheduleId"`;
        const filter = query.type === 'ALL' ? Prisma.sql`TRUE` : Prisma.sql`p.type = ${query.type}`;
        // All joins are one-to-one: assignees, free events and recurrences cannot multiply projects.
        const [summary, highlights, categories, actions] = await this.prisma.retry(() => this.prisma.$transaction([
            this.prisma.$queryRaw<Summary[]>(Prisma.sql`
                SELECT COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE ${state} = 'PENDING') AS pending,
                    COUNT(*) FILTER (WHERE ${state} = 'SCHEDULED') AS scheduled,
                    COUNT(*) FILTER (WHERE ${state} = 'IN_PROGRESS') AS "inProgress",
                    COUNT(*) FILTER (WHERE ${state} = 'DONE') AS done,
                    COUNT(*) FILTER (WHERE ${state} = 'CANCELLED') AS cancelled,
                    COUNT(*) FILTER (WHERE ${state} = 'DONE' AND s."completedAt" >= ${startUtc} AND s."completedAt" < ${endUtc}) AS "completedInPeriod",
                    COUNT(*) FILTER (WHERE ${state} = 'CANCELLED' AND ${cancellation} >= ${startUtc} AND ${cancellation} < ${endUtc}) AS "cancelledInPeriod",
                    COUNT(*) FILTER (WHERE ${state} = 'DONE' AND s."completedAt" IS NULL) AS "completedWithoutDate",
                    COUNT(*) FILTER (WHERE ${state} = 'CANCELLED' AND ${cancellation} IS NULL) AS "cancelledWithoutDate",
                    COUNT(*) FILTER (WHERE ${state} NOT IN ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'DONE', 'CANCELLED')) AS unclassified
                ${base} WHERE ${filter}
            `),
            this.prisma.$queryRaw<Highlight[]>(Prisma.sql`
                SELECT p.id, p."projectId", project.name, company.name AS "companyName", p.type,
                    ${state} AS status, marker.name AS "markerName", p.urgency, p.color, p.relevant,
                    s."startDate", s."endDate"
                ${base} JOIN "Project" project ON project.id = p."projectId"
                JOIN "Company" company ON company.id = project."companyId"
                LEFT JOIN "ProjectServiceMarker" marker ON marker.id = p."markerId"
                WHERE ${filter} AND ${state} IN ('PENDING', 'SCHEDULED', 'IN_PROGRESS')
                ORDER BY p.urgency DESC, p.relevant DESC, p."createdAt" ASC, p.id ASC LIMIT 5
            `),
            this.prisma.$queryRaw<{ type: string; category: string | null; total: bigint }[]>(includeChronogram ? Prisma.sql`
                SELECT p.type, p.specifications->>'category' AS category, COUNT(*) AS total ${base}
                WHERE ${filter} AND ${state} = 'DONE' AND s."completedAt" >= ${startUtc} AND s."completedAt" < ${endUtc}
                GROUP BY p.type, p.specifications->>'category'
            ` : Prisma.sql`SELECT NULL::text AS type, NULL::text AS category, 0::bigint AS total WHERE FALSE`),
            this.prisma.$queryRaw<{ open: bigint; projects: bigint; missingDate: bigint }[]>(includeChronogram ? Prisma.sql`
                SELECT COALESCE(SUM((SELECT COUNT(*) FROM "ProjectServicePending" a WHERE a."serviceId" = p.id AND a."resolvedAt" IS NULL)), 0)::bigint AS open,
                    COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "ProjectServicePending" a WHERE a."serviceId" = p.id AND a."resolvedAt" IS NULL)) AS projects,
                    COUNT(*) FILTER (WHERE (${state} = 'DONE' OR p.planning->>'stage' = 'concluido') AND s."completedAt" IS NULL) AS "missingDate"
                ${base} WHERE ${filter}
            ` : Prisma.sql`SELECT 0::bigint AS open, 0::bigint AS projects, 0::bigint AS "missingDate"`),
        ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
        const row = summary[0];
        const pending = Number(row.pending), scheduled = Number(row.scheduled), inProgress = Number(row.inProgress);
        const split = (type: string) => {
            const rows = categories.filter(item => item.type === type), sum = (category?: string) => rows.filter(item => category === undefined || item.category === category).reduce((count, item) => count + Number(item.total), 0);
            const total = sum(), rooms = sum('sala'), screens = sum('tela');
            return { total, rooms, screens, unknown: total - rooms - screens };
        };
        return {
            ...(includeChronogram ? { chronogram: { completed: { installations: split('INSTALLATION'), removals: split('REMOVAL') }, actions: { open: Number(actions[0].open), projects: Number(actions[0].projects) }, completionWithoutRealDate: Number(actions[0].missingDate) } } : {}),
            generatedAt: now.toISOString(), type: query.type, period: { start, end },
            current: { total: Number(row.total), active: pending + scheduled + inProgress, pending, scheduled, inProgress,
                done: Number(row.done), cancelled: Number(row.cancelled) },
            completedInPeriod: Number(row.completedInPeriod), cancelledInPeriod: Number(row.cancelledInPeriod),
            dataQuality: { completedWithoutDate: Number(row.completedWithoutDate), cancelledWithoutDate: Number(row.cancelledWithoutDate), unclassified: Number(row.unclassified) },
            highlights: highlights.map(row => ({ ...row, startDate: row.startDate?.toISOString() ?? null, endDate: row.endDate?.toISOString() ?? null })),
        };
    }
}
