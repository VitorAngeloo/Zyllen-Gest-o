import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssetsService {
    constructor(private readonly prisma: PrismaService) { }

    // ── List all assets ──
    async findAll(params?: { skuId?: string; status?: string; locationId?: string; search?: string; skip?: number; take?: number }) {
        const where = {
            ...(params?.skuId ? { skuId: params.skuId } : {}),
            ...(params?.status ? { status: params.status } : {}),
            ...(params?.locationId ? { currentLocationId: params.locationId } : {}),
            ...(params?.search ? {
                OR: [
                    { assetCode: { contains: params.search } },
                    { sku: { name: { contains: params.search } } },
                ],
            } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.asset.findMany({
                where,
                include: {
                    sku: { select: { id: true, skuCode: true, name: true, brand: true, category: { select: { name: true } } } },
                    currentLocation: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                ...(params?.skip !== undefined ? { skip: params.skip, take: params.take } : {}),
            }),
            this.prisma.asset.count({ where }),
        ]);
        return { data, total };
    }

    // ── Find by ID ──
    async findById(id: string) {
        const asset = await this.prisma.asset.findUnique({
            where: { id },
            include: {
                sku: { include: { category: true } },
                currentLocation: true,
            },
        });
        if (!asset) throw new NotFoundException('Patrimônio não encontrado');
        return asset;
    }

    // ── Lookup by asset code (bipagem) ──
    async lookupByCode(assetCode: string) {
        const asset = await this.prisma.asset.findUnique({
            where: { assetCode },
            include: {
                sku: { include: { category: true } },
                currentLocation: true,
            },
        });
        if (!asset) throw new NotFoundException(`Patrimônio ${assetCode} não encontrado`);
        return asset;
    }

    // ── Asset timeline (complete history) ──
    async getTimeline(assetId: string) {
        await this.findById(assetId); // ensure exists

        const [movements, maintenance, labels] = await Promise.all([
            this.prisma.stockMovement.findMany({
                where: { assetId },
                include: {
                    type: { select: { name: true } },
                    fromLocation: { select: { name: true } },
                    toLocation: { select: { name: true } },
                    createdBy: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.maintenanceOS.findMany({
                where: { assetId },
                include: {
                    openedBy: { select: { name: true } },
                    openedByContractor: { select: { name: true } },
                    closedBy: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.labelPrintJob.findMany({
                where: { assetId },
                include: {
                    printedBy: { select: { name: true } },
                },
                orderBy: { printedAt: 'desc' },
            }),
        ]);

        // Build unified timeline
        const timeline = [
            ...movements.map((m) => ({
                type: 'MOVEMENT' as const,
                date: m.createdAt,
                description: `${m.type.name}${m.fromLocation ? ` de ${m.fromLocation.name}` : ''}${m.toLocation ? ` para ${m.toLocation.name}` : ''} — qty: ${m.qty}`,
                actor: m.createdBy.name,
                details: m,
            })),
            ...maintenance.map((os) => ({
                type: 'MAINTENANCE' as const,
                date: os.createdAt,
                description: `OS ${os.status}${os.notes ? ` — ${os.notes}` : ''}`,
                actor: os.openedBy?.name ?? os.openedByContractor?.name ?? 'Desconhecido',
                details: os,
            })),
            ...labels.map((l) => ({
                type: 'LABEL' as const,
                date: l.printedAt,
                description: 'Etiqueta impressa',
                actor: l.printedBy.name,
                details: l,
            })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return timeline;
    }

    // ── Create asset with auto SKY-XXXXX code ──
    async create(data: { skuId: string; currentLocationId?: string }) {
        // Verify SKU exists
        const sku = await this.prisma.skuItem.findUnique({ where: { id: data.skuId } });
        if (!sku) throw new NotFoundException('SKU não encontrado');

        // Verify location exists (if provided)
        if (data.currentLocationId) {
            const location = await this.prisma.location.findUnique({ where: { id: data.currentLocationId } });
            if (!location) throw new NotFoundException('Local não encontrado');
        }

        const assetCode = await this.generateUniqueAssetCode();

        return this.prisma.asset.create({
            data: {
                assetCode,
                skuId: data.skuId,
                currentLocationId: data.currentLocationId,
                status: 'ATIVO',
            },
            include: {
                sku: { select: { id: true, skuCode: true, name: true } },
                currentLocation: { select: { id: true, name: true } },
            },
        });
    }

    // ── Bulk Equipment Registration ──
    // Creates SkuItem + N Assets + StockBalance in a single transaction
    async bulkRegister(data: {
        name: string;
        description?: string;
        brand?: string;
        barcode?: string;
        categoryId: string;
        locationId: string;
        quantity: number;
    }) {
        // Verify category exists
        const category = await this.prisma.category.findUnique({ where: { id: data.categoryId } });
        if (!category) throw new NotFoundException('Categoria não encontrada');

        // Verify location exists
        const location = await this.prisma.location.findUnique({ where: { id: data.locationId } });
        if (!location) throw new NotFoundException('Local não encontrado');

        // Generate unique SKU code
        const skuCode = await this.generateUniqueSkuCode();

        // Generate all asset codes in advance
        const assetCodes: string[] = [];
        for (let i = 0; i < data.quantity; i++) {
            assetCodes.push(await this.generateUniqueAssetCode());
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Create SkuItem
            const skuItem = await tx.skuItem.create({
                data: {
                    skuCode,
                    name: data.name,
                    description: data.description,
                    brand: data.brand,
                    barcode: data.barcode,
                    categoryId: data.categoryId,
                },
                include: { category: { select: { id: true, name: true } } },
            });

            // 2. Create N Assets
            const assets = await Promise.all(
                assetCodes.map((code) =>
                    tx.asset.create({
                        data: {
                            assetCode: code,
                            skuId: skuItem.id,
                            currentLocationId: data.locationId,
                            status: 'ATIVO',
                        },
                    }),
                ),
            );

            // 3. Create StockBalance
            await tx.stockBalance.upsert({
                where: { skuId_locationId: { skuId: skuItem.id, locationId: data.locationId } },
                update: { quantity: { increment: data.quantity } },
                create: { skuId: skuItem.id, locationId: data.locationId, quantity: data.quantity },
            });

            return {
                sku: skuItem,
                assetsCreated: assets.length,
                assetCodes: assets.map((a) => a.assetCode),
                location: location.name,
            };
        });
    }

    // ── Equipment Summary (grouped by SKU with location distribution) ──
    async getEquipmentSummary(params?: { search?: string; categoryId?: string; skip?: number; take?: number }) {
        const where = {
            ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
            ...(params?.search ? {
                OR: [
                    { name: { contains: params.search } },
                    { skuCode: { contains: params.search } },
                    { description: { contains: params.search } },
                    { barcode: { contains: params.search } },
                ],
            } : {}),
        };

        const [skus, total] = await Promise.all([
            this.prisma.skuItem.findMany({
                where,
                include: {
                    category: { select: { id: true, name: true } },
                    _count: { select: { assets: true } },
                    stockBalances: {
                        include: { location: { select: { id: true, name: true } } },
                        where: { quantity: { gt: 0 } },
                    },
                },
                orderBy: { createdAt: 'desc' },
                ...(params?.skip !== undefined ? { skip: params.skip, take: params.take } : {}),
            }),
            this.prisma.skuItem.count({ where }),
        ]);

        const data = skus.map((sku) => ({
            id: sku.id,
            skuCode: sku.skuCode,
            name: sku.name,
            description: sku.description,
            brand: sku.brand,
            barcode: sku.barcode,
            category: sku.category,
            totalAssets: sku._count.assets,
            totalStock: sku.stockBalances.reduce((sum, b) => sum + b.quantity, 0),
            locations: sku.stockBalances.map((b) => ({
                locationId: b.location.id,
                locationName: b.location.name,
                quantity: b.quantity,
            })),
            createdAt: sku.createdAt,
        }));

        return { data, total };
    }

    // ── Update asset status ──
    async updateStatus(id: string, status: string) {
        await this.findById(id);
        const validStatuses = ['ATIVO', 'EM_USO', 'EM_MANUTENCAO', 'BAIXADO'];
        if (!validStatuses.includes(status)) {
            throw new ConflictException(`Status inválido. Use: ${validStatuses.join(', ')}`);
        }
        return this.prisma.asset.update({
            where: { id },
            data: { status },
        });
    }

    // ── Update asset location ──
    async updateLocation(id: string, locationId: string | null) {
        await this.findById(id);
        if (locationId) {
            const location = await this.prisma.location.findUnique({ where: { id: locationId } });
            if (!location) throw new NotFoundException('Local não encontrado');
        }
        return this.prisma.asset.update({
            where: { id },
            data: { currentLocationId: locationId },
        });
    }

    // ── Generate Unique SKY-XXXXX code ──
    private async generateUniqueAssetCode(): Promise<string> {
        const MAX_RETRIES = 100;
        for (let i = 0; i < MAX_RETRIES; i++) {
            const num = String(Math.floor(Math.random() * 100_000)).padStart(5, '0');
            const code = `SKY-${num}`;
            const existing = await this.prisma.asset.findUnique({ where: { assetCode: code } });
            if (!existing) return code;
        }
        throw new ConflictException('Não foi possível gerar um código de patrimônio único.');
    }

    // ── Generate Unique 6-digit SKU Code ──
    private async generateUniqueSkuCode(): Promise<string> {
        const MAX_RETRIES = 100;
        for (let i = 0; i < MAX_RETRIES; i++) {
            const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
            const existing = await this.prisma.skuItem.findUnique({ where: { skuCode: code } });
            if (!existing) return code;
        }
        throw new ConflictException('Não foi possível gerar um SKU único.');
    }
}
