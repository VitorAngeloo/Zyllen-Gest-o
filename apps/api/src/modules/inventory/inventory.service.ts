import {
    Injectable,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryService {
    constructor(private readonly prisma: PrismaService) { }

    // ── Validate PIN ──
    private async validatePin(userId: string, pin: string): Promise<void> {
        const user = await this.prisma.internalUser.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('Usuário não encontrado');
        if (!user.pin4Hash) throw new UnauthorizedException('Usuário não possui PIN configurado');
        const valid = await bcrypt.compare(pin, user.pin4Hash);
        if (!valid) throw new UnauthorizedException('PIN inválido');
    }

    // ── Apply asset status/location rules from MovementType ──
    private async applyAssetMovementRules(tx: any, params: {
        assetId?: string;
        moveType: { setsAssetStatus?: string | null; defaultToLocationId?: string | null };
        toLocationId?: string;
        fromLocationId?: string;
    }): Promise<void> {
        if (!params.assetId) return;
        const nextLocationId = params.toLocationId ?? params.moveType.defaultToLocationId ?? undefined;
        const updateData: { status?: string; currentLocationId?: string | null } = {};
        if (params.moveType.setsAssetStatus) updateData.status = params.moveType.setsAssetStatus;
        if (nextLocationId !== undefined) updateData.currentLocationId = nextLocationId;
        if (Object.keys(updateData).length > 0) {
            await tx.asset.update({ where: { id: params.assetId }, data: updateData });
        }
    }

    // ── Auto-create individual Assets on entry ──
    private async autoCreateAssets(tx: any, params: {
        skuId: string; locationId: string; quantity: number;
    }): Promise<string[]> {
        // Resolve the item's codePrefix
        const sku = await tx.skuItem.findUnique({ where: { id: params.skuId }, select: { codePrefix: true } });
        const prefix = sku?.codePrefix ?? 'SKY';

        // Per-prefix sequence
        let sequence = await tx.assetCodeSequence.findUnique({ where: { id: prefix } });
        if (!sequence) {
            // Bootstrap from existing codes for this prefix
            const existing = await tx.asset.findMany({
                where: { skuId: params.skuId },
                select: { assetCode: true },
            });
            let max = 0;
            const re = new RegExp(`^${prefix}-(\\d+)$`);
            for (const a of existing) {
                const m = re.exec(a.assetCode);
                if (m) { const n = Number(m[1]); if (n > max) max = n; }
            }
            sequence = await tx.assetCodeSequence.create({ data: { id: prefix, currentValue: max } });
        }
        sequence = await tx.assetCodeSequence.update({
            where: { id: prefix },
            data: { currentValue: { increment: params.quantity } },
        });
        const end = sequence.currentValue;
        const start = end - params.quantity + 1;
        const codes = Array.from({ length: params.quantity }, (_, i) =>
            `${prefix}-${String(start + i).padStart(5, '0')}`,
        );
        const collision = await tx.asset.findFirst({ where: { assetCode: { in: codes } } });
        if (collision) throw new Error(`Conflito de código: ${collision.assetCode}. Tente novamente.`);
        await tx.asset.createMany({
            data: codes.map((assetCode) => ({
                assetCode,
                skuId: params.skuId,
                currentLocationId: params.locationId,
                status: 'ATIVO',
            })),
        });
        return codes;
    }

    // ── Stock Entry ──
    async createEntry(data: {
        skuId: string;
        toLocationId?: string;
        qty: number;
        movementTypeId: string;
        userId: string;
        pin: string;
        reason?: string;
        assetId?: string;
        attachments?: { fileName: string; filePath: string; mimeType: string; mediaType: string; uploadedById: string; }[];
    }) {
        if (!data.qty || data.qty <= 0 || !Number.isInteger(data.qty)) {
            throw new BadRequestException('Quantidade deve ser um número inteiro positivo');
        }
        await this.validatePin(data.userId, data.pin);

        const [moveType, sku] = await Promise.all([
            this.prisma.movementType.findUnique({ where: { id: data.movementTypeId } }),
            this.prisma.skuItem.findUnique({ where: { id: data.skuId } }),
        ]);
        if (!moveType) throw new NotFoundException('Tipo de movimentação não encontrado');
        if (!sku) throw new NotFoundException('Item não encontrado');

        const resolvedToLocationId = data.toLocationId ?? moveType.defaultToLocationId ?? undefined;
        if (!resolvedToLocationId) {
            throw new BadRequestException('Local de destino não informado e tipo de movimentação sem local padrão');
        }
        const location = await this.prisma.location.findUnique({ where: { id: resolvedToLocationId } });
        if (!location) throw new NotFoundException('Local não encontrado');

        return this.prisma.$transaction(async (tx) => {
            const movement = await tx.stockMovement.create({
                data: {
                    typeId: data.movementTypeId,
                    skuId: data.skuId,
                    toLocationId: resolvedToLocationId,
                    qty: data.qty,
                    reason: data.reason,
                    createdByInternalUserId: data.userId,
                    pinValidatedAt: new Date(),
                    assetId: data.assetId ?? null,
                },
                include: {
                    type: { select: { name: true } },
                    sku: { select: { skuCode: true, name: true } },
                    toLocation: { select: { name: true } },
                    mediaAttachments: {
                        select: { id: true, fileName: true, filePath: true, mimeType: true, mediaType: true, createdAt: true },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });

            if (data.attachments?.length) {
                await tx.itemMediaAttachment.createMany({
                    data: data.attachments.map((att) => ({
                        skuId: data.skuId,
                        stockMovementId: movement.id,
                        ...att,
                    })),
                });
            }

            if (data.assetId) {
                await this.applyAssetMovementRules(tx, { assetId: data.assetId, moveType, toLocationId: resolvedToLocationId });
                // Retorno de um patrimônio existente: volta ao estoque (com local),
                // reativa e limpa o motivo da saída anterior.
                await tx.asset.update({
                    where: { id: data.assetId },
                    data: { currentLocationId: resolvedToLocationId, status: 'ATIVO', lastExitReason: null },
                });
            }

            // Always auto-create individual patrimony codes (no more CONSUMABLE mode)
            const createdAssetCodes = !data.assetId
                ? await this.autoCreateAssets(tx, { skuId: data.skuId, locationId: resolvedToLocationId, quantity: data.qty })
                : [];

            await tx.auditLog.create({
                data: {
                    action: 'STOCK_ENTRY',
                    entityType: 'StockMovement',
                    entityId: movement.id,
                    userId: data.userId,
                    details: {
                        sku: sku.skuCode,
                        location: location.name,
                        qty: data.qty,
                        type: moveType.name,
                        ...(createdAssetCodes.length ? { assetsCreated: createdAssetCodes } : {}),
                    },
                },
            });

            return { ...movement, createdAssetCodes };
        });
    }

    // ── Stock Exit ──
    async createExit(data: {
        skuId: string;
        fromLocationId: string;
        qty: number;
        movementTypeId: string;
        userId: string;
        pin: string;
        reason?: string;
        assetId?: string;
    }) {
        if (!data.qty || data.qty <= 0 || !Number.isInteger(data.qty)) {
            throw new BadRequestException('Quantidade deve ser um número inteiro positivo');
        }
        await this.validatePin(data.userId, data.pin);

        const [moveType, sku, location] = await Promise.all([
            this.prisma.movementType.findUnique({ where: { id: data.movementTypeId } }),
            this.prisma.skuItem.findUnique({ where: { id: data.skuId } }),
            this.prisma.location.findUnique({ where: { id: data.fromLocationId } }),
        ]);
        if (!moveType) throw new NotFoundException('Tipo de movimentação não encontrado');
        if (!sku) throw new NotFoundException('Item não encontrado');
        if (!location) throw new NotFoundException('Local não encontrado');

        // Check available assets at location
        const availableCount = await this.prisma.asset.count({
            where: { skuId: data.skuId, currentLocationId: data.fromLocationId, status: { notIn: ['BAIXADO'] } },
        });
        if (availableCount < data.qty) {
            throw new BadRequestException(`Patrimônios disponíveis insuficientes. Disponível: ${availableCount}`);
        }

        if (moveType.requiresApproval) {
            const request = await this.prisma.approvalRequest.create({
                data: {
                    requestType: 'EXIT_APPROVAL',
                    status: 'PENDING',
                    requestedById: data.userId,
                    payloadJson: {
                        skuId: data.skuId, fromLocationId: data.fromLocationId,
                        qty: data.qty, movementTypeId: data.movementTypeId,
                        reason: data.reason, assetId: data.assetId,
                    },
                },
            });
            await this.prisma.auditLog.create({
                data: {
                    action: 'EXIT_APPROVAL_REQUESTED',
                    entityType: 'ApprovalRequest',
                    entityId: request.id,
                    userId: data.userId,
                    details: { sku: sku.skuCode, location: location.name, qty: data.qty },
                },
            });
            return { approvalRequired: true, approvalRequestId: request.id, message: 'Saída requer aprovação' };
        }

        return this.executeExit(data, sku, location, moveType);
    }

    private async executeExit(
        data: { skuId: string; fromLocationId: string; qty: number; movementTypeId: string; userId: string; reason?: string; assetId?: string },
        sku: any, location: any, moveType: any,
    ) {
        return this.prisma.$transaction(async (tx) => {
            const movement = await tx.stockMovement.create({
                data: {
                    typeId: data.movementTypeId,
                    skuId: data.skuId,
                    fromLocationId: data.fromLocationId,
                    qty: data.qty,
                    reason: data.reason,
                    createdByInternalUserId: data.userId,
                    pinValidatedAt: new Date(),
                    assetId: data.assetId ?? null,
                },
            });

            await this.applyAssetMovementRules(tx, { assetId: data.assetId, moveType, fromLocationId: data.fromLocationId });

            // Saída de um patrimônio específico: sai do saldo (sem local) e guarda
            // o motivo, para o status mostrar "em uso/cliente/..." em vez de "Ativo".
            if (data.assetId) {
                await tx.asset.update({
                    where: { id: data.assetId },
                    data: { currentLocationId: null, lastExitReason: data.reason?.trim() || 'Saída' },
                });
            }

            await tx.auditLog.create({
                data: {
                    action: 'STOCK_EXIT',
                    entityType: 'StockMovement',
                    entityId: movement.id,
                    userId: data.userId,
                    details: { sku: sku.skuCode, location: location.name, qty: data.qty, type: moveType.name },
                },
            });

            return { approvalRequired: false, movement };
        });
    }

    // ── Approve exit ──
    async approveExit(approvalRequestId: string, approverId: string, pin: string) {
        await this.validatePin(approverId, pin);
        const request = await this.prisma.approvalRequest.findUnique({ where: { id: approvalRequestId } });
        if (!request) throw new NotFoundException('Solicitação não encontrada');
        if (request.status !== 'PENDING') throw new BadRequestException('Solicitação já processada');
        if (request.requestType !== 'EXIT_APPROVAL') throw new BadRequestException('Tipo inválido');
        if (request.requestedById === approverId) throw new BadRequestException('Você não pode aprovar sua própria solicitação');

        const payload = request.payloadJson as any;
        const [sku, location, moveType] = await Promise.all([
            this.prisma.skuItem.findUnique({ where: { id: payload.skuId } }),
            this.prisma.location.findUnique({ where: { id: payload.fromLocationId } }),
            this.prisma.movementType.findUnique({ where: { id: payload.movementTypeId } }),
        ]);
        if (!sku) throw new NotFoundException('Item não existe mais');
        if (!location) throw new NotFoundException('Local não existe mais');
        if (!moveType) throw new NotFoundException('Tipo de movimentação não existe mais');

        const result = await this.executeExit({ ...payload, userId: request.requestedById }, sku, location, moveType);

        await this.prisma.approvalRequest.update({
            where: { id: approvalRequestId },
            data: { status: 'APPROVED', approvedById: approverId },
        });
        await this.prisma.auditLog.create({
            data: { action: 'EXIT_APPROVED', entityType: 'ApprovalRequest', entityId: approvalRequestId, userId: approverId, details: { sku: sku?.skuCode, qty: payload.qty } },
        });

        return result;
    }

    // ── Reject exit ──
    async rejectExit(approvalRequestId: string, approverId: string, pin: string) {
        await this.validatePin(approverId, pin);
        const request = await this.prisma.approvalRequest.findUnique({ where: { id: approvalRequestId } });
        if (!request) throw new NotFoundException('Solicitação não encontrada');
        if (request.status !== 'PENDING') throw new BadRequestException('Já processada');

        await this.prisma.approvalRequest.update({
            where: { id: approvalRequestId },
            data: { status: 'REJECTED', approvedById: approverId },
        });
        await this.prisma.auditLog.create({
            data: { action: 'EXIT_REJECTED', entityType: 'ApprovalRequest', entityId: approvalRequestId, userId: approverId },
        });

        return { message: 'Solicitação rejeitada' };
    }

    // ── Request Reversal ──
    async requestReversal(movementId: string, userId: string, reasonText: string) {
        const movement = await this.prisma.stockMovement.findUnique({ where: { id: movementId }, include: { type: true } });
        if (!movement) throw new NotFoundException('Movimentação não encontrada');
        if (movement.revertedByMovementId) throw new BadRequestException('Movimentação já revertida');

        const request = await this.prisma.approvalRequest.create({
            data: { requestType: 'REVERSAL', status: 'PENDING', requestedById: userId, reason: reasonText, payloadJson: { movementId } },
        });
        await this.prisma.auditLog.create({
            data: { action: 'REVERSAL_REQUESTED', entityType: 'StockMovement', entityId: movementId, userId, details: { reason: reasonText } },
        });

        return { approvalRequestId: request.id, message: 'Reversão solicitada' };
    }

    // ── Approve Reversal ──
    async approveReversal(approvalRequestId: string, approverId: string, pin: string) {
        await this.validatePin(approverId, pin);
        const request = await this.prisma.approvalRequest.findUnique({ where: { id: approvalRequestId } });
        if (!request) throw new NotFoundException('Solicitação não encontrada');
        if (request.status !== 'PENDING') throw new BadRequestException('Já processada');
        if (request.requestType !== 'REVERSAL') throw new BadRequestException('Tipo inválido');
        if (request.requestedById === approverId) throw new BadRequestException('Você não pode aprovar sua própria solicitação');

        const payload = request.payloadJson as any;
        const original = await this.prisma.stockMovement.findUnique({ where: { id: payload.movementId }, include: { type: true } });
        if (!original) throw new NotFoundException('Movimentação original não encontrada');
        if (original.revertedByMovementId) throw new BadRequestException('Já revertida');

        return this.prisma.$transaction(async (tx) => {
            const reverse = await tx.stockMovement.create({
                data: {
                    typeId: original.typeId,
                    skuId: original.skuId,
                    fromLocationId: original.toLocationId,
                    toLocationId: original.fromLocationId,
                    qty: original.qty,
                    reason: `Reversão: ${request.reason ?? 'sem motivo'}`,
                    createdByInternalUserId: approverId,
                    pinValidatedAt: new Date(),
                },
            });
            await tx.stockMovement.update({ where: { id: original.id }, data: { revertedByMovementId: reverse.id } });

            // Reverse asset location/status if applicable
            if (original.assetId) {
                const asset = await tx.asset.findUnique({ where: { id: original.assetId } });
                if (asset) {
                    await tx.asset.update({
                        where: { id: original.assetId },
                        data: { currentLocationId: original.fromLocationId ?? asset.currentLocationId },
                    });
                }
            }

            await tx.approvalRequest.update({ where: { id: approvalRequestId }, data: { status: 'APPROVED', approvedById: approverId } });
            await tx.auditLog.create({
                data: { action: 'REVERSAL_APPROVED', entityType: 'StockMovement', entityId: reverse.id, userId: approverId, details: { originalId: original.id, reason: request.reason } },
            });

            return { reverseMovement: reverse, message: 'Reversão aprovada e executada' };
        });
    }

    // ── List movements ──
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

    // ── Balances — count of active assets per SKU per location ──
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

    // ── Pending approvals ──
    async getPendingApprovals() {
        return this.prisma.approvalRequest.findMany({
            where: { status: 'PENDING' },
            include: { requestedBy: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ── Stats ──
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

    // ── Movement Types CRUD ──
    async findAllMovementTypes() { return this.prisma.movementType.findMany({ orderBy: { name: 'asc' } }); }

    async createMovementType(data: { name: string; requiresApproval?: boolean; isFinalWriteOff?: boolean; setsAssetStatus?: string }) {
        return this.prisma.movementType.create({ data });
    }

    async updateMovementType(id: string, data: { name?: string; requiresApproval?: boolean; isFinalWriteOff?: boolean; setsAssetStatus?: string }) {
        const existing = await this.prisma.movementType.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Tipo não encontrado');
        return this.prisma.movementType.update({ where: { id }, data });
    }

    async deleteMovementType(id: string) {
        const existing = await this.prisma.movementType.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Tipo não encontrado');
        const count = await this.prisma.stockMovement.count({ where: { typeId: id } });
        if (count > 0) throw new BadRequestException('Tipo com movimentações vinculadas');
        return this.prisma.movementType.delete({ where: { id } });
    }

    // ── Exit Reasons CRUD (motivos de saída configuráveis) ──
    async findAllExitReasons(params?: { onlyActive?: boolean }) {
        return this.prisma.exitReason.findMany({
            where: params?.onlyActive ? { active: true } : {},
            orderBy: { name: 'asc' },
        });
    }

    async createExitReason(data: { name?: string }) {
        const name = (data.name ?? '').trim();
        if (!name) throw new BadRequestException('Nome é obrigatório');
        const existing = await this.prisma.exitReason.findUnique({ where: { name } });
        if (existing) throw new ConflictException('Já existe um motivo de saída com esse nome');
        return this.prisma.exitReason.create({ data: { name } });
    }

    async updateExitReason(id: string, data: { name?: string; active?: boolean }) {
        const existing = await this.prisma.exitReason.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Motivo não encontrado');
        if (data.name) {
            const dup = await this.prisma.exitReason.findFirst({ where: { name: data.name.trim(), NOT: { id } } });
            if (dup) throw new ConflictException('Já existe um motivo de saída com esse nome');
        }
        return this.prisma.exitReason.update({
            where: { id },
            data: { ...(data.name ? { name: data.name.trim() } : {}), ...(data.active !== undefined ? { active: data.active } : {}) },
        });
    }

    async deleteExitReason(id: string) {
        const existing = await this.prisma.exitReason.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Motivo não encontrado');
        return this.prisma.exitReason.delete({ where: { id } });
    }
}
