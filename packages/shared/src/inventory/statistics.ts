import { z } from 'zod';
export const inventoryStatisticsQuerySchema = z.object({
    context: z.enum(['WAREHOUSE', 'CLIENT', 'ALL']).default('WAREHOUSE'),
    locationId: z.string().uuid().optional(), companyId: z.string().uuid().optional(),
}).strict().superRefine((v, ctx) => {
    if (v.companyId && v.context !== 'CLIENT') ctx.addIssue({ code: 'custom', path: ['companyId'], message: 'Empresa somente na visão do cliente' });
    if (v.locationId && v.context !== 'WAREHOUSE') ctx.addIssue({ code: 'custom', path: ['locationId'], message: 'Local somente na visão do depósito' });
});
export type InventoryStatisticsQuery = z.infer<typeof inventoryStatisticsQuerySchema>;
export const stockMinimumSchema = z.object({
    skuId: z.string().uuid(), locationId: z.string().uuid(), minimum: z.number().int().min(0).max(1_000_000),
    highOutputThreshold: z.number().int().min(1).max(1_000_000).nullable().optional(),
}).strict();
export type StockMinimumInput = z.infer<typeof stockMinimumSchema>;
export const MOVEMENT_NATURES = ['ENTRY', 'SHIPMENT', 'RETURN', 'TRANSFER', 'EXIT', 'WRITE_OFF', 'REVERSAL', 'REVERTED', 'UNCLASSIFIED'] as const;
export type MovementNature = typeof MOVEMENT_NATURES[number];
export interface StockRanking { skuId: string; skuCode: string; name: string; quantity: number }
export interface ProjectStockRanking { projectId: string; name: string; companyName: string; quantity: number }
export interface ClientInventoryInsights {
    projectsWithAssets: number;
    writeOffs30: number;
    topUsedItems: StockRanking[];
    topWriteOffItems: StockRanking[];
    topProjects: ProjectStockRanking[];
}
export interface ReplenishmentPriority { skuId: string; skuCode: string; name: string; available: number; output30: number; minimum: number | null; shortage: number | null; reason: 'BELOW_MINIMUM' | 'ZERO_RECENT_OUTPUT' | 'HIGH_OUTPUT'; critical: boolean }
export interface InventoryStatistics {
    generatedAt: string; period: { start: string; end: string }; context: InventoryStatisticsQuery['context'];
    location: { id: string; name: string } | null; totals: { skus: number; assets: number; unlocated: number; unclassified: number };
    scope: { assets: number; available: number; maintenance: number } | null;
    movements: { nature: MovementNature; quantity: number; records: number }[];
    topEntries: StockRanking[]; topExits: StockRanking[]; priorities: ReplenishmentPriority[];
    criticalCount: number; minimumConfiguredCount: number; replenishmentConfigured: boolean;
    clientInsights: ClientInventoryInsights | null;
}
