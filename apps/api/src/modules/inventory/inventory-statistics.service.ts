import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
    InventoryStatistics,
    InventoryStatisticsQuery,
    MovementNature,
    ReplenishmentPriority,
    StockMinimumInput,
    StockRanking,
} from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { movementNatureSql } from './inventory-movement-nature';

@Injectable()
export class InventoryStatisticsService {
    constructor(private readonly prisma: PrismaService) {}

    options() {
        return this.prisma.retry(() => this.prisma.skuItem.findMany({
            select: { id: true, skuCode: true, name: true },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
        }));
    }

    minimums(locationId: string) {
        return this.prisma.retry(() => this.prisma.stockMinimum.findMany({ where: { locationId }, orderBy: { skuId: 'asc' } }));
    }

    async saveMinimum(input: StockMinimumInput, userId: string) {
        return this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "Location" WHERE id = ${input.locationId} FOR SHARE`;
            const location = await tx.location.findUnique({ where: { id: input.locationId } });
            if (!location || location.kind !== 'INTERNAL') throw new BadRequestException('Configure a reserva em um local interno identificado');
            if (!await tx.skuItem.findUnique({ where: { id: input.skuId } })) throw new NotFoundException('Produto nao encontrado');
            const result = await tx.stockMinimum.upsert({
                where: { skuId_locationId: { skuId: input.skuId, locationId: input.locationId } },
                create: { ...input, highOutputThreshold: input.highOutputThreshold ?? null },
                update: { minimum: input.minimum, highOutputThreshold: input.highOutputThreshold ?? null },
            });
            await tx.auditLog.create({ data: { action: 'STOCK_MINIMUM_CONFIGURED', entityType: 'StockMinimum', entityId: result.id, userId, details: input } });
            return result;
        });
    }

    statistics(query: InventoryStatisticsQuery): Promise<InventoryStatistics> {
        return this.prisma.retry(() => this.prisma.$transaction(async tx => {
            const now = new Date();
            const start = new Date(now.getTime() - 30 * 86_400_000);
            const location = query.context === 'WAREHOUSE' && query.locationId
                ? await tx.location.findFirst({ where: { id: query.locationId }, select: { id: true, name: true, kind: true } })
                : null;

            if (query.locationId && (!location || location.kind !== 'INTERNAL')) throw new BadRequestException('Selecione um deposito interno identificado');
            if (query.companyId && !await tx.company.findUnique({ where: { id: query.companyId } })) throw new BadRequestException('Empresa nao encontrada');

            const where: Prisma.AssetWhereInput = {
                status: { not: 'BAIXADO' },
                ...(query.context === 'WAREHOUSE'
                    ? location ? { currentLocationId: location.id } : { currentLocation: { kind: 'INTERNAL' } }
                    : query.context === 'CLIENT'
                        ? { currentLocation: { kind: 'CLIENT', ...(query.companyId ? { companyId: query.companyId } : {}) } }
                        : {}),
            };
            const movementScope = query.context === 'WAREHOUSE'
                ? location
                    ? Prisma.sql`(m."fromLocationId" = ${location.id} OR m."toLocationId" = ${location.id})`
                    : Prisma.sql`(lf.kind = 'INTERNAL' OR lt.kind = 'INTERNAL')`
                : query.context === 'CLIENT'
                    ? Prisma.sql`((lf.kind = 'CLIENT' ${query.companyId ? Prisma.sql`AND lf."companyId" = ${query.companyId}` : Prisma.empty}) OR (lt.kind = 'CLIENT' ${query.companyId ? Prisma.sql`AND lt."companyId" = ${query.companyId}` : Prisma.empty}))`
                    : Prisma.sql`TRUE`;
            const cte = Prisma.sql`WITH movement_data AS (
                SELECT m.*, ${movementNatureSql} AS nature
                FROM "StockMovement" m
                JOIN "MovementType" t ON t.id = m."typeId"
                LEFT JOIN "Location" lf ON lf.id = m."fromLocationId"
                LEFT JOIN "Location" lt ON lt.id = m."toLocationId"
                WHERE m."createdAt" >= (${start.toISOString()}::timestamptz AT TIME ZONE 'UTC')
                  AND m."createdAt" < (${now.toISOString()}::timestamptz AT TIME ZONE 'UTC')
                  AND ${movementScope}
            )`;

            const [skus, assets, unlocated, unclassified, scopeAssets, available, maintenance, movementsRaw, ranksRaw, reserveRaw] = await Promise.all([
                tx.skuItem.count(),
                tx.asset.count(),
                tx.asset.count({ where: { currentLocationId: null, status: { not: 'BAIXADO' } } }),
                tx.asset.count({ where: { currentLocation: { kind: null }, status: { not: 'BAIXADO' } } }),
                tx.asset.count({ where }),
                tx.asset.count({ where: { AND: [where, { status: 'ATIVO', currentLocation: { kind: 'INTERNAL' } }] } }),
                tx.asset.count({ where: { ...where, status: 'EM_MANUTENCAO' } }),
                tx.$queryRaw<{ nature: MovementNature; quantity: bigint; records: bigint }[]>(Prisma.sql`${cte} SELECT nature, SUM(GREATEST(qty, 0)) AS quantity, COUNT(*) AS records FROM movement_data GROUP BY nature ORDER BY nature`),
                tx.$queryRaw<(StockRanking & { direction: 'ENTRY' | 'EXIT' })[]>(Prisma.sql`${cte} SELECT s.id AS "skuId", s."skuCode", s.name, CASE WHEN m.nature IN ('ENTRY','RETURN') THEN 'ENTRY' ELSE 'EXIT' END AS direction, SUM(m.qty)::int AS quantity FROM movement_data m JOIN "SkuItem" s ON s.id = m."skuId" WHERE m.nature IN ('ENTRY','RETURN','SHIPMENT','EXIT','WRITE_OFF') GROUP BY s.id, s."skuCode", s.name, direction ORDER BY quantity DESC, s."skuCode" ASC`),
                location ? tx.$queryRaw<(ReplenishmentPriority & { highOutputThreshold: number | null })[]>(Prisma.sql`${cte}, output AS (SELECT "skuId", SUM(qty)::int AS quantity FROM movement_data WHERE nature IN ('SHIPMENT','EXIT','WRITE_OFF') AND "fromLocationId" = ${location.id} GROUP BY "skuId"), availability AS (SELECT "skuId", COUNT(*)::int AS quantity FROM "Asset" WHERE "currentLocationId" = ${location.id} AND status = 'ATIVO' GROUP BY "skuId") SELECT s.id AS "skuId", s."skuCode", s.name, COALESCE(a.quantity, 0)::int AS available, COALESCE(o.quantity,0)::int AS "output30", r.minimum, r."highOutputThreshold" FROM "SkuItem" s LEFT JOIN availability a ON a."skuId" = s.id LEFT JOIN output o ON o."skuId" = s.id LEFT JOIN "StockMinimum" r ON r."skuId" = s.id AND r."locationId" = ${location.id}`) : Promise.resolve([]),
            ]);

            const priorities: ReplenishmentPriority[] = reserveRaw.flatMap(row => {
                const below = row.minimum !== null && row.available < row.minimum;
                const zero = row.available === 0 && row.output30 > 0;
                const high = row.highOutputThreshold !== null && row.output30 >= row.highOutputThreshold;
                return below || zero || high ? [{
                    skuId: row.skuId, skuCode: row.skuCode, name: row.name, available: row.available, output30: row.output30,
                    minimum: row.minimum, shortage: row.minimum === null ? null : Math.max(0, row.minimum - row.available),
                    reason: below ? 'BELOW_MINIMUM' as const : zero ? 'ZERO_RECENT_OUTPUT' as const : 'HIGH_OUTPUT' as const,
                    critical: below || zero,
                }] : [];
            });
            priorities.sort((a, b) => Number(b.critical) - Number(a.critical) || Number(b.available === 0) - Number(a.available === 0) || b.output30 - a.output30 || (b.shortage ?? 0) - (a.shortage ?? 0) || a.skuCode.localeCompare(b.skuCode));
            const rank = (direction: 'ENTRY' | 'EXIT') => ranksRaw.filter(row => row.direction === direction).slice(0, 10).map(({ direction: _, ...row }) => ({ ...row, quantity: Number(row.quantity) }));

            let clientInsights: InventoryStatistics['clientInsights'] = null;
            if (query.context === 'CLIENT') {
                const companyFilter = query.companyId ? Prisma.sql`AND l."companyId" = ${query.companyId}` : Prisma.empty;
                const [projectCount, topUsedItems, topWriteOffItems, topProjects] = await Promise.all([
                    tx.$queryRaw<{ count: number }[]>(Prisma.sql`SELECT COUNT(DISTINCT l."projectId")::int AS count FROM "Asset" a JOIN "Location" l ON l.id = a."currentLocationId" WHERE a.status <> 'BAIXADO' AND l.kind = 'CLIENT' AND l."projectId" IS NOT NULL ${companyFilter}`),
                    tx.$queryRaw<StockRanking[]>(Prisma.sql`SELECT s.id AS "skuId", s."skuCode", s.name, COUNT(*)::int AS quantity FROM "Asset" a JOIN "SkuItem" s ON s.id = a."skuId" JOIN "Location" l ON l.id = a."currentLocationId" WHERE a.status <> 'BAIXADO' AND l.kind = 'CLIENT' ${companyFilter} GROUP BY s.id, s."skuCode", s.name ORDER BY quantity DESC, s."skuCode" ASC LIMIT 10`),
                    tx.$queryRaw<StockRanking[]>(Prisma.sql`SELECT s.id AS "skuId", s."skuCode", s.name, SUM(m.qty)::int AS quantity FROM "StockMovement" m JOIN "MovementType" t ON t.id = m."typeId" JOIN "SkuItem" s ON s.id = m."skuId" JOIN "Location" l ON l.id = m."fromLocationId" WHERE m."createdAt" >= (${start.toISOString()}::timestamptz AT TIME ZONE 'UTC') AND m."createdAt" < (${now.toISOString()}::timestamptz AT TIME ZONE 'UTC') AND l.kind = 'CLIENT' ${companyFilter} AND ${movementNatureSql} = 'WRITE_OFF' GROUP BY s.id, s."skuCode", s.name ORDER BY quantity DESC, s."skuCode" ASC LIMIT 10`),
                    tx.$queryRaw<{ projectId: string; name: string; companyName: string; quantity: number }[]>(Prisma.sql`SELECT p.id AS "projectId", p.name, c.name AS "companyName", COUNT(*)::int AS quantity FROM "Asset" a JOIN "Location" l ON l.id = a."currentLocationId" JOIN "Project" p ON p.id = l."projectId" JOIN "Company" c ON c.id = l."companyId" WHERE a.status <> 'BAIXADO' AND l.kind = 'CLIENT' ${companyFilter} GROUP BY p.id, p.name, c.name ORDER BY quantity DESC, p.name ASC LIMIT 10`),
                ]);
                clientInsights = {
                    projectsWithAssets: Number(projectCount[0]?.count ?? 0),
                    writeOffs30: Number(movementsRaw.find(movement => movement.nature === 'WRITE_OFF')?.quantity ?? 0),
                    topUsedItems: topUsedItems.map(item => ({ ...item, quantity: Number(item.quantity) })),
                    topWriteOffItems: topWriteOffItems.map(item => ({ ...item, quantity: Number(item.quantity) })),
                    topProjects: topProjects.map(project => ({ ...project, quantity: Number(project.quantity) })),
                };
            }

            return {
                generatedAt: now.toISOString(), period: { start: start.toISOString(), end: now.toISOString() }, context: query.context,
                location: location ? { id: location.id, name: location.name } : null,
                totals: { skus, assets, unlocated, unclassified }, scope: { assets: scopeAssets, available, maintenance },
                movements: movementsRaw.map(row => ({ ...row, quantity: Number(row.quantity), records: Number(row.records) })),
                topEntries: rank('ENTRY'), topExits: rank('EXIT'), priorities: priorities.slice(0, 10),
                criticalCount: priorities.filter(priority => priority.critical).length,
                minimumConfiguredCount: reserveRaw.filter(row => row.minimum !== null).length,
                replenishmentConfigured: query.context === 'WAREHOUSE' && Boolean(location), clientInsights,
            };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 }));
    }
}
