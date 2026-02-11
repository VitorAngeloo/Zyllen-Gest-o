import {
    Injectable,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
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
        const valid = await bcrypt.compare(pin, user.pin4Hash);
        if (!valid) throw new UnauthorizedException('PIN inválido');
    }

    // ── Stock Entry (Entrada) ──
    async createEntry(data: {
        skuId: string;
        toLocationId: string;
        qty: number;
        movementTypeId: string;
        userId: string;
        pin: string;
        reason?: string;
        assetId?: string;
    }) {
        await this.validatePin(data.userId, data.pin);

        const moveType = await this.prisma.movementType.findUnique({ where: { id: data.movementTypeId } });
        if (!moveType) throw new NotFoundException('Tipo de movimentação não encontrado');

        const sku = await this.prisma.skuItem.findUnique({ where: { id: data.skuId } });
        if (!sku) throw new NotFoundException('SKU não encontrado');

        const location = await this.prisma.location.findUnique({ where: { id: data.toLocationId } });
        if (!location) throw new NotFoundException('Local não encontrado');

        return this.prisma.$transaction(async (tx) => {
            const movement = await tx.stockMovement.create({
                data: {
                    typeId: data.movementTypeId,
                    skuId: data.skuId,
                    toLocationId: data.toLocationId,
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
                },
            });

            await tx.stockBalance.upsert({
                where: { skuId_locationId: { skuId: data.skuId, locationId: data.toLocationId } },
                update: { quantity: { increment: data.qty } },
                create: { skuId: data.skuId, locationId: data.toLocationId, quantity: data.qty },
            });

            await tx.auditLog.create({
                data: {
                    action: 'STOCK_ENTRY',
                    entityType: 'StockMovement',
                    entityId: movement.id,
                    userId: data.userId,
                    details: JSON.stringify({ sku: sku.skuCode, location: location.name, qty: data.qty, type: moveType.name }),
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
        await this.validatePin(data.userId, data.pin);

        const moveType = await this.prisma.movementType.findUnique({ where: { id: data.movementTypeId } });
        if (!moveType) throw new NotFoundException('Tipo de movimentação não encontrado');

        const sku = await this.prisma.skuItem.findUnique({ where: { id: data.skuId } });
        if (!sku) throw new NotFoundException('SKU não encontrado');

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
                    payloadJson: JSON.stringify({
                        skuId: data.skuId,
                        fromLocationId: data.fromLocationId,
                        qty: data.qty,
                        movementTypeId: data.movementTypeId,
                        reason: data.reason,
                        assetId: data.assetId,
                    }),
                },
            });

            await this.prisma.auditLog.create({
                data: {
                    action: 'EXIT_APPROVAL_REQUESTED',
                    entityType: 'ApprovalRequest',
                    entityId: request.id,
                    userId: data.userId,
                    details: JSON.stringify({ sku: sku.skuCode, location: location.name, qty: data.qty }),
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
            const movement = await tx.stockMovement.create({
                data: {
                    typeId: data.movementTypeId,
                    skuId: data.skuId,
                    fromLocationId: data.fromLocationId,
                    qty: data.qty,
                    reason: data.reason,
                    createdByInternalUserId: data.userId,
                    pinValidatedAt: new Date(),
                    assetId: data.assetId,
                },
                include: {
                    type: { select: { name: true } },
                    sku: { select: { skuCode: true, name: true } },
                    fromLocation: { select: { name: true } },
                },
            });

            await tx.stockBalance.update({
                where: { skuId_locationId: { skuId: data.skuId, locationId: data.fromLocationId } },
                data: { quantity: { decrement: data.qty } },
            });

            await tx.auditLog.create({
                data: {
                    action: 'STOCK_EXIT',
                    entityType: 'StockMovement',
                    entityId: movement.id,
                    userId: data.userId,
                    details: JSON.stringify({ sku: sku.skuCode, location: location.name, qty: data.qty, type: moveType.name }),
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

        const payload = JSON.parse(request.payloadJson);
        const sku = await this.prisma.skuItem.findUnique({ where: { id: payload.skuId } });
        const location = await this.prisma.location.findUnique({ where: { id: payload.fromLocationId } });
        const moveType = await this.prisma.movementType.findUnique({ where: { id: payload.movementTypeId } });

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
                details: JSON.stringify({ sku: sku?.skuCode, qty: payload.qty }),
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
                payloadJson: JSON.stringify({ movementId }),
            },
        });

        await this.prisma.auditLog.create({
            data: {
                action: 'REVERSAL_REQUESTED',
                entityType: 'StockMovement',
                entityId: movementId,
                userId,
                details: JSON.stringify({ reason: reasonText }),
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

        const payload = JSON.parse(request.payloadJson);
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
                    details: JSON.stringify({ originalId: original.id, reason: request.reason }),
                },
            });

            return { reverseMovement: reverse, message: 'Reversão aprovada e executada' };
        });
    }

    // ── List movements ──
    async findAllMovements(params?: { skuId?: string; locationId?: string; typeId?: string }) {
        return this.prisma.stockMovement.findMany({
            where: {
                ...(params?.skuId ? { skuId: params.skuId } : {}),
                ...(params?.locationId ? {
                    OR: [
                        { fromLocationId: params.locationId },
                        { toLocationId: params.locationId },
                    ],
                } : {}),
                ...(params?.typeId ? { typeId: params.typeId } : {}),
            },
            include: {
                type: { select: { name: true } },
                sku: { select: { skuCode: true, name: true } },
                fromLocation: { select: { name: true } },
                toLocation: { select: { name: true } },
                createdBy: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
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
