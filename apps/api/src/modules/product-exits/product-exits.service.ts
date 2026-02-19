import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductExitsService {
    constructor(private readonly prisma: PrismaService) { }

    // ── Register a product exit ──
    async create(data: {
        skuId: string;
        locationId: string;
        quantity: number;
        reason?: string;
        createdById: string;
    }) {
        if (!data.quantity || data.quantity <= 0 || !Number.isInteger(data.quantity)) {
            throw new BadRequestException('Quantidade deve ser um número inteiro positivo');
        }

        // Verify SKU exists
        const sku = await this.prisma.skuItem.findUnique({ where: { id: data.skuId } });
        if (!sku) throw new NotFoundException('SKU não encontrado');

        // Verify location exists
        const location = await this.prisma.location.findUnique({ where: { id: data.locationId } });
        if (!location) throw new NotFoundException('Local não encontrado');

        // Check stock balance
        const balance = await this.prisma.stockBalance.findUnique({
            where: { skuId_locationId: { skuId: data.skuId, locationId: data.locationId } },
        });
        if (!balance || balance.quantity < data.quantity) {
            throw new BadRequestException(
                `Saldo insuficiente. Disponível: ${balance?.quantity ?? 0} em ${location.name}`,
            );
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Create exit record
            const exit = await tx.productExit.create({
                data: {
                    skuId: data.skuId,
                    locationId: data.locationId,
                    quantity: data.quantity,
                    reason: data.reason,
                    createdById: data.createdById,
                },
                include: {
                    sku: { select: { id: true, skuCode: true, name: true, description: true } },
                    location: { select: { id: true, name: true } },
                    createdBy: { select: { id: true, name: true } },
                },
            });

            // 2. Decrement stock balance
            await tx.stockBalance.update({
                where: { skuId_locationId: { skuId: data.skuId, locationId: data.locationId } },
                data: { quantity: { decrement: data.quantity } },
            });

            // 3. Audit log
            await tx.auditLog.create({
                data: {
                    action: 'PRODUCT_EXIT',
                    entityType: 'ProductExit',
                    entityId: exit.id,
                    userId: data.createdById,
                    details: {
                        sku: sku.skuCode,
                        skuName: sku.name,
                        location: location.name,
                        qty: data.quantity,
                        reason: data.reason,
                    },
                },
            });

            return exit;
        });
    }

    // ── List exits with date filters ──
    async findAll(params?: {
        skuId?: string;
        locationId?: string;
        startDate?: string;
        endDate?: string;
        search?: string;
        skip?: number;
        take?: number;
    }) {
        const where: any = {};

        if (params?.skuId) where.skuId = params.skuId;
        if (params?.locationId) where.locationId = params.locationId;
        if (params?.search) {
            where.OR = [
                { sku: { name: { contains: params.search, mode: 'insensitive' as const } } },
                { sku: { skuCode: { contains: params.search, mode: 'insensitive' as const } } },
                { reason: { contains: params.search, mode: 'insensitive' as const } },
            ];
        }

        // Date filters
        if (params?.startDate || params?.endDate) {
            where.createdAt = {};
            if (params?.startDate) where.createdAt.gte = new Date(params.startDate);
            if (params?.endDate) {
                const end = new Date(params.endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const [data, total] = await Promise.all([
            this.prisma.productExit.findMany({
                where,
                include: {
                    sku: { select: { id: true, skuCode: true, name: true, description: true, category: { select: { name: true } } } },
                    location: { select: { id: true, name: true } },
                    createdBy: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                ...(params?.skip !== undefined ? { skip: params.skip, take: params.take } : {}),
            }),
            this.prisma.productExit.count({ where }),
        ]);

        return { data, total };
    }

    // ── Report: aggregate exits by day, month, or year ──
    async getReport(params: {
        groupBy: 'day' | 'month' | 'year';
        skuId?: string;
        locationId?: string;
        startDate?: string;
        endDate?: string;
    }) {
        const where: any = {};

        if (params.skuId) where.skuId = params.skuId;
        if (params.locationId) where.locationId = params.locationId;
        if (params.startDate || params.endDate) {
            where.createdAt = {};
            if (params.startDate) where.createdAt.gte = new Date(params.startDate);
            if (params.endDate) {
                const end = new Date(params.endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        // Fetch all matching exits, then aggregate in JS (SQLite limitation)
        const exits = await this.prisma.productExit.findMany({
            where,
            include: {
                sku: { select: { skuCode: true, name: true } },
                location: { select: { name: true } },
            },
            orderBy: { createdAt: 'asc' },
        });

        const grouped: Record<string, { period: string; totalQuantity: number; exitCount: number; items: Record<string, { skuCode: string; skuName: string; quantity: number }> }> = {};

        for (const exit of exits) {
            const date = new Date(exit.createdAt);
            let key: string;

            if (params.groupBy === 'day') {
                key = date.toISOString().slice(0, 10); // YYYY-MM-DD
            } else if (params.groupBy === 'month') {
                key = date.toISOString().slice(0, 7); // YYYY-MM
            } else {
                key = String(date.getFullYear()); // YYYY
            }

            if (!grouped[key]) {
                grouped[key] = { period: key, totalQuantity: 0, exitCount: 0, items: {} };
            }

            grouped[key].totalQuantity += exit.quantity;
            grouped[key].exitCount += 1;

            const skuKey = exit.skuId;
            if (!grouped[key].items[skuKey]) {
                grouped[key].items[skuKey] = {
                    skuCode: exit.sku.skuCode,
                    skuName: exit.sku.name,
                    quantity: 0,
                };
            }
            grouped[key].items[skuKey].quantity += exit.quantity;
        }

        // Convert to array and flatten items
        const report = Object.values(grouped)
            .sort((a, b) => b.period.localeCompare(a.period))
            .map((g) => ({
                period: g.period,
                totalQuantity: g.totalQuantity,
                exitCount: g.exitCount,
                items: Object.values(g.items).sort((a, b) => b.quantity - a.quantity),
            }));

        return report;
    }

    // ── Summary totals ──
    async getSummary(params?: { startDate?: string; endDate?: string }) {
        const where: any = {};
        if (params?.startDate || params?.endDate) {
            where.createdAt = {};
            if (params?.startDate) where.createdAt.gte = new Date(params.startDate);
            if (params?.endDate) {
                const end = new Date(params.endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        const exits = await this.prisma.productExit.findMany({
            where,
            select: { quantity: true, skuId: true },
        });

        const totalExits = exits.length;
        const totalQuantity = exits.reduce((sum, e) => sum + e.quantity, 0);
        const uniqueSkus = new Set(exits.map((e) => e.skuId)).size;

        return { totalExits, totalQuantity, uniqueSkus };
    }
}
