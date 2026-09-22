import { InventoryQueriesService } from './inventory-queries.service';
import { InventorySettingsService } from './inventory-settings.service';
import { InventoryCustodyService } from './inventory-custody.service';
import { InventoryUninstallationService } from './inventory-uninstallation.service';
import { Prisma, type MovementType } from '@prisma/client';
import {
    Injectable,
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { internalExitDestination, type CreateBatchEntryInput, type CreateBatchExitInput } from '@zyllen/shared';
import { resolveProjectStock } from './project-stock';

@Injectable()
export class InventoryService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly queries: InventoryQueriesService,
        private readonly settings: InventorySettingsService,
        private readonly custody: InventoryCustodyService,
        private readonly uninstallations: InventoryUninstallationService,
    ) {}

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
        eventDescription?: string;
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
            await tx.$queryRaw`SELECT id FROM "Location" WHERE id = ${resolvedToLocationId} FOR SHARE`;
            const destination = await tx.location.findUniqueOrThrow({ where: { id: resolvedToLocationId } });
            if (destination.kind === 'CLIENT') throw new BadRequestException('Use o envio ao cliente para registrar o destino dos patrimônios');
            if (data.assetId) {
                await tx.$queryRaw`SELECT id FROM "Asset" WHERE id = ${data.assetId} FOR UPDATE`;
                const asset = await tx.asset.findUnique({ where: { id: data.assetId }, include: { currentLocation: { select: { kind: true } } } });
                if (!asset || asset.skuId !== data.skuId || data.qty !== 1) throw new BadRequestException('Patrimônio/SKU ou quantidade inválidos');
                if (asset.currentLocation?.kind === 'CLIENT') throw new BadRequestException('Use a devolução do cliente para preservar a custódia');
            }
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

            if (data.eventDescription) {
                const eventAssetIds = data.assetId
                    ? [data.assetId]
                    : (await tx.asset.findMany({ where: { assetCode: { in: createdAssetCodes } }, select: { id: true } })).map(asset => asset.id);
                if (eventAssetIds.length) {
                    await tx.assetEvent.createMany({
                        data: eventAssetIds.map(assetId => ({ assetId, description: data.eventDescription!, createdByInternalUserId: data.userId })),
                    });
                }
            }

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
        if (location.kind === 'CLIENT') throw new BadRequestException('Use a devolução do cliente para preservar o destino e a custódia');
        if (internalExitDestination(data.reason ?? '')?.status === 'BAIXADO' && !moveType.isFinalWriteOff) {
            throw new BadRequestException('Use a movimentação Baixa com aprovação para retirar definitivamente o patrimônio');
        }
        if (moveType.isFinalWriteOff && !moveType.requiresApproval) {
            throw new BadRequestException('A baixa definitiva exige aprovação configurada');
        }

        // Check available assets at location
        const availableCount = await this.prisma.asset.count({
            where: { skuId: data.skuId, currentLocationId: data.fromLocationId, status: 'ATIVO' },
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
            await tx.$queryRaw`SELECT id FROM "Location" WHERE id = ${data.fromLocationId} FOR SHARE`;
            const source = await tx.location.findUniqueOrThrow({ where: { id: data.fromLocationId } });
            if (source.kind !== 'INTERNAL') throw new BadRequestException('Use a devolução do cliente para preservar o destino e a custódia');
            const selected = data.assetId
                ? await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Asset" WHERE id = ${data.assetId} FOR UPDATE`
                : await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Asset" WHERE "skuId" = ${data.skuId} AND "currentLocationId" = ${source.id} AND status = 'ATIVO' ORDER BY id LIMIT ${data.qty} FOR UPDATE`;
            const ids = selected.map(row => row.id);
            const assets = await tx.asset.findMany({ where: { id: { in: ids } }, select: { id: true, skuId: true, status: true, currentLocationId: true } });
            if (assets.length !== data.qty || assets.some(asset => asset.skuId !== data.skuId || asset.currentLocationId !== source.id || asset.status !== 'ATIVO')) {
                throw new ConflictException('Patrimônio indisponível na origem; nada foi aplicado');
            }
            const classification = moveType.isFinalWriteOff ? { locationName: 'Baixa', status: 'BAIXADO', referenceType: 'STOCK_WRITE_OFF' }
                : internalExitDestination(data.reason ?? '') ?? { locationName: 'Outros', status: 'EM_USO', referenceType: 'OTHER_EXIT' };
            if (moveType.setsAssetStatus && moveType.setsAssetStatus !== classification.status) throw new BadRequestException('O tipo de movimentação não corresponde ao motivo selecionado');
            const destination = await tx.location.upsert({ where: { name: classification.locationName }, update: {}, create: { name: classification.locationName, kind: 'INTERNAL' } });
            if (destination.kind !== 'INTERNAL' || destination.id === source.id) throw new BadRequestException('Estoque interno de destino inválido');
            const now = new Date();
            const movements = await Promise.all(assets.map(asset => tx.stockMovement.create({ data: {
                typeId: data.movementTypeId, skuId: asset.skuId, assetId: asset.id, fromLocationId: source.id, toLocationId: destination.id,
                qty: 1, reason: data.reason, referenceType: classification.referenceType, createdByInternalUserId: data.userId, pinValidatedAt: now,
            } })));
            await tx.asset.updateMany({ where: { id: { in: ids } }, data: { currentLocationId: destination.id, status: classification.status, lastExitReason: data.reason?.trim() || 'Saída' } });
            await tx.assetEvent.createMany({ data: assets.map(asset => ({ assetId: asset.id, description: `${classification.locationName}: ${data.reason?.trim() || 'Saída'}`,
                createdByInternalUserId: data.userId })) });

            await tx.auditLog.create({
                data: {
                    action: 'STOCK_EXIT',
                    entityType: 'StockMovement',
                    entityId: movements[0].id,
                    userId: data.userId,
                    details: { sku: sku.skuCode, location: location.name, qty: data.qty, type: moveType.name, assetIds: ids, destinationLocationId: destination.id },
                },
            });

            return { approvalRequired: false, movement: movements[0], movements };
        });
    }

    // ── Batch exit (saída em lote) ──
    // Tudo-ou-nada: valida todos os patrimônios ANTES e aplica numa única
    // transação. Para cada item: movimentação de Saída, sai do saldo com o
    // motivo, aplica o status escolhido e cria um evento na timeline.
    async createBatchEntry(data: CreateBatchEntryInput & { userId: string }) {
        await this.validatePin(data.userId, data.pin);
        const [moveType, destination] = await Promise.all([
            this.prisma.movementType.findUnique({ where: { id: data.movementTypeId } }),
            this.prisma.location.findUnique({ where: { id: data.toLocationId } }),
        ]);
        if (!moveType || moveType.isFinalWriteOff) throw new BadRequestException('Selecione um tipo de movimentacao valido para entrada');
        if (moveType.requiresApproval) throw new BadRequestException('Entradas em lote nao podem usar um tipo que exige aprovacao');
        if (moveType.setsAssetStatus && moveType.setsAssetStatus !== data.returnStatus) throw new BadRequestException('O status do tipo de movimentacao e incompativel com a condicao informada');
        if (!destination || destination.kind !== 'INTERNAL') throw new BadRequestException('Selecione um estoque interno da Skyline como destino');

        const uniqueIds = [...new Set(data.assetIds)].sort();
        const processed = await this.prisma.$transaction(async tx => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.requestId}))`;
            const previous = await tx.auditLog.findFirst({ where: { action: 'STOCK_ENTRY_BATCH', entityType: 'InventoryBatchEntry', entityId: data.requestId }, orderBy: { createdAt: 'desc' } });
            if (previous) {
                const details = previous.details as { assetIds?: string[]; toLocationId?: string; processed?: number } | null;
                if (previous.userId !== data.userId || details?.toLocationId !== data.toLocationId || [...(details?.assetIds ?? [])].sort().join() !== uniqueIds.join()) throw new ConflictException('Identificador ja utilizado em outra entrada em lote');
                return details?.processed ?? uniqueIds.length;
            }
            const initial = await tx.asset.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, currentLocationId: true } });
            const locationIds = [...new Set([data.toLocationId, ...initial.map(asset => asset.currentLocationId).filter((id): id is string => Boolean(id))])].sort();
            if (locationIds.length) await tx.$queryRaw`SELECT id FROM "Location" WHERE id IN (${Prisma.join(locationIds)}) ORDER BY id FOR SHARE`;
            await tx.$queryRaw`SELECT id FROM "Asset" WHERE id IN (${Prisma.join(uniqueIds)}) ORDER BY id FOR UPDATE`;
            const assets = await tx.asset.findMany({ where: { id: { in: uniqueIds } }, include: { currentLocation: { select: { kind: true } } }, orderBy: { id: 'asc' } });
            if (assets.length !== uniqueIds.length) throw new BadRequestException('Um ou mais patrimonios nao existem');
            if (assets.some(asset => asset.currentLocationId !== initial.find(previousAsset => previousAsset.id === asset.id)?.currentLocationId)) throw new ConflictException('Patrimonio alterado por outra operacao; recarregue');
            if (assets.some(asset => asset.status === 'BAIXADO')) throw new ConflictException('Patrimonio baixado nao pode retornar ao estoque');
            if (assets.some(asset => asset.currentLocationId === data.toLocationId)) throw new ConflictException('Um patrimonio ja esta no estoque de destino');
            const now = new Date();
            await tx.stockMovement.createMany({ data: assets.map(asset => ({
                typeId: moveType.id, skuId: asset.skuId, assetId: asset.id,
                fromLocationId: asset.currentLocationId, toLocationId: data.toLocationId, qty: 1, reason: data.reason,
                referenceType: asset.currentLocation?.kind === 'CLIENT' ? 'CLIENT_RETURN' : asset.currentLocation?.kind === 'INTERNAL' ? 'INTERNAL_TRANSFER' : 'STOCK_ENTRY',
                referenceId: data.requestId, createdByInternalUserId: data.userId, pinValidatedAt: now,
            })) });
            await tx.asset.updateMany({ where: { id: { in: uniqueIds } }, data: { currentLocationId: data.toLocationId, status: data.returnStatus, lastExitReason: null } });
            await tx.assetEvent.createMany({ data: assets.map(asset => ({ assetId: asset.id, description: data.eventDescription, createdByInternalUserId: data.userId })) });
            await tx.auditLog.create({ data: { action: 'STOCK_ENTRY_BATCH', entityType: 'InventoryBatchEntry', entityId: data.requestId, userId: data.userId, details: { assetIds: uniqueIds, toLocationId: data.toLocationId, reason: data.reason, returnStatus: data.returnStatus, processed: uniqueIds.length } } });
            return uniqueIds.length;
        }, { timeout: 60000, maxWait: 15000 });
        return { processed };
    }

    async createBatchExit(data: CreateBatchExitInput & { userId: string }) {
        await this.validatePin(data.userId, data.pin);
        const requestId = data.requestId ?? randomUUID();

        const moveType = await this.prisma.movementType.findFirst({ where: { name: 'Saída' } });
        if (!moveType) throw new NotFoundException('Tipo de movimentação "Saída" não encontrado');
        const internalDestination = internalExitDestination(data.reason);
        if (internalDestination && (data.destinationLocationId || data.companyId || data.projectId)) throw new BadRequestException('Este motivo usa um estoque interno automático');
        if (!internalDestination && !data.destinationLocationId && !(data.companyId && data.projectId)) throw new BadRequestException('Selecione um cliente e projeto para esta saída');
        if (!internalDestination && Boolean(data.companyId) !== Boolean(data.projectId)) throw new BadRequestException('Informe o cliente e o projeto de destino');
        if (internalDestination && data.newStatus !== internalDestination.status) throw new BadRequestException('O estado não corresponde ao motivo da saída');

        if (internalDestination?.status === 'BAIXADO') {
            const approval = await this.prisma.$transaction(async tx => {
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${requestId}))`;
                const existing = await tx.approvalRequest.findUnique({ where: { id: requestId } });
                const ids = [...new Set(data.assetIds)].sort();
                if (existing) {
                    const previous = existing.payloadJson as { assetIds?: string[]; reason?: string; eventDescription?: string } | null;
                    if (existing.requestType !== 'BATCH_WRITE_OFF' || existing.requestedById !== data.userId || previous?.reason !== data.reason
                        || previous?.eventDescription !== data.eventDescription || [...(previous?.assetIds ?? [])].sort().join() !== ids.join()) throw new ConflictException('Identificador já utilizado em outra baixa');
                    return existing;
                }
                await tx.$queryRaw`SELECT id FROM "Asset" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
                const pending = await tx.approvalRequest.findMany({ where: { requestType: 'BATCH_WRITE_OFF', status: 'PENDING' }, select: { payloadJson: true } });
                if (pending.some(item => ((item.payloadJson as { assetIds?: string[] } | null)?.assetIds ?? []).some(id => ids.includes(id)))) {
                    throw new ConflictException('Um patrimônio já possui baixa aguardando aprovação');
                }
                const assets = await tx.asset.findMany({ where: { id: { in: ids } }, select: { id: true, status: true, currentLocation: { select: { kind: true } } } });
                if (assets.length !== ids.length || assets.some(asset => asset.status !== 'ATIVO' || asset.currentLocation?.kind !== 'INTERNAL')) throw new ConflictException('Um patrimônio não está disponível no almoxarifado');
                const created = await tx.approvalRequest.create({ data: { id: requestId, requestType: 'BATCH_WRITE_OFF', requestedById: data.userId,
                    reason: data.reason, payloadJson: { assetIds: ids, reason: data.reason, eventDescription: data.eventDescription } } });
                await tx.auditLog.create({ data: { action: 'BATCH_WRITE_OFF_REQUESTED', entityType: 'ApprovalRequest', entityId: requestId, userId: data.userId,
                    details: { assetIds: ids, reason: data.reason } } });
                return created;
            });
            return { approvalRequired: true, approvalRequestId: approval.id, message: 'Baixa enviada para aprovação; os itens ainda não foram movimentados' };
        }

        const processed = await this.prisma.$transaction(tx => this.executeBatchExit(tx, data, requestId, moveType, internalDestination), { timeout: 60000, maxWait: 15000 });
        return { processed };
    }

    private async executeBatchExit(tx: Prisma.TransactionClient, data: Omit<CreateBatchExitInput, 'pin'> & { userId: string }, requestId: string,
        moveType: MovementType, internalDestination: ReturnType<typeof internalExitDestination>, approved = false) {
        const uniqueIds = [...new Set(data.assetIds)].sort();
        const now = new Date();
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${requestId}))`;
            const destination = internalDestination
                ? await tx.location.upsert({ where: { name: internalDestination.locationName }, update: {}, create: { name: internalDestination.locationName, kind: 'INTERNAL' } })
                : data.companyId && data.projectId
                    ? await resolveProjectStock(tx, { companyId: data.companyId, projectId: data.projectId, actorId: data.userId })
                    : await tx.location.findUnique({ where: { id: data.destinationLocationId! } });
            if (!destination || (internalDestination ? destination.kind !== 'INTERNAL' : destination.kind !== 'CLIENT' || !destination.companyId || !destination.projectId)) {
                throw new BadRequestException('O estoque de destino não corresponde ao motivo selecionado');
            }
            const previous = await tx.auditLog.findFirst({ where: { action: 'STOCK_EXIT_BATCH_REQUEST', entityType: 'InventoryBatchExit', entityId: requestId }, orderBy: { createdAt: 'desc' } });
            if (previous) {
                const details = previous.details as { assetIds?: string[]; requestedDestinationLocationId?: string | null; requestedCompanyId?: string | null; requestedProjectId?: string | null; destinationLocationId?: string | null; processed?: number; reason?: string } | null;
                const sameDestination = data.companyId && data.projectId
                    ? details?.requestedCompanyId === data.companyId && details?.requestedProjectId === data.projectId
                    : (details?.requestedDestinationLocationId ?? (internalDestination ? null : details?.destinationLocationId) ?? null) === (data.destinationLocationId ?? null);
                if (previous.userId !== data.userId || !sameDestination || details?.reason !== data.reason || [...(details?.assetIds ?? [])].sort().join() !== uniqueIds.join()) throw new ConflictException('Identificador já utilizado em outra saída em lote');
                return details?.processed ?? uniqueIds.length;
            }
            const initial = await tx.asset.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, currentLocationId: true } });
            const locations = [...new Set([...initial.map(a => a.currentLocationId).filter((id): id is string => Boolean(id)), destination.id])].sort();
            if (locations.length) await tx.$queryRaw`SELECT id FROM "Location" WHERE id IN (${Prisma.join(locations)}) ORDER BY id FOR SHARE`;
            await tx.$queryRaw`SELECT id FROM "Asset" WHERE id IN (${Prisma.join(uniqueIds)}) ORDER BY id FOR UPDATE`;
            const assets = await tx.asset.findMany({ where: { id: { in: uniqueIds } }, include: { sku: { select: { skuCode: true } }, currentLocation: { select: { kind: true } } } });
            if (assets.length !== uniqueIds.length) throw new BadRequestException('Um ou mais patrimônios não existem mais');
            if (assets.some(a => a.currentLocationId !== initial.find(previous => previous.id === a.id)?.currentLocationId)) throw new ConflictException('Patrimônio alterado por outra operação; recarregue');
            if (assets.some(a => !a.currentLocationId || a.status !== 'ATIVO')) throw new ConflictException('Patrimônio indisponível no almoxarifado; nada foi aplicado');
            if (assets.some(a => a.currentLocation?.kind === 'CLIENT')) throw new BadRequestException('Use a devolução do cliente para preservar a custódia');
            if (assets.some(a => a.currentLocation?.kind !== 'INTERNAL')) throw new ConflictException('Somente patrimônios de almoxarifados internos podem sair por este fluxo');
            if (moveType.requiresApproval && !approved) throw new BadRequestException('Este tipo exige aprovação');
            await tx.stockMovement.createMany({
                data: assets.map((a) => ({
                    typeId: moveType.id,
                    skuId: a.skuId,
                    fromLocationId: a.currentLocationId,
                    toLocationId: destination.id,
                    qty: 1,
                    reason: data.reason,
                    referenceType: internalDestination?.referenceType ?? 'CLIENT_SHIPMENT',
                    referenceId: requestId,
                    createdByInternalUserId: data.userId,
                    pinValidatedAt: now,
                    assetId: a.id,
                })),
            });
            await tx.asset.updateMany({
                where: { id: { in: assets.map((a) => a.id) } },
                data: { currentLocationId: destination.id, lastExitReason: internalDestination ? data.reason : null, status: internalDestination?.status ?? 'EM_USO' },
            });
            await tx.assetEvent.createMany({
                data: assets.map((a) => ({ assetId: a.id, description: data.eventDescription, createdByInternalUserId: data.userId })),
            });
            await tx.auditLog.createMany({
                data: assets.map((a) => ({
                    action: internalDestination ? internalDestination.referenceType : 'CLIENT_SHIPMENT_BATCH',
                    entityType: 'Asset',
                    entityId: a.id,
                    userId: data.userId,
                    details: { assetCode: a.assetCode, sku: a.sku.skuCode, reason: data.reason, status: internalDestination?.status ?? 'EM_USO', destinationLocationId: destination.id },
                })),
            });
            await tx.auditLog.create({ data: { action: 'STOCK_EXIT_BATCH_REQUEST', entityType: 'InventoryBatchExit', entityId: requestId, userId: data.userId, details: { assetIds: uniqueIds, requestedDestinationLocationId: data.destinationLocationId ?? null, requestedCompanyId: data.companyId ?? null, requestedProjectId: data.projectId ?? null, destinationLocationId: destination.id, reason: data.reason, processed: assets.length } } });
            return assets.length;
    }

    private async processBatchWriteOff(id: string, approverId: string, pin: string, approved: boolean) {
        await this.validatePin(approverId, pin);
        return this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "ApprovalRequest" WHERE id = ${id} FOR UPDATE`;
            const request = await tx.approvalRequest.findUnique({ where: { id } });
            if (!request || request.requestType !== 'BATCH_WRITE_OFF') throw new NotFoundException('Baixa não encontrada');
            if (request.status !== 'PENDING') throw new ConflictException('Baixa já processada');
            if (request.requestedById === approverId) throw new BadRequestException('Outra pessoa precisa aprovar a baixa');
            let processed = 0;
            if (approved) {
                const payload = request.payloadJson as { assetIds?: string[]; reason?: string; eventDescription?: string } | null;
                if (!payload?.assetIds?.length || !payload.reason || !payload.eventDescription) throw new BadRequestException('Solicitação de baixa inválida');
                const destination = internalExitDestination(payload.reason);
                if (destination?.status !== 'BAIXADO') throw new BadRequestException('Motivo de baixa inválido');
                const moveType = await tx.movementType.findUnique({ where: { name: 'Baixa' } });
                if (!moveType || !moveType.isFinalWriteOff || moveType.setsAssetStatus !== 'BAIXADO') throw new BadRequestException('Tipo de baixa definitiva não configurado');
                processed = await this.executeBatchExit(tx, { assetIds: payload.assetIds, reason: payload.reason,
                    eventDescription: payload.eventDescription, newStatus: 'BAIXADO', userId: request.requestedById }, id, moveType, destination, true);
            }
            await tx.approvalRequest.update({ where: { id }, data: { status: approved ? 'APPROVED' : 'REJECTED', approvedById: approverId } });
            await tx.auditLog.create({ data: { action: approved ? 'BATCH_WRITE_OFF_APPROVED' : 'BATCH_WRITE_OFF_REJECTED', entityType: 'ApprovalRequest',
                entityId: id, userId: approverId, details: { processed } } });
            return { approvalRequestId: id, status: approved ? 'APPROVED' : 'REJECTED', processed };
        }, { timeout: 60_000, maxWait: 15_000 });
    }

    // ── Approve exit ──
    async approveExit(approvalRequestId: string, approverId: string, pin: string) {
        const kind = await this.prisma.approvalRequest.findUnique({ where: { id: approvalRequestId }, select: { requestType: true } });
        if (kind?.requestType === 'CUSTODY_TRANSFER') return this.custody.processApproval(approvalRequestId, approverId, pin, true);
        if (kind?.requestType === 'UNINSTALLATION') return this.uninstallations.processApproval(approvalRequestId, approverId, pin, true);
        if (kind?.requestType === 'BATCH_WRITE_OFF') return this.processBatchWriteOff(approvalRequestId, approverId, pin, true);
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
        const kind = await this.prisma.approvalRequest.findUnique({ where: { id: approvalRequestId }, select: { requestType: true } });
        if (kind?.requestType === 'CUSTODY_TRANSFER') return this.custody.processApproval(approvalRequestId, approverId, pin, false);
        if (kind?.requestType === 'UNINSTALLATION') return this.uninstallations.processApproval(approvalRequestId, approverId, pin, false);
        if (kind?.requestType === 'BATCH_WRITE_OFF') return this.processBatchWriteOff(approvalRequestId, approverId, pin, false);
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
        return this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "ApprovalRequest" WHERE id = ${approvalRequestId} FOR UPDATE`;
            const request = await tx.approvalRequest.findUnique({ where: { id: approvalRequestId } });
            if (!request || request.requestType !== 'REVERSAL') throw new BadRequestException('Solicitação de reversão não encontrada');
            if (request.status !== 'PENDING') throw new ConflictException('Solicitação já processada');
            if (request.requestedById === approverId) throw new BadRequestException('Você não pode aprovar sua própria solicitação');
            const movementId = (request.payloadJson as { movementId?: string }).movementId;
            if (!movementId) throw new BadRequestException('Solicitação inválida');
            const initial = await tx.stockMovement.findUnique({ where: { id: movementId } });
            if (!initial) throw new NotFoundException('Movimentação não encontrada');
            if (initial.assetId) await tx.$queryRaw`SELECT id FROM "Asset" WHERE id = ${initial.assetId} FOR UPDATE`;
            await tx.$queryRaw`SELECT id FROM "StockMovement" WHERE id = ${movementId} FOR UPDATE`;
            const original = await tx.stockMovement.findUniqueOrThrow({ where: { id: movementId } });
            if (original.revertedByMovementId) throw new ConflictException('Movimentação já revertida');
            const structured = ['CLIENT_SHIPMENT', 'CLIENT_RETURN', 'INTERNAL_TRANSFER'].includes(original.referenceType ?? '');
            const asset = original.assetId ? await tx.asset.findUniqueOrThrow({ where: { id: original.assetId } }) : null;
            const expectedLocation = original.toLocationId ?? null;
            if (asset) {
                const later = await tx.stockMovement.count({ where: { assetId: asset.id, id: { not: original.id }, createdAt: { gte: original.createdAt } } });
                if (later || asset.currentLocationId !== expectedLocation) throw new ConflictException('O patrimônio foi movimentado depois desta operação. Registre uma nova transferência/devolução.');
            }
            const item = structured && original.assetId && original.referenceId ? await tx.inventoryTransferItem.findUnique({ where: { transferId_assetId: { transferId: original.referenceId, assetId: original.assetId } } }) : null;
            if (structured && (!asset || !item || !original.fromLocationId || !original.toLocationId)) throw new BadRequestException('Histórico de custódia incompleto');
            const transfer = item ? await tx.inventoryTransfer.findUniqueOrThrow({ where: { id: item.transferId } }) : null;
            const expectedStatus = transfer?.kind === 'SHIPMENT' ? 'EM_USO' : transfer?.kind === 'RETURN' ? transfer.returnStatus ?? 'ATIVO' : 'ATIVO';
            if (structured && asset!.status !== expectedStatus) throw new ConflictException('A condição do patrimônio mudou; registre uma nova operação');
            const reverse = await tx.stockMovement.create({ data: {
                typeId: original.typeId, skuId: original.skuId, assetId: original.assetId,
                fromLocationId: original.toLocationId, toLocationId: original.fromLocationId, qty: original.qty,
                reason: 'Reversão: ' + (request.reason ?? 'sem motivo'), createdByInternalUserId: approverId,
                pinValidatedAt: new Date(), referenceType: 'REVERSAL', referenceId: original.id,
            } });
            await tx.stockMovement.update({ where: { id: original.id }, data: { revertedByMovementId: reverse.id } });
            if (asset) await tx.asset.update({ where: { id: asset.id }, data: { currentLocationId: original.fromLocationId, ...(item ? { status: item.previousStatus, lastExitReason: null } : {}) } });
            await tx.approvalRequest.update({ where: { id: request.id }, data: { status: 'APPROVED', approvedById: approverId } });
            await tx.auditLog.create({ data: { action: 'REVERSAL_APPROVED', entityType: 'StockMovement', entityId: reverse.id, userId: approverId, details: { originalId: original.id, reason: request.reason, fromLocationId: original.toLocationId, toLocationId: original.fromLocationId } } });
            return { reverseMovement: reverse, message: 'Reversão aprovada e executada' };
        });
    }

    // ── List movements ──
    async findAllMovements(params?: { skuId?: string; locationId?: string; typeId?: string; search?: string; skip?: number; take?: number }) { return this.queries.findAllMovements(params); }

    // ── Balances — count of active assets per SKU per location ──
    async getBalances(params?: { locationId?: string; skuId?: string }) { return this.queries.getBalances(params); }

    // ── Pending approvals ──
    async getPendingApprovals() { return this.queries.getPendingApprovals(); }

    // ── Stats ──
    async getStats() { return this.queries.getStats(); }

    // ── Movement Types CRUD ──
    async findAllMovementTypes() { return this.settings.findAllMovementTypes(); }

    async createMovementType(data: { name: string; requiresApproval?: boolean; isFinalWriteOff?: boolean; setsAssetStatus?: string }) { return this.settings.createMovementType(data); }

    async updateMovementType(id: string, data: { name?: string; requiresApproval?: boolean; isFinalWriteOff?: boolean; setsAssetStatus?: string }) { return this.settings.updateMovementType(id, data); }

    async deleteMovementType(id: string) { return this.settings.deleteMovementType(id); }

    // ── Exit Reasons CRUD (motivos de saída configuráveis) ──
    async findAllExitReasons(params?: { onlyActive?: boolean }) { return this.settings.findAllExitReasons(params); }

    async createExitReason(data: { name?: string }) { return this.settings.createExitReason(data); }

    async updateExitReason(id: string, data: { name?: string; active?: boolean }) { return this.settings.updateExitReason(id, data); }

    async deleteExitReason(id: string) { return this.settings.deleteExitReason(id); }
}
