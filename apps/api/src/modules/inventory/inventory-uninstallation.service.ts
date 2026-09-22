import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { UninstallationReviewInput, UninstallationSnapshot } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';

type ReviewPayload = { sourceLocationId: string; assetIds: string[]; returnedAssetIds: string[]; toLocationId: string | null };

@Injectable()
export class InventoryUninstallationService {
    constructor(private readonly prisma: PrismaService) {}

    private async validatePin(userId: string, pin: string) {
        const user = await this.prisma.retry(() => this.prisma.internalUser.findUnique({ where: { id: userId }, select: { isActive: true, pin4Hash: true } }));
        if (!user?.isActive || !user.pin4Hash || !await bcrypt.compare(pin, user.pin4Hash)) throw new UnauthorizedException('PIN inválido');
    }

    async snapshot(locationId: string): Promise<UninstallationSnapshot & { pendingApprovalId: string | null }> {
        const location = await this.prisma.retry(() => this.prisma.location.findUnique({ where: { id: locationId },
            select: { id: true, name: true, kind: true, company: { select: { name: true } }, project: { select: { name: true } } } }));
        if (!location || location.kind !== 'CLIENT' || !location.company || !location.project) throw new NotFoundException('Estoque da sala/projeto não encontrado');
        const [assets, pending] = await this.prisma.retry(() => Promise.all([
            this.prisma.asset.findMany({ where: { currentLocationId: locationId, status: { not: 'BAIXADO' } }, orderBy: [{ sku: { name: 'asc' } }, { assetCode: 'asc' }],
                select: { id: true, assetCode: true, skuId: true, status: true, sku: { select: { name: true } } } }),
            this.prisma.approvalRequest.findMany({ where: { requestType: 'UNINSTALLATION', status: 'PENDING' }, select: { id: true, payloadJson: true } }),
        ]));
        return { location: { id: location.id, name: location.name, companyName: location.company.name, projectName: location.project.name },
            assets: assets.map(asset => ({ id: asset.id, assetCode: asset.assetCode, skuId: asset.skuId, skuName: asset.sku.name, status: asset.status })),
            pendingApprovalId: pending.find(request => (request.payloadJson as ReviewPayload | null)?.sourceLocationId === locationId)?.id ?? null };
    }

