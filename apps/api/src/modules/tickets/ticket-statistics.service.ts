import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { TicketSource, TicketStatistics, TicketStatisticsQuery } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';

type SummaryRow = {
    opened: bigint; closed: bigint; pending: bigint; inProgress: bigint;
    waitingClient: bigint; resolved: bigint; attention: bigint;
    averagePendingSeconds: number | null; oldestPendingAt: Date | null;
};

@Injectable()
export class TicketStatisticsService {
    constructor(private readonly prisma: PrismaService) {}

    async get(query: TicketStatisticsQuery, actor: { id: string; role?: { name: string } }): Promise<TicketStatistics> {
        const now = new Date();
        const start = new Date(query.start), end = new Date(query.end);
        // Prisma stores these DateTime columns as UTC timestamp without time zone.
        const startUtc = Prisma.sql`(${start.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
        const endUtc = Prisma.sql`(${end.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
        const nowUtc = Prisma.sql`(${now.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
        const clientAttentionUtc = Prisma.sql`(${new Date(now.getTime() - 3_600_000).toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
        const internalAttentionUtc = Prisma.sql`(${new Date(now.getTime() - 5 * 3_600_000).toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
        const manager = ['Administrador', 'Gestor'].includes(actor.role?.name ?? '');
        // Match the board: everyone sees open tickets; other states are their own assignments.
        const source = query.source === 'ALL' ? Prisma.sql`TRUE` : Prisma.sql`t.source = ${query.source}`;
        const scope = manager ? Prisma.sql`TRUE` : Prisma.sql`(t.status = 'OPEN' OR t."assignedToInternalUserId" = ${actor.id})`;
        const where = Prisma.sql`${source} AND ${scope}`;
        const [rows, sectors] = await this.prisma.retry(() => this.prisma.$transaction([
            this.prisma.$queryRaw<SummaryRow[]>(Prisma.sql`
                SELECT
                    COUNT(*) FILTER (WHERE t."createdAt" >= ${startUtc} AND t."createdAt" < ${endUtc}) AS opened,
                    COUNT(*) FILTER (WHERE t.status = 'CLOSED' AND t."closedAt" >= ${startUtc} AND t."closedAt" < ${endUtc}) AS closed,
                    COUNT(*) FILTER (WHERE t.status = 'OPEN' AND t."closedAt" IS NULL AND t."assignedToInternalUserId" IS NULL) AS pending,
                    COUNT(*) FILTER (WHERE t.status = 'IN_PROGRESS' AND t."closedAt" IS NULL) AS "inProgress",
                    COUNT(*) FILTER (WHERE t.status = 'WAITING_CLIENT' AND t."closedAt" IS NULL) AS "waitingClient",
                    COUNT(*) FILTER (WHERE t.status = 'RESOLVED') AS resolved,
                    COUNT(*) FILTER (WHERE t.status IN ('OPEN', 'IN_PROGRESS') AND t."closedAt" IS NULL AND (
                        (t.source = 'INTERNAL' AND t."createdAt" <= ${internalAttentionUtc}) OR
                        (t.source = 'CLIENT' AND t."createdAt" <= ${clientAttentionUtc})
                    )) AS attention,
                    AVG(GREATEST(0, EXTRACT(EPOCH FROM (${nowUtc} - t."createdAt"))))
                        FILTER (WHERE t.status = 'OPEN' AND t."closedAt" IS NULL AND t."assignedToInternalUserId" IS NULL)::float8 AS "averagePendingSeconds",
                    MIN(t."createdAt") FILTER (WHERE t.status = 'OPEN' AND t."closedAt" IS NULL AND t."assignedToInternalUserId" IS NULL) AS "oldestPendingAt"
                FROM "Ticket" t WHERE ${where}
            `),
            this.prisma.$queryRaw<{ source: TicketSource; name: string; openedInPeriod: bigint }[]>(Prisma.sql`
                SELECT t.source, CASE WHEN t.source = 'INTERNAL' THEN COALESCE(NULLIF(BTRIM(u.sector), ''), 'Sem setor')
                    ELSE COALESCE(NULLIF(BTRIM(c.name), ''), NULLIF(BTRIM(ec.name), ''), 'Cliente não identificado') END AS name,
                    COUNT(*) AS "openedInPeriod"
                FROM "Ticket" t
                LEFT JOIN "InternalUser" u ON u.id = t."internalUserId"
                LEFT JOIN "Company" c ON c.id = t."companyId"
                LEFT JOIN "ExternalUser" e ON e.id = t."externalUserId"
                LEFT JOIN "Company" ec ON ec.id = e."companyId"
                WHERE ${where} AND t."createdAt" >= ${startUtc} AND t."createdAt" < ${endUtc}
                GROUP BY 1, 2 ORDER BY COUNT(*) DESC, name ASC, t.source ASC
            `),
        ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
        const row = rows[0];
        return {
            generatedAt: now.toISOString(), source: query.source, scope: manager ? 'ALL' : 'OPEN_AND_ASSIGNED',
            period: { start: start.toISOString(), end: end.toISOString() },
            openedInPeriod: Number(row.opened), closedInPeriod: Number(row.closed),
            current: {
                pending: Number(row.pending), inProgress: Number(row.inProgress), waitingClient: Number(row.waitingClient),
                resolved: Number(row.resolved), needingAttention: Number(row.attention),
                averagePendingSeconds: row.averagePendingSeconds === null ? null : Math.round(row.averagePendingSeconds),
                oldestPendingAt: row.oldestPendingAt?.toISOString() ?? null,
            },
            sectors: sectors.map(sector => ({ source: sector.source, name: sector.name, openedInPeriod: Number(sector.openedInPeriod) })),
        };
    }
}
