import {
    Injectable,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { StockLedgerService } from './stock-ledger.service';

@Injectable()
export class InventoryService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly stockLedger: StockLedgerService,
    ) { }

    private async validateAssetSkuConsistency(assetId: string | undefined, skuId: string): Promise<void> {
        if (!assetId) return;
        const asset = await this.prisma.asset.findUnique({ where: { id: assetId }, select: { skuId: true } });
        if (!asset) throw new NotFoundException('Patrimônio não encontrado');
        if (asset.skuId !== skuId) {
            throw new BadRequestException('Patrimônio informado não pertence ao item selecionado');
        }
    }

    private async applyAssetMovementRules(tx: any, params: {
        assetId?: string;
        moveType: { setsAssetStatus?: string | null; defaultToLocationId?: string | null };
        fromLocationId?: string;
        toLocationId?: string;
    }): Promise<void> {
        if (!params.assetId) return;

        const nextLocationId = params.toLocationId
            ?? params.moveType.defaultToLocationId
            ?? undefined;

        const updateData: { status?: string; currentLocationId?: string | null } = {};
        if (params.moveType.setsAssetStatus) {
            updateData.status = params.moveType.setsAssetStatus;
        }
        if (nextLocationId !== undefined) {
            updateData.currentLocationId = nextLocationId;
        }

        if (Object.keys(updateData).length > 0) {
            await tx.asset.update({
                where: { id: params.assetId },
                data: updateData,
            });
        }
    }

    // ── Validate PIN ──
    private async validatePin(userId: string, pin: string): Promise<void> {
        const user = await this.prisma.internalUser.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('Usuário não encontrado');
        if (!user.pin4Hash) throw new UnauthorizedException('Usuário não possui PIN configurado');
        const valid = await bcrypt.compare(pin, user.pin4Hash);
        if (!valid) throw new UnauthorizedException('PIN inválido');
    }

    // ── Stock Entry (Entrada) ──
    async createEntry(data: {
        skuId: string;
        toLocationId?: string;
        qty: number;
        movementTypeId: string;
        userId: string;
        pin: string;
        reason?: string;
        assetId?: string;
        attachments?: {
            fileName: string;
            filePath: string;
            mimeType: string;
            mediaType: string;
            uploadedById: string;
        }[];
    }) {
        if (!data.qty || data.qty <= 0 || !Number.isInteger(data.qty)) {
            throw new BadRequestException('Quantidade deve ser um número inteiro positivo');
        }

        await this.validatePin(data.userId, data.pin);

        const moveType = await this.prisma.movementType.findUnique({ where: { id: data.movementTypeId } });
        if (!moveType) throw new NotFoundException('Tipo de movimentação não encontrado');

        const sku = await this.prisma.skuItem.findUnique({ where: { id: data.skuId } });
        if (!sku) throw new NotFoundException('Item não encontrado');

        await this.validateAssetSkuConsistency(data.assetId, data.skuId);

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
                    assetId: data.assetId,
                },
                include: {
                    type: { select: { name: true } },
                    sku: { select: { skuCode: true, name: true } },
                    toLocation: { select: { name: true } },
                    mediaAttachments: {
                        select: {
                            id: true,
                            fileName: true,
                            filePath: true,
                            mimeType: true,
                            mediaType: true,
                            createdAt: true,
                            uploadedBy: { select: { id: true, name: true } },
                        },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });

            if (data.attachments?.length) {
                await tx.itemMediaAttachment.createMany({
                    data: data.attachments.map((att) => ({
                        skuId: data.skuId,
                        stockMovementId: movement.id,
                        fileName: att.fileName,
                        filePath: att.filePath,
                        mimeType: att.mimeType,
                        mediaType: att.mediaType,
                        uploadedById: att.uploadedById,
                    })),
                });
            }

            await tx.stockBalance.upsert({
                where: { skuId_locationId: { skuId: data.skuId, locationId: resolvedToLocationId } },
                update: { quantity: { increment: data.qty } },
                create: { skuId: data.skuId, locationId: resolvedToLocationId, quantity: data.qty },
            });

            await this.applyAssetMovementRules(tx, {
                assetId: data.assetId,
                moveType,
                toLocationId: resolvedToLocationId,
            });

            await tx.auditLog.create({
                data: {
                    action: 'STOCK_ENTRY',
                    entityType: 'StockMovement',
                    entityId: movement.id,
                    userId: data.userId,
                    details: { sku: sku.skuCode, location: location.name, qty: data.qty, type: moveType.name },
                },
            });

            return movement;
        });
    }

    // ── Stock Exit (Saída) ──
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

        const moveType = await this.prisma.movementType.findUnique({ where: { id: data.movementTypeId } });
        if (!moveType) throw new NotFoundException('Tipo de movimentação não encontrado');

        const sku = await this.prisma.skuItem.findUnique({ where: { id: data.skuId } });
        if (!sku) throw new NotFoundException('Item não encontrado');

        await this.validateAssetSkuConsistency(data.assetId, data.skuId);

        const location = await this.prisma.location.findUnique({ where: { id: data.fromLocationId } });
        if (!location) throw new NotFoundException('Local não encontrado');

        const balance = await this.prisma.stockBalance.findUnique({
            where: { skuId_locationId: { skuId: data.skuId, locationId: data.fromLocationId } },
        });
        if (!balance || balance.quantity < data.qty) {
            throw new BadRequestException(`Saldo insuficiente. Disponível: ${balance?.quantity ?? 0}`);
        }

        if (moveType.requiresApproval) {
            const request = await this.prisma.approvalRequest.create({
                data: {
                    requestType: 'EXIT_APPROVAL',
                    status: 'PENDING',
                    requestedById: data.userId,
                    payloadJson: {
                        skuId: data.skuId,
                        fromLocationId: data.fromLocationId,
                        qty: data.qty,
                        movementTypeId: data.movementTypeId,
                        reason: data.reason,
                        assetId: data.assetId,
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

    // ── Execute exit ──
    private async executeExit(
        data: { skuId: string; fromLocationId: string; qty: number; movementTypeId: string; userId: string; reason?: string; assetId?: string },
        sku: any, location: any, moveType: any,
    ) {
        return this.prisma.$transaction(async (tx) => {
            const { movement } = await this.stockLedger.registerExitMovement(tx, {
                skuId: data.skuId,
                fromLocationId: data.fromLocationId,
                qty: data.qty,
                userId: data.userId,
                reason: data.reason,
                assetId: data.assetId,
                movementTypeId: data.movementTypeId,
            });

            await this.applyAssetMovementRules(tx, {
                assetId: data.assetId,
                moveType,
                fromLocationId: data.fromLocationId,
            });

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
        const sku = await this.prisma.skuItem.findUnique({ where: { id: payload.skuId } });
    if (!sku) throw new NotFoundException('Item referenciado não existe mais');
        await this.validateAssetSkuConsistency(payload.assetId, payload.skuId);
        const location = await this.prisma.location.findUnique({ where: { id: payload.fromLocationId } });
        if (!location) throw new NotFoundException('Local referenciado não existe mais');
        const moveType = await this.prisma.movementType.findUnique({ where: { id: payload.movementTypeId } });
        if (!moveType) throw new NotFoundException('Tipo de movimentação referenciado não existe mais');

        const balance = await this.prisma.stockBalance.findUnique({
            where: { skuId_locationId: { skuId: payload.skuId, locationId: payload.fromLocationId } },
        });
        if (!balance || balance.quantity < payload.qty) {
            throw new BadRequestException(`Saldo insuficiente. Disponível: ${balance?.quantity ?? 0}`);
        }

        const result = await this.executeExit(
            { ...payload, userId: request.requestedById },
            sku, location, moveType,
        );

        await this.prisma.approvalRequest.update({
            where: { id: approvalRequestId },
            data: { status: 'APPROVED', approvedById: approverId },
        });

        await this.prisma.auditLog.create({
            data: {
                action: 'EXIT_APPROVED',
                entityType: 'ApprovalRequest',
                entityId: approvalRequestId,
                userId: approverId,
                details: { sku: sku?.skuCode, qty: payload.qty },
            },
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
            data: {
                action: 'EXIT_REJECTED',
                entityType: 'ApprovalRequest',
                entityId: approvalRequestId,
                userId: approverId,
            },
        });

        return { message: 'Solicitação rejeitada' };
    }

    // ── Request Reversal ──
    async requestReversal(movementId: string, userId: string, reasonText: string) {
        const movement = await this.prisma.stockMovement.findUnique({
            where: { id: movementId },
            include: { type: true },
        });
        if (!movement) throw new NotFoundException('Movimentação não encontrada');
        if (movement.revertedByMovementId) throw new BadRequestException('Movimentação já revertida');

        const request = await this.prisma.approvalRequest.create({
            data: {
                requestType: 'REVERSAL',
                status: 'PENDING',
                requestedById: userId,
                reason: reasonText,
                payloadJson: { movementId },
            },
        });

        await this.prisma.auditLog.create({
            data: {
                action: 'REVERSAL_REQUESTED',
                entityType: 'StockMovement',
                entityId: movementId,
                userId,
                details: { reason: reasonText },
            },
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
        const original = await this.prisma.stockMovement.findUnique({
            where: { id: payload.movementId },
            include: { type: true },
        });
        if (!original) throw new NotFoundException('Movimentação original não encontrada');
        if (original.revertedByMovementId) throw new BadRequestException('Já revertida');

        return this.prisma.$transaction(async (tx) => {
            // Create reverse movement (swap from/to)
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

            // Mark original as reverted
            await tx.stockMovement.update({
                where: { id: original.id },
                data: { revertedByMovementId: reverse.id },
            });

            // Fix balances: if entry (had toLocation), decrement there; if exit (had fromLocation), increment there
            if (original.toLocationId) {
                const bal = await tx.stockBalance.findUnique({
                    where: { skuId_locationId: { skuId: original.skuId, locationId: original.toLocationId } },
                });
                if (bal) {
                    if (bal.quantity < original.qty) {
                        throw new BadRequestException(
                            `Saldo insuficiente para reversão. Disponível: ${bal.quantity}, necessário: ${original.qty}`
                        );
                    }
                    await tx.stockBalance.update({
                        where: { id: bal.id },
                        data: { quantity: { decrement: original.qty } },
                    });
                }
            }
            if (original.fromLocationId) {
                await tx.stockBalance.upsert({
                    where: { skuId_locationId: { skuId: original.skuId, locationId: original.fromLocationId } },
                    update: { quantity: { increment: original.qty } },
                    create: { skuId: original.skuId, locationId: original.fromLocationId, quantity: original.qty },
                });
            }

            await tx.approvalRequest.update({
                where: { id: approvalRequestId },
                data: { status: 'APPROVED', approvedById: approverId },
            });

            await tx.auditLog.create({
                data: {
                    action: 'REVERSAL_APPROVED',
                    entityType: 'StockMovement',
                    entityId: reverse.id,
                    userId: approverId,
                    details: { originalId: original.id, reason: request.reason },
                },
            });

            return { reverseMovement: reverse, message: 'Reversão aprovada e executada' };
        });
    }

    // ── List movements ──
    async findAllMovements(params?: { skuId?: string; locationId?: string; typeId?: string; skip?: number; take?: number }) {
        const where = {
            ...(params?.skuId ? { skuId: params.skuId } : {}),
            ...(params?.locationId ? {
                OR: [
                    { fromLocationId: params.locationId },
                    { toLocationId: params.locationId },
                ],
            } : {}),
            ...(params?.typeId ? { typeId: params.typeId } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.stockMovement.findMany({
                where,
                include: {
                    type: { select: { name: true } },
                    sku: { select: { skuCode: true, name: true } },
                    fromLocation: { select: { name: true } },
                    toLocation: { select: { name: true } },
                    createdBy: { select: { name: true } },
                    mediaAttachments: {
                        select: {
                            id: true,
                            fileName: true,
                            filePath: true,
                            mimeType: true,
                            mediaType: true,
                            createdAt: true,
                            uploadedBy: { select: { id: true, name: true } },
                        },
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

    // ── Stock balances ──
    async getBalances(params?: { locationId?: string; skuId?: string }) {
        return this.prisma.stockBalance.findMany({
            where: {
                ...(params?.locationId ? { locationId: params.locationId } : {}),
                ...(params?.skuId ? { skuId: params.skuId } : {}),
                quantity: { gt: 0 },
            },
            include: {
                sku: { select: { skuCode: true, name: true, brand: true, category: { select: { name: true } } } },
                location: { select: { name: true } },
            },
            orderBy: { quantity: 'desc' },
        });
    }

    // ── Pending approvals ──
    async getPendingApprovals() {
        return this.prisma.approvalRequest.findMany({
            where: { status: 'PENDING' },
            include: { requestedBy: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ── Movement Types CRUD ──
    async findAllMovementTypes() {
        return this.prisma.movementType.findMany({ orderBy: { name: 'asc' } });
    }

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
}