    async request(locationId: string, input: UninstallationReviewInput, userId: string) {
        await this.validatePin(userId, input.pin);
        const assetIds = [...input.assetIds].sort(), returnedAssetIds = [...input.returnedAssetIds].sort();
        return this.prisma.retry(() => this.prisma.$transaction(async tx => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.requestId}))`;
            const previous = await tx.approvalRequest.findUnique({ where: { id: input.requestId } });
            const payload: ReviewPayload = { sourceLocationId: locationId, assetIds, returnedAssetIds, toLocationId: input.toLocationId };
            if (previous) {
                const old = previous.payloadJson as ReviewPayload | null;
                if (previous.requestType !== 'UNINSTALLATION' || previous.requestedById !== userId || old?.sourceLocationId !== locationId
                    || old?.toLocationId !== input.toLocationId || [...(old?.assetIds ?? [])].sort().join() !== assetIds.join()
                    || [...(old?.returnedAssetIds ?? [])].sort().join() !== returnedAssetIds.join()) throw new ConflictException('Identificador já utilizado em outra conferência');
                return { approvalRequestId: previous.id, status: previous.status, returned: returnedAssetIds.length, lost: assetIds.length - returnedAssetIds.length };
            }
            await tx.$queryRaw`SELECT id FROM "Location" WHERE id = ${locationId} FOR UPDATE`;
            const source = await tx.location.findUnique({ where: { id: locationId }, select: { kind: true, name: true, projectId: true, companyId: true,
                project: { select: { name: true } }, company: { select: { name: true } } } });
            if (source?.kind !== 'CLIENT' || !source.projectId || !source.companyId) throw new BadRequestException('Selecione o estoque de uma sala/projeto');
            const pending = await tx.approvalRequest.findMany({ where: { requestType: 'UNINSTALLATION', status: 'PENDING' }, select: { payloadJson: true } });
            if (pending.some(item => (item.payloadJson as ReviewPayload | null)?.sourceLocationId === locationId)) throw new ConflictException('Esta sala já possui uma conferência aguardando aprovação');
            const current = await tx.asset.findMany({ where: { currentLocationId: locationId, status: { not: 'BAIXADO' } }, select: { id: true } });
            if (current.map(asset => asset.id).sort().join() !== assetIds.join()) throw new ConflictException('Os itens da sala mudaram. Recarregue a conferência antes de confirmar');
            if (returnedAssetIds.length) {
                const destination = input.toLocationId ? await tx.location.findUnique({ where: { id: input.toLocationId } }) : null;
                if (!destination || destination.kind !== 'INTERNAL' || ['Baixa', 'Manutenção', 'Uso interno - Skyline', 'Outros'].includes(destination.name)) {
                    throw new BadRequestException('Selecione um almoxarifado Skyline para os itens devolvidos');
                }
            }
            const approval = await tx.approvalRequest.create({ data: { id: input.requestId, requestType: 'UNINSTALLATION', requestedById: userId,
                reason: `Desinstalação · ${source.company?.name} / ${source.project?.name} / ${source.name}`, payloadJson: payload as unknown as Prisma.InputJsonObject } });
            await tx.auditLog.create({ data: { action: 'UNINSTALLATION_REVIEW_REQUESTED', entityType: 'ApprovalRequest', entityId: approval.id, userId,
                details: { sourceLocationId: locationId, returned: returnedAssetIds.length, lost: assetIds.length - returnedAssetIds.length } } });
            return { approvalRequestId: approval.id, status: approval.status, returned: returnedAssetIds.length, lost: assetIds.length - returnedAssetIds.length };
        }, { timeout: 60_000, maxWait: 15_000 }));
    }

    async processApproval(id: string, approverId: string, pin: string, approved: boolean) {
        await this.validatePin(approverId, pin);
        return this.prisma.retry(() => this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "ApprovalRequest" WHERE id = ${id} FOR UPDATE`;
            const request = await tx.approvalRequest.findUnique({ where: { id } });
            if (!request || request.requestType !== 'UNINSTALLATION') throw new NotFoundException('Conferência não encontrada');
            if (request.status !== 'PENDING') throw new ConflictException('Conferência já processada');
            if (request.requestedById === approverId) throw new BadRequestException('Outra pessoa precisa aprovar a conferência');
            const payload = request.payloadJson as ReviewPayload;
            if (!payload?.sourceLocationId || !Array.isArray(payload.assetIds) || !Array.isArray(payload.returnedAssetIds)) throw new BadRequestException('Conferência inválida');
            if (approved) {
                await tx.$queryRaw`SELECT id FROM "Location" WHERE id = ${payload.sourceLocationId} FOR UPDATE`;
                const source = await tx.location.findUnique({ where: { id: payload.sourceLocationId },
                    include: { company: { select: { name: true } }, project: { select: { name: true } } } });
                if (!source || source.kind !== 'CLIENT' || !source.company || !source.project) throw new ConflictException('Sala/projeto alterado; nada foi movimentado');
                const ids = [...payload.assetIds].sort();
                await tx.$queryRaw`SELECT id FROM "Asset" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;
                const assets = await tx.asset.findMany({ where: { currentLocationId: source.id, status: { not: 'BAIXADO' } }, select: { id: true, skuId: true, assetCode: true } });
                if (assets.map(asset => asset.id).sort().join() !== ids.join()) throw new ConflictException('A sala mudou desde a conferência. Rejeite e refaça a checklist');
                const returned = new Set(payload.returnedAssetIds);
                if (returned.size !== payload.returnedAssetIds.length || payload.returnedAssetIds.some(assetId => !ids.includes(assetId))) throw new BadRequestException('Lista de devolução inválida');
                const destination = payload.toLocationId ? await tx.location.findUnique({ where: { id: payload.toLocationId } }) : null;
                if (returned.size && (!destination || destination.kind !== 'INTERNAL' || ['Baixa', 'Manutenção', 'Uso interno - Skyline', 'Outros'].includes(destination.name))) throw new ConflictException('Almoxarifado de devolução indisponível');
                const lossLocation = await tx.location.upsert({ where: { name: 'Baixa' }, update: {}, create: { name: 'Baixa', kind: 'INTERNAL' } });
                if (lossLocation.kind !== 'INTERNAL') throw new ConflictException('Local de baixa não classificado como interno');
                const types = await tx.movementType.findMany({ where: { name: { in: ['Entrada', 'Baixa'] } }, select: { id: true, name: true } });
                const entryType = types.find(type => type.name === 'Entrada'), lossType = types.find(type => type.name === 'Baixa');
                if ((returned.size && !entryType) || (assets.length > returned.size && !lossType)) throw new BadRequestException('Tipos de movimentação de entrada e baixa precisam estar configurados');
                const now = new Date();
                await tx.stockMovement.createMany({ data: assets.map(asset => ({ typeId: returned.has(asset.id) ? entryType!.id : lossType!.id,
                    skuId: asset.skuId, assetId: asset.id, fromLocationId: source.id, toLocationId: returned.has(asset.id) ? destination!.id : lossLocation.id,
                    qty: 1, reason: returned.has(asset.id) ? 'Voltou para estoque após desinstalação' : 'Perda na desinstalação',
                    referenceType: returned.has(asset.id) ? 'UNINSTALLATION_RETURN' : 'UNINSTALLATION_LOSS', referenceId: id,
                    createdByInternalUserId: approverId, pinValidatedAt: now })) });
                const returnedIds = assets.filter(asset => returned.has(asset.id)).map(asset => asset.id);
                const lostIds = assets.filter(asset => !returned.has(asset.id)).map(asset => asset.id);
                if (returnedIds.length) await tx.asset.updateMany({ where: { id: { in: returnedIds } }, data: { currentLocationId: destination!.id, status: 'ATIVO', lastExitReason: null } });
                if (lostIds.length) await tx.asset.updateMany({ where: { id: { in: lostIds } }, data: { currentLocationId: lossLocation.id, status: 'BAIXADO', lastExitReason: 'Perda na desinstalação' } });
                await tx.assetEvent.createMany({ data: assets.map(asset => ({ assetId: asset.id, createdByInternalUserId: approverId,
                    description: `${returned.has(asset.id) ? 'Voltou para estoque' : 'Perda'} · ${source.company!.name} / ${source.project!.name} / ${source.name}${returned.has(asset.id) ? ` → ${destination!.name}` : ''}` })) });
                await tx.auditLog.create({ data: { action: 'UNINSTALLATION_CONFIRMED', entityType: 'ApprovalRequest', entityId: id, userId: approverId,
                    details: { sourceLocationId: source.id, projectId: source.projectId, returnedAssetIds: returnedIds, lostAssetIds: lostIds, toLocationId: destination?.id ?? null } } });
            }
            await tx.approvalRequest.update({ where: { id }, data: { status: approved ? 'APPROVED' : 'REJECTED', approvedById: approverId } });
            if (!approved) await tx.auditLog.create({ data: { action: 'UNINSTALLATION_REJECTED', entityType: 'ApprovalRequest', entityId: id, userId: approverId } });
            return { status: approved ? 'APPROVED' : 'REJECTED', approvalRequestId: id };
        }, { timeout: 60_000, maxWait: 15_000 }));
    }
}
