import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class InventoryQueriesService {
    constructor(private readonly prisma: PrismaService) {}

    async findAllMovements(params?: { skuId?: string; locationId?: string; typeId?: string; search?: string; skip?: number; take?: number }) {
        const filters: any[] = [];
        if (params?.skuId) filters.push({ skuId: params.skuId });
        if (params?.locationId) filters.push({ OR: [{ fromLocationId: params.locationId }, { toLocationId: params.locationId }] });
        if (params?.typeId) filters.push({ typeId: params.typeId });
        if (params?.search?.trim()) {
            const s = params.search.trim();
            filters.push({
                OR: [
                    { sku: { skuCode: { contains: s, mode: 'insensitive' as const } } },
                    { sku: { name: { contains: s, mode: 'insensitive' as const } } },
                    { asset: { assetCode: { contains: s, mode: 'insensitive' as const } } },
                    { reason: { contains: s, mode: 'insensitive' as const } },
                    { createdBy: { name: { contains: s, mode: 'insensitive' as const } } },
                    { type: { name: { contains: s, mode: 'insensitive' as const } } },
                    { fromLocation: { name: { contains: s, mode: 'insensitive' as const } } },
                    { toLocation: { name: { contains: s, mode: 'insensitive' as const } } },
                ],
            });
        }
        const where = filters.length ? { AND: filters } : {};
        const [data, total] = await Promise.all([
            this.prisma.stockMovement.findMany({
                where,
                include: {
                    type: { select: { name: true } },
                    sku: { select: { skuCode: true, name: true } },
                    asset: { select: { assetCode: true } },
                    fromLocation: { select: { name: true } },
                    toLocation: { select: { name: true } },
                    createdBy: { select: { name: true } },
                    mediaAttachments: {
                        select: { id: true, fileName: true, filePath: true, mimeType: true, mediaType: true, createdAt: true },
                        orderBy: { createdAt: 'desc' },
                    },
                },
                orderBy: { createdAt: 'desc' },
                ...(params?.skip !== undefined ? { skip: params.skip, take: params.take } : {}),
            }),
            this.prisma.stockMovement.count({ where }),
        ]);
        return { data, total };
    }

    async getBalances(params?: { locationId?: string; skuId?: string }) {
        const where: any = {
            status: { notIn: ['BAIXADO'] },
            currentLocationId: { not: null },
            ...(params?.locationId ? { currentLocationId: params.locationId } : {}),
            ...(params?.skuId ? { skuId: params.skuId } : {}),
        };

        const grouped = await this.prisma.asset.groupBy({
            by: ['skuId', 'currentLocationId'],
            where,
            _count: { id: true },
        });

        const skuIdsInStock = new Set(grouped.map((g) => g.skuId));
        const locationIds = [...new Set(grouped.map((g) => g.currentLocationId).filter(Boolean) as string[])];

        // Sem filtro: traz TODOS os itens cadastrados (os sem estoque entram com
        // quantidade 0), para o usuário ver o catálogo completo em Saldos.
        const includeZero = !params?.locationId && !params?.skuId;

        const [skus, locations] = await Promise.all([
            this.prisma.skuItem.findMany({
                where: includeZero ? {} : { id: { in: [...skuIdsInStock] } },
                select: { id: true, skuCode: true, name: true, brand: true, category: { select: { name: true } } },
            }),
            this.prisma.location.findMany({ where: { id: { in: locationIds } }, select: { id: true, name: true } }),
        ]);

        const skuMap = new Map(skus.map((s) => [s.id, s]));
        const locMap = new Map(locations.map((l) => [l.id, l]));

        const rows: any[] = grouped.map((g) => ({
            skuId: g.skuId,
            locationId: g.currentLocationId,
            quantity: (g._count as any).id ?? 0,
            sku: skuMap.get(g.skuId),
            location: locMap.get(g.currentLocationId!),
        }));

        if (includeZero) {
            for (const s of skus) {
                if (!skuIdsInStock.has(s.id)) {
                    rows.push({ skuId: s.id, locationId: null, quantity: 0, sku: s, location: null });
                }
            }
        }

        return rows.sort((a, b) => b.quantity - a.quantity);
    }

    async getPendingApprovals() {
        return this.prisma.approvalRequest.findMany({
            where: { status: 'PENDING' },
            include: { requestedBy: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getStats() {
        const now = new Date();
        const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [totalSkus, totalAssets, assetsByStatusRaw, movementsLast7, movementsLast30, locationDistRaw] = await Promise.all([
            this.prisma.skuItem.count(),
            this.prisma.asset.count(),
            this.prisma.asset.groupBy({ by: ['status'], _count: { id: true } }),
            this.prisma.stockMovement.count({ where: { createdAt: { gte: last7 } } }),
            this.prisma.stockMovement.count({ where: { createdAt: { gte: last30 } } }),
            this.prisma.$queryRaw<any[]>`
                SELECT l.id, l.name,
                       COUNT(a.id)::int AS "totalQuantity",
                       COUNT(DISTINCT a."skuId")::int AS "itemCount"
                FROM "Location" l
                LEFT JOIN "Asset" a ON a."currentLocationId" = l.id AND a.status != 'BAIXADO'
                GROUP BY l.id, l.name
                ORDER BY "totalQuantity" DESC
            `,
        ]);

        const assetsByStatus: Record<string, number> = { ATIVO: 0, EM_USO: 0, EM_MANUTENCAO: 0, BAIXADO: 0 };
        for (const row of assetsByStatusRaw) assetsByStatus[row.status] = (row._count as any).id ?? 0;

        const locationDistribution = locationDistRaw.map((r) => ({
            name: r.name,
            totalQuantity: Number(r.totalQuantity),
            itemCount: Number(r.itemCount),
        }));

        return { totalSkus, totalAssets, assetsByStatus, locationDistribution, movements: { last7: movementsLast7, last30: movementsLast30 } };
    }
}
