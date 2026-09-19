import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { OperationsStatistics, OperationsStatisticsQuery, OperationServiceHighlight, OperationTripHighlight } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';

type ServiceRow = Omit<OperationServiceHighlight, 'startDate' | 'endDate' | 'completedAt'> & { startDate: Date | null; endDate: Date | null; completedAt: Date | null };
type TripRow = Omit<OperationTripHighlight, 'startDate' | 'endDate' | 'serviceCount'> & { startDate: Date; endDate: Date; serviceCount: bigint };

@Injectable()
export class OperationsStatisticsService {
    constructor(private readonly prisma: PrismaService) {}

    async get(query: OperationsStatisticsQuery): Promise<OperationsStatistics> {
        const now = new Date(), start = new Date(query.start).toISOString(), end = new Date(query.end).toISOString();
        const utc = (date: string) => Prisma.sql`(${date}::timestamptz AT TIME ZONE 'UTC')`;
        const startUtc = utc(start), endUtc = utc(end), nowUtc = utc(now.toISOString());
        const state = Prisma.sql`COALESCE(s.status, CASE WHEN p."cancelledAt" IS NOT NULL THEN 'CANCELLED' ELSE 'PENDING' END)`;
        const base = Prisma.sql`FROM "ProjectService" p LEFT JOIN "Schedule" s ON s.id = p."scheduleId"`;
        const completed = Prisma.sql`s.status = 'DONE' AND s."completedAt" >= ${startUtc} AND s."completedAt" < ${endUtc}`;
        const active = Prisma.sql`${state} IN ('PENDING', 'SCHEDULED', 'IN_PROGRESS')`;
        const services = (where: Prisma.Sql, order: Prisma.Sql) => this.prisma.$queryRaw<ServiceRow[]>(Prisma.sql`
            SELECT p.id, p."projectId", project.name, company.name AS "companyName", p.type, ${state} AS status,
                marker.name AS "markerName", p.urgency, p.color, p.relevant, s."startDate", s."endDate", s."completedAt"
            ${base} JOIN "Project" project ON project.id = p."projectId" JOIN "Company" company ON company.id = project."companyId"
            LEFT JOIN "ProjectServiceMarker" marker ON marker.id = p."markerId"
            WHERE ${where} ORDER BY ${order}, p.id ASC LIMIT 5`);
        const [serviceSummary, tripSummary, nextInstallations, relevantInstallations, latestInstallations, latestRemovals, nextInterstateTrips] = await this.prisma.retry(() => this.prisma.$transaction([
            this.prisma.$queryRaw<{ installations: bigint; removals: bigint; missing: bigint; withoutBooking: bigint; unclassified: bigint }[]>(Prisma.sql`
                SELECT COUNT(*) FILTER (WHERE p.type = 'INSTALLATION' AND ${completed}) AS installations,
                    COUNT(*) FILTER (WHERE p.type = 'REMOVAL' AND ${completed}) AS removals,
                    COUNT(*) FILTER (WHERE s.status = 'DONE' AND s."completedAt" IS NULL) AS missing,
                    COUNT(*) FILTER (WHERE ${active} AND p."requiresTravel" AND (t.id IS NULL OR travel.status = 'CANCELLED')) AS "withoutBooking",
                    COUNT(*) FILTER (WHERE ${state} NOT IN ('PENDING','SCHEDULED','IN_PROGRESS','DONE','CANCELLED') OR p.type NOT IN ('INSTALLATION','REMOVAL')) AS unclassified
                ${base} LEFT JOIN "Trip" t ON t.id = p."tripId" LEFT JOIN "Schedule" travel ON travel.id = t."scheduleId"`),
            this.prisma.$queryRaw<{ planned: bigint; completed: bigint; currentPlanned: bigint; inProgress: bigint; missing: bigint; unclassified: bigint }[]>(Prisma.sql`
                SELECT COUNT(*) FILTER (WHERE s.status IN ('SCHEDULED','IN_PROGRESS') AND s."startDate" >= ${startUtc} AND s."startDate" < ${endUtc}) AS planned,
                    COUNT(*) FILTER (WHERE s.status = 'DONE' AND s."completedAt" >= ${startUtc} AND s."completedAt" < ${endUtc}) AS completed,
                    COUNT(*) FILTER (WHERE s.status = 'SCHEDULED') AS "currentPlanned", COUNT(*) FILTER (WHERE s.status = 'IN_PROGRESS') AS "inProgress",
                    COUNT(*) FILTER (WHERE s.status = 'DONE' AND s."completedAt" IS NULL) AS missing,
                    COUNT(*) FILTER (WHERE s.status NOT IN ('SCHEDULED','IN_PROGRESS','DONE','CANCELLED')) AS unclassified
                FROM "Trip" t JOIN "Schedule" s ON s.id = t."scheduleId"`),
            services(Prisma.sql`p.type = 'INSTALLATION' AND s.status = 'SCHEDULED' AND s."startDate" >= ${nowUtc}`, Prisma.sql`s."startDate" ASC, p.urgency DESC`),
            services(Prisma.sql`p.type = 'INSTALLATION' AND p.relevant AND ${active}`, Prisma.sql`p.urgency DESC, p."createdAt" ASC`),
            services(Prisma.sql`p.type = 'INSTALLATION' AND ${completed}`, Prisma.sql`s."completedAt" DESC`),
            services(Prisma.sql`p.type = 'REMOVAL' AND ${completed}`, Prisma.sql`s."completedAt" DESC`),
            this.prisma.$queryRaw<TripRow[]>(Prisma.sql`
                SELECT t.id, s.title, t."originCity", t."originState", t."destinationCity", t."destinationState", s."startDate", s."endDate",
                    (SELECT COUNT(*) FROM "ProjectService" p WHERE p."tripId" = t.id) AS "serviceCount"
                FROM "Trip" t JOIN "Schedule" s ON s.id = t."scheduleId"
                WHERE s.status = 'SCHEDULED' AND s."startDate" >= ${nowUtc} AND t."originState" <> t."destinationState"
                ORDER BY s."startDate" ASC, t.id ASC LIMIT 5`),
        ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
        const service = serviceSummary[0], trip = tripSummary[0];
        const rows = (values: ServiceRow[]) => values.map(row => ({ ...row, startDate: row.startDate?.toISOString() ?? null, endDate: row.endDate?.toISOString() ?? null, completedAt: row.completedAt?.toISOString() ?? null }));
        return {
            generatedAt: now.toISOString(), period: { start, end }, installationsCompleted: Number(service.installations), removalsCompleted: Number(service.removals),
            tripsPlanned: Number(trip.planned), tripsCompleted: Number(trip.completed), current: { plannedTrips: Number(trip.currentPlanned), tripsInProgress: Number(trip.inProgress) },
            dataQuality: { servicesCompletedWithoutDate: Number(service.missing), tripsCompletedWithoutDate: Number(trip.missing), travelWithoutBooking: Number(service.withoutBooking), unclassified: Number(service.unclassified) + Number(trip.unclassified) },
            nextInstallations: rows(nextInstallations), relevantInstallations: rows(relevantInstallations), latestInstallations: rows(latestInstallations), latestRemovals: rows(latestRemovals),
            nextInterstateTrips: nextInterstateTrips.map(row => ({ ...row, startDate: row.startDate.toISOString(), endDate: row.endDate.toISOString(), serviceCount: Number(row.serviceCount) })),
        };
    }
}
