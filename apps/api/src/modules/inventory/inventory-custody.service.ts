import { Injectable, BadRequestException, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AVAILABLE_ASSET_STATUS, CustodyQuery, InventoryTransferInput } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const locationSelect = { id: true, name: true, kind: true, companyId: true, projectId: true, isMainWarehouse: true, company: { select: { id: true, name: true } }, project: { select: { id: true, name: true } }, _count: { select: { assets: true } } } satisfies Prisma.LocationSelect;
const transferInclude = { fromLocation: { select: { id: true, name: true } }, toLocation: { select: { id: true, name: true } }, items: { select: { assetId: true, movementId: true, asset: { select: { id: true, assetCode: true, status: true } } }, orderBy: { assetId: 'asc' as const } } } satisfies Prisma.InventoryTransferInclude;
type Tx = Prisma.TransactionClient;
type Transfer = Prisma.InventoryTransferGetPayload<{ include: { items: true } }>;

@Injectable()
export class InventoryCustodyService {
    constructor(private readonly prisma: PrismaService) {}
    private async pin(userId: string, pin: string) {
        const user = await this.prisma.retry(() => this.prisma.internalUser.findUnique({ where: { id: userId }, select: { pin4Hash: true, isActive: true } }));
        if (!user?.isActive || !user.pin4Hash || !await bcrypt.compare(pin, user.pin4Hash)) throw new UnauthorizedException('PIN inválido');
    }
    options() {
        return this.prisma.retry(() => this.prisma.$transaction(async tx => {
            const [locations, companies, movementTypes, unlocatedAssets, unclassifiedAssets, unclassifiedLocations] = await Promise.all([
                tx.location.findMany({ select: locationSelect, orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
                tx.company.findMany({ select: { id: true, name: true, projects: { select: { id: true, name: true }, orderBy: { name: 'asc' } } }, orderBy: { name: 'asc' } }),
                tx.movementType.findMany({ where: { isFinalWriteOff: false }, select: { id: true, name: true, requiresApproval: true }, orderBy: { name: 'asc' } }),
                tx.asset.count({ where: { currentLocationId: null, status: { not: 'BAIXADO' } } }),
                tx.asset.count({ where: { currentLocation: { kind: null }, status: { not: 'BAIXADO' } } }),
                tx.location.count({ where: { kind: null } }),
            ]);
            return { locations, companies, movementTypes, diagnostic: { unlocatedAssets, unclassifiedAssets, unclassifiedLocations } };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
    }
    assets(query: CustodyQuery) {
        return this.prisma.retry(() => this.prisma.$transaction(async tx => {
            const requestedScope = query.scope ?? (query.companyId ? 'CLIENT' : 'ALL');
            const scope: Prisma.AssetWhereInput = requestedScope === 'CLIENT'
                ? { currentLocation: { kind: 'CLIENT' } }
                : requestedScope === 'INTERNAL'
                    ? { currentLocation: { kind: 'INTERNAL' } }
                    : {};
            const conditions: Prisma.AssetWhereInput[] = [{ OR: [{ status: { not: 'BAIXADO' } }, { currentLocation: { name: 'Baixa' } }] }, scope];
            if (query.locationId) conditions.push({ currentLocationId: query.locationId });
            if (query.companyId) conditions.push({ currentLocation: { kind: 'CLIENT', companyId: query.companyId } });
            if (query.search) conditions.push({ OR: [{ assetCode: { contains: query.search, mode: 'insensitive' as const } }, { sku: { name: { contains: query.search, mode: 'insensitive' as const } } }] });
            const where: Prisma.AssetWhereInput = {
                AND: conditions,
            };
            const [assets, total] = await Promise.all([
                tx.asset.findMany({ where, orderBy: [{ assetCode: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit,
                    select: { id: true, assetCode: true, status: true, currentLocationId: true, sku: { select: { id: true, skuCode: true, name: true, brand: true } }, currentLocation: { select: { id: true, name: true, kind: true, company: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } } } } }),
                tx.asset.count({ where }),
            ]);
            const latest = assets.length ? await tx.stockMovement.findMany({ where: { assetId: { in: assets.map(a => a.id) } }, distinct: ['assetId'], orderBy: [{ assetId: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }], select: { assetId: true, toLocationId: true, referenceType: true, createdAt: true, revertedByMovementId: true } }) : [];
            const movements = new Map(latest.map(m => [m.assetId, m]));
            return { data: assets.map(asset => {
                const move = movements.get(asset.id);
                return { ...asset, shipmentAt: asset.currentLocation?.kind === 'CLIENT' && move?.referenceType === 'CLIENT_SHIPMENT' && !move.revertedByMovementId && move.toLocationId === asset.currentLocationId ? move.createdAt : null };
            }), total, page: query.page, limit: query.limit };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
    }
    history(query: CustodyQuery) {
        return this.prisma.retry(() => this.prisma.$transaction(async tx => {
            const requestedScope = query.scope ?? (query.companyId ? 'CLIENT' : 'ALL');
            const scope = requestedScope === 'CLIENT'
                ? [{ OR: [{ fromLocation: { kind: 'CLIENT' } }, { toLocation: { kind: 'CLIENT' } }] }]
                : requestedScope === 'INTERNAL'
                    ? [{ AND: [{ fromLocation: { kind: 'INTERNAL' } }, { toLocation: { kind: 'INTERNAL' } }] }]
                    : [];
            const where: Prisma.InventoryTransferWhereInput = {
                AND: [
                    ...scope,
                    ...(query.locationId ? [{ OR: [{ fromLocationId: query.locationId }, { toLocationId: query.locationId }] }] : []),
                    ...(query.companyId ? [{ OR: [{ fromLocation: { companyId: query.companyId } }, { toLocation: { companyId: query.companyId } }] }] : []),
                ],
            };
            const [data, total] = await Promise.all([tx.inventoryTransfer.findMany({ where, include: transferInclude, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.limit, take: query.limit }), tx.inventoryTransfer.count({ where })]);
            return { data, total, page: query.page, limit: query.limit };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
    }
    private async validate(tx: Tx, data: Pick<InventoryTransferInput, 'kind' | 'fromLocationId' | 'toLocationId' | 'movementTypeId' | 'assetIds' | 'returnStatus'>) {
        const locationIds = [data.fromLocationId, data.toLocationId].sort();
        await tx.$queryRaw`SELECT id FROM "Location" WHERE id IN (${Prisma.join(locationIds)}) ORDER BY id FOR SHARE`;
        const locations = await tx.location.findMany({ where: { id: { in: locationIds } } });
        const from = locations.find(l => l.id === data.fromLocationId), to = locations.find(l => l.id === data.toLocationId);
        if (!from || !to) throw new NotFoundException('Local de origem ou destino não encontrado');
        if (from.id === to.id || !from.kind || !to.kind) throw new BadRequestException('Classifique os locais e selecione origem e destino diferentes');
        const expected = data.kind === 'SHIPMENT' ? ['INTERNAL', 'CLIENT'] : data.kind === 'RETURN' ? ['CLIENT', 'INTERNAL'] : ['INTERNAL', 'INTERNAL'];
        if (from.kind !== expected[0] || to.kind !== expected[1] || (to.kind === 'CLIENT' && !to.companyId) || (from.kind === 'CLIENT' && !from.companyId)) throw new BadRequestException('Os locais não correspondem à operação selecionada');
        const type = await tx.movementType.findUnique({ where: { id: data.movementTypeId } });
        if (!type || type.isFinalWriteOff) throw new BadRequestException('Selecione um tipo de movimentação que não seja baixa definitiva');
        const ids = [...new Set(data.assetIds)].sort();
        if (!ids.length || ids.length !== data.assetIds.length || ids.length > 100) throw new BadRequestException('Seleção de patrimônios inválida');
        await tx.$queryRaw`SELECT id FROM "Asset" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
        const assets = await tx.asset.findMany({ where: { id: { in: ids } }, orderBy: { id: 'asc' } });
        if (assets.length !== ids.length || assets.some(a => a.currentLocationId !== from.id || a.status === 'BAIXADO' || (data.kind !== 'RETURN' && a.status !== AVAILABLE_ASSET_STATUS))) throw new ConflictException('Um patrimônio saiu da origem ou não está disponível. Recarregue a seleção; nada foi movimentado.');
        const nextStatus = data.kind === 'SHIPMENT' ? 'EM_USO' : data.kind === 'RETURN' ? data.returnStatus ?? 'ATIVO' : AVAILABLE_ASSET_STATUS;
        if (type.setsAssetStatus && type.setsAssetStatus !== nextStatus) throw new BadRequestException('O status configurado no tipo de movimentação é incompatível com esta operação');
        return { assets, nextStatus, type, from, to };
    }
    private async execute(tx: Tx, transfer: Transfer) {
        const validated = await this.validate(tx, { ...transfer, kind: transfer.kind as InventoryTransferInput['kind'], assetIds: transfer.items.map(i => i.assetId), returnStatus: transfer.returnStatus as InventoryTransferInput['returnStatus'] });
        const now = new Date();
        const referenceType = transfer.kind === 'SHIPMENT' ? 'CLIENT_SHIPMENT' : transfer.kind === 'RETURN' ? 'CLIENT_RETURN' : 'INTERNAL_TRANSFER';
        for (const asset of validated.assets) {
            const movement = await tx.stockMovement.create({ data: { typeId: transfer.movementTypeId, skuId: asset.skuId, assetId: asset.id, fromLocationId: transfer.fromLocationId, toLocationId: transfer.toLocationId, qty: 1, reason: transfer.reason, referenceType, referenceId: transfer.id, createdByInternalUserId: transfer.requestedById, pinValidatedAt: now } });
            await tx.inventoryTransferItem.update({ where: { transferId_assetId: { transferId: transfer.id, assetId: asset.id } }, data: { movementId: movement.id, previousStatus: asset.status } });
        }
        await tx.asset.updateMany({ where: { id: { in: validated.assets.map(a => a.id) } }, data: { currentLocationId: transfer.toLocationId, status: validated.nextStatus, lastExitReason: null } });
        await tx.assetEvent.createMany({ data: validated.assets.map(asset => ({ assetId: asset.id, description: `${referenceType}: ${validated.from.name} → ${validated.to.name}. ${transfer.reason}`, createdByInternalUserId: transfer.requestedById })) });
        await tx.inventoryTransfer.update({ where: { id: transfer.id }, data: { status: 'COMPLETED', completedAt: now } });
        await tx.auditLog.create({ data: { action: referenceType, entityType: 'InventoryTransfer', entityId: transfer.id, userId: transfer.requestedById, details: { fromLocationId: transfer.fromLocationId, toLocationId: transfer.toLocationId, assetIds: validated.assets.map(a => a.id), status: validated.nextStatus } } });
    }
    async create(data: InventoryTransferInput, userId: string) {
        await this.pin(userId, data.pin);
        return this.prisma.retry(() => this.prisma.$transaction(async tx => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.requestId}))`;
            const existing = await tx.inventoryTransfer.findUnique({ where: { id: data.requestId }, include: { items: true } });
            if (existing) {
                if (existing.requestedById !== userId || existing.kind !== data.kind || existing.fromLocationId !== data.fromLocationId || existing.toLocationId !== data.toLocationId || existing.movementTypeId !== data.movementTypeId || existing.reason !== data.reason || existing.returnStatus !== (data.returnStatus ?? null) || existing.items.map(i => i.assetId).sort().join() !== [...data.assetIds].sort().join()) throw new ConflictException('Identificador já utilizado em uma operação diferente');
                return tx.inventoryTransfer.findUniqueOrThrow({ where: { id: existing.id }, include: transferInclude });
            }
            const validated = await this.validate(tx, data);
            const approval = validated.type.requiresApproval ? await tx.approvalRequest.create({ data: { requestType: 'CUSTODY_TRANSFER', requestedById: userId, payloadJson: { transferId: data.requestId, kind: data.kind, fromLocationId: data.fromLocationId, toLocationId: data.toLocationId, assetIds: data.assetIds, reason: data.reason } } }) : null;
            const transfer = await tx.inventoryTransfer.create({ data: { id: data.requestId, kind: data.kind, fromLocationId: data.fromLocationId, toLocationId: data.toLocationId, movementTypeId: data.movementTypeId, requestedById: userId, approvalRequestId: approval?.id, reason: data.reason, returnStatus: data.returnStatus, items: { create: validated.assets.map(asset => ({ assetId: asset.id, previousStatus: asset.status })) } }, include: { items: true } });
            if (approval) await tx.auditLog.create({ data: { action: 'CUSTODY_APPROVAL_REQUESTED', entityType: 'InventoryTransfer', entityId: transfer.id, userId, details: { approvalRequestId: approval.id, fromLocationId: data.fromLocationId, toLocationId: data.toLocationId, assetIds: data.assetIds } } });
            else await this.execute(tx, transfer);
            return tx.inventoryTransfer.findUniqueOrThrow({ where: { id: transfer.id }, include: transferInclude });
        }, { timeout: 60000, maxWait: 15000 }));
    }
    async processApproval(id: string, approverId: string, pin: string, approved: boolean) {
        await this.pin(approverId, pin);
        return this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "ApprovalRequest" WHERE id = ${id} FOR UPDATE`;
            const request = await tx.approvalRequest.findUnique({ where: { id } });
            if (!request || request.requestType !== 'CUSTODY_TRANSFER') throw new BadRequestException('Solicitação de custódia não encontrada');
            if (request.status !== 'PENDING') throw new ConflictException('Solicitação já processada');
            if (request.requestedById === approverId) throw new BadRequestException('Você não pode processar sua própria solicitação');
            const transfer = await tx.inventoryTransfer.findUnique({ where: { approvalRequestId: id }, include: { items: true } });
            if (!transfer || transfer.status !== 'PENDING') throw new ConflictException('Operação já processada');
            if (approved) await this.execute(tx, transfer);
            else await tx.inventoryTransfer.update({ where: { id: transfer.id }, data: { status: 'REJECTED' } });
            await tx.approvalRequest.update({ where: { id }, data: { status: approved ? 'APPROVED' : 'REJECTED', approvedById: approverId } });
            await tx.auditLog.create({ data: { action: approved ? 'CUSTODY_APPROVED' : 'CUSTODY_REJECTED', entityType: 'InventoryTransfer', entityId: transfer.id, userId: approverId, details: { approvalRequestId: id } } });
            return tx.inventoryTransfer.findUniqueOrThrow({ where: { id: transfer.id }, include: transferInclude });
        }, { timeout: 60000, maxWait: 15000 });
    }
}
