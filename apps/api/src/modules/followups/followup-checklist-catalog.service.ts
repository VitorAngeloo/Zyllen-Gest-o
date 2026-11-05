import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
    checklistComponentTemplatesSchema,
    type ChecklistCatalogQuery, type FollowupChecklistCatalogItem,
    type FollowupChecklistComponent, type FollowupChecklistComponentTemplate,
} from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { checklistGroupKey, componentKey, historicalChecklistComponents, storedChecklistComponents } from './followup-checklist-components';

type CatalogRow = { id: string; text: string; components: Prisma.JsonValue | null };

@Injectable()
export class FollowupChecklistCatalogService {
    constructor(private readonly prisma: PrismaService) {}

    private label(text: string) {
        const label = text.trim().replace(/\s+/g, ' ');
        return { text: label, normalizedText: componentKey(label) };
    }

    async enrich(rows: CatalogRow[], tx: Prisma.TransactionClient): Promise<FollowupChecklistCatalogItem[]> {
        if (!rows.length) return [];
        const explicit = new Map(rows.map(row => [row.id, checklistComponentTemplatesSchema.safeParse(row.components)]));
        const inheritedRows = rows.filter(row => !explicit.get(row.id)!.success);
        const keys = new Set(inheritedRows.map(row => checklistGroupKey(row.text)));
        const history = keys.size ? await tx.followupChecklistItem.findMany({
            where: { OR: [{ details: { not: null } }, { components: { not: Prisma.DbNull } }] },
            select: { text: true, details: true, components: true },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }) : [];
        const groups = new Map<string, { defaults: FollowupChecklistComponent[]; options: Map<string, FollowupChecklistComponent> }>();
        for (const item of history) {
            const key = checklistGroupKey(item.text);
            if (!keys.has(key)) continue;
            const stored = storedChecklistComponents(item.components);
            const components = stored ?? historicalChecklistComponents(item.details);
            if (!components.length && stored === null) continue;
            if (!groups.has(key)) groups.set(key, { defaults: components, options: new Map() });
            const group = groups.get(key)!;
            for (const component of components) {
                const name = componentKey(component.text);
                if (!group.options.has(name)) group.options.set(name, component);
            }
        }
        return rows.map(row => {
            const stored = explicit.get(row.id)!;
            if (stored.success) return { id: row.id, text: row.text, components: stored.data };
            const group = groups.get(checklistGroupKey(row.text));
            const defaults = new Map((group?.defaults ?? []).map(item => [componentKey(item.text), item]));
            const options = new Map(group?.options ?? []);
            const components = [...options].slice(0, 100).map(([key, component]) => ({
                text: component.text, quantity: defaults.get(key)?.quantity ?? component.quantity, selectedByDefault: defaults.has(key),
            }));
            return { id: row.id, text: row.text, components };
        });
    }

    async list(query: ChecklistCatalogQuery) {
        const where = query.search ? { normalizedText: { contains: componentKey(query.search) } } : {};
        return this.prisma.retry(() => this.prisma.$transaction(async tx => {
            const rows = await tx.followupChecklistCatalogItem.findMany({
                where, select: { id: true, text: true, components: true },
                orderBy: [{ normalizedText: 'asc' }, { id: 'asc' }],
                skip: (query.page - 1) * query.limit, take: query.limit,
            });
            return { data: await this.enrich(rows, tx), total: await tx.followupChecklistCatalogItem.count({ where }),
                page: query.page, limit: query.limit };
        }, { timeout: 15000 }));
    }

    async save(text: string, userId: string) {
        const label = this.label(text);
        return this.prisma.$transaction(async tx => {
            const item = await tx.followupChecklistCatalogItem.upsert({
                where: { normalizedText: label.normalizedText }, update: {}, create: { ...label, components: [] },
                select: { id: true, text: true, components: true },
            });
            await tx.auditLog.create({ data: {
                action: 'FOLLOWUP_CHECKLIST_CATALOG_SAVED', entityType: 'FollowupChecklistCatalogItem',
                entityId: item.id, userId, details: { text: item.text },
            } });
            return (await this.enrich([item], tx))[0];
        }, { timeout: 15000 });
    }

    async remember(tx: Prisma.TransactionClient, text: string, selected: FollowupChecklistComponent[], available: FollowupChecklistComponentTemplate[] = []) {
        const label = this.label(text);
        const previous = await tx.followupChecklistCatalogItem.findUnique({ where: { normalizedText: label.normalizedText } });
        if (!previous) return;
        const parsed = checklistComponentTemplatesSchema.safeParse(previous?.components);
        const options = new Map(selected.map(item => [componentKey(item.text), item]));
        for (const component of [...available, ...(parsed.success ? parsed.data : [])]) {
            if (!options.has(componentKey(component.text))) options.set(componentKey(component.text), component);
        }
        const chosen = new Map(selected.map(item => [componentKey(item.text), item]));
        const components = [...options].slice(0, 100).map(([key, item]) => ({
            text: item.text, quantity: chosen.get(key)?.quantity ?? item.quantity, selectedByDefault: chosen.has(key),
        }));
        await tx.followupChecklistCatalogItem.update({ where: { id: previous.id }, data: { components } });
    }
}
