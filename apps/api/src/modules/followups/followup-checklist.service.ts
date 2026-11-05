import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import type { AddChecklistItemsInput, ChecklistCatalogQuery, CreateChecklistItemInput, UpdateChecklistItemInput } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { FollowupChecklistCatalogService } from './followup-checklist-catalog.service';
import { storedChecklistComponents } from './followup-checklist-components';

@Injectable()
export class FollowupChecklistService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly catalog: FollowupChecklistCatalogService,
    ) {}

    private catalogText(text: string) {
        const label = text.trim().replace(/\s+/g, ' ');
        return { text: label, normalizedText: label.toLocaleLowerCase('pt-BR') };
    }

    async listCatalog(query: ChecklistCatalogQuery) {
        return this.catalog.list(query);
    }

    async saveCatalogItem(text: string, userId: string) {
        return this.catalog.save(text, userId);
    }

    private async lockChecklist(tx: Prisma.TransactionClient, followupId: string, blockId: string) {
        const blocks = await tx.$queryRaw<{ type: string }[]>`
            SELECT "type" FROM "FollowupBlock"
            WHERE "id" = ${blockId} AND "followupId" = ${followupId} FOR UPDATE
        `;
        if (!blocks.length) throw new NotFoundException('Bloco não encontrado');
        if (blocks[0].type !== 'CHECKLIST') throw new BadRequestException('Bloco não é do tipo CHECKLIST');
    }

    async addItems(followupId: string, blockId: string, userId: string, input: AddChecklistItemsInput) {
        const payloadHash = createHash('sha256').update(JSON.stringify({ blockId, items: input.items })).digest('hex');
        // Locking the block serializes additions, their order and replay detection.
        return this.prisma.retry(() => this.prisma.$transaction(async tx => {
            await this.lockChecklist(tx, followupId, blockId);
            const previous = await tx.followupHistory.findFirst({ where: {
                followupId, userId, action: 'CHECKLIST_ITEMS_ADDED',
                details: { path: ['requestId'], equals: input.requestId },
            } });
            if (previous) {
                const details = previous.details as { payloadHash: string; addedCount: number };
                if (details.payloadHash !== payloadHash) throw new ConflictException('Esta inclusão já foi enviada com outros itens');
                return { addedCount: details.addedCount, replayed: true };
            }
            const catalog = await tx.followupChecklistCatalogItem.findMany({
                where: { id: { in: input.items.map(item => item.catalogItemId) } },
                select: { id: true, text: true, components: true },
            });
            if (catalog.length !== input.items.length) throw new BadRequestException('Um dos itens selecionados não está cadastrado');
            const options = new Map((await this.catalog.enrich(catalog, tx)).map(item => [item.id, item]));
            const last = await tx.followupChecklistItem.aggregate({ where: { blockId }, _max: { order: true } });
            const items = input.items.map((item, index) => {
                const option = options.get(item.catalogItemId)!;
                const components = item.components ?? (option.components ?? []).filter(part => part.selectedByDefault)
                    .map(({ text, quantity }) => ({ text, quantity }));
                return { id: randomUUID(), blockId, text: option.text, components,
                    quantity: item.quantity, order: (last._max.order ?? -1) + index + 1 };
            });
            for (let index = 0; index < items.length; index++) {
                const option = options.get(input.items[index].catalogItemId)!;
                await this.catalog.remember(tx, option.text, items[index].components, option.components);
            }
            await tx.followupChecklistItem.createMany({ data: items });
            const details = { blockId, requestId: input.requestId, payloadHash, addedCount: items.length,
                items: items.map(item => ({ id: item.id, text: item.text, quantity: item.quantity, components: item.components })) };
            await tx.followupHistory.create({ data: { followupId, userId, action: 'CHECKLIST_ITEMS_ADDED', details } });
            await tx.auditLog.create({ data: {
                action: 'FOLLOWUP_CHECKLIST_ITEMS_ADDED', entityType: 'Followup', entityId: followupId, userId, details,
            } });
            return { addedCount: items.length, replayed: false };
        }, { timeout: 15000 }));
    }

    async addChecklistItem(followupId: string, blockId: string, userId: string, data: CreateChecklistItemInput) {
        return this.prisma.$transaction(async tx => {
            await this.lockChecklist(tx, followupId, blockId);
            const label = this.catalogText(data.text);
            await tx.followupChecklistCatalogItem.upsert({
                where: { normalizedText: label.normalizedText }, update: {}, create: label,
            });
            const last = await tx.followupChecklistItem.aggregate({ where: { blockId }, _max: { order: true } });
            const item = await tx.followupChecklistItem.create({ data: {
                blockId, text: data.text, details: data.details ?? null, quantity: data.quantity, components: data.components,
                order: data.order ?? (last._max.order ?? -1) + 1,
            } });
            if (data.components !== undefined) await this.catalog.remember(tx, data.text, data.components);
            await tx.auditLog.create({ data: {
                action: 'FOLLOWUP_CHECKLIST_ITEM_ADDED', entityType: 'Followup', entityId: followupId, userId,
                details: { blockId, itemId: item.id },
            } });
            return item;
        });
    }

    async updateChecklistItem(followupId: string, blockId: string, itemId: string, userId: string, data: UpdateChecklistItemInput) {
        return this.prisma.$transaction(async tx => {
            await this.lockChecklist(tx, followupId, blockId);
            const item = await tx.followupChecklistItem.findFirst({ where: { id: itemId, blockId } });
            if (!item) throw new NotFoundException('Item não encontrado');
            if (data.text !== undefined) {
                const label = this.catalogText(data.text);
                await tx.followupChecklistCatalogItem.upsert({
                    where: { normalizedText: label.normalizedText }, update: {}, create: label,
                });
            }
            const updated = await tx.followupChecklistItem.update({ where: { id: itemId }, data });
            if (data.components !== undefined || data.text !== undefined) {
                const components = data.components ?? storedChecklistComponents(item.components);
                if (components !== null) await this.catalog.remember(tx, data.text ?? item.text, components);
            }
            await tx.auditLog.create({ data: {
                action: 'FOLLOWUP_CHECKLIST_ITEM_UPDATED', entityType: 'Followup', entityId: followupId, userId,
                details: { blockId, itemId, changes: data },
            } });
            return updated;
        });
    }

    async removeChecklistItem(followupId: string, blockId: string, itemId: string, userId: string) {
        return this.prisma.$transaction(async tx => {
            await this.lockChecklist(tx, followupId, blockId);
            const item = await tx.followupChecklistItem.findFirst({ where: { id: itemId, blockId } });
            if (!item) throw new NotFoundException('Item não encontrado');
            await tx.followupChecklistItem.delete({ where: { id: itemId } });
            await tx.auditLog.create({ data: {
                action: 'FOLLOWUP_CHECKLIST_ITEM_REMOVED', entityType: 'Followup', entityId: followupId, userId,
                details: { blockId, itemId },
            } });
            return item;
        });
    }
}
