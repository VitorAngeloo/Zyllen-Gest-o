import { z } from 'zod';
import { projectStatisticsQuerySchema } from '../project-services';
import { ticketStatisticsQuerySchema, type TicketStatistics } from '../tickets';
import type { ProjectStatistics } from '../project-services';
import type { OperationsStatistics } from '../trips';
import type { InventoryStatistics } from '../inventory/statistics';
export const PANEL_IDS = ['atendimentos', 'projetos', 'operacoes', 'estoque'] as const;
export type PanelId = typeof PANEL_IDS[number];
export const PANEL_PERMISSIONS: Record<PanelId, string> = { atendimentos: 'tickets.view', projetos: 'schedule.view', operacoes: 'schedule.view', estoque: 'inventory.view' };
export const PANEL_ROTATION_MS = 60_000;
export const panelMirrorInputSchema = z.object({ views: z.array(z.enum(PANEL_IDS)).min(1).max(4).refine(views => new Set(views).size === views.length, 'Selecione cada visão uma vez') }).strict();
export type PanelMirrorInput = z.infer<typeof panelMirrorInputSchema>;
export const panelStatisticsQuerySchema = z.object({ view: z.enum(PANEL_IDS), start: z.string().optional(), end: z.string().optional(), source: z.enum(['ALL', 'INTERNAL', 'CLIENT']).default('ALL') }).strict().superRefine((value, ctx) => {
    if (value.view === 'estoque') {
        if (value.start || value.end) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['start'], message: 'Estoque usa uma janela fixa de 30 dias' });
        return;
    }
    const period = value.view === 'atendimentos' ? ticketStatisticsQuerySchema.safeParse({ start: value.start, end: value.end, source: value.source }) : projectStatisticsQuerySchema.safeParse({ start: value.start, end: value.end });
    if (!period.success) for (const issue of period.error.issues) ctx.addIssue(issue);
});
export type PanelStatisticsQuery = z.infer<typeof panelStatisticsQuerySchema>;
export const panelTicketsQuerySchema = z.object({ status: z.enum(['OPEN', 'IN_PROGRESS']), source: z.enum(['ALL', 'INTERNAL', 'CLIENT']).default('ALL'), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(100) }).strict();
export type PanelTicketsQuery = z.infer<typeof panelTicketsQuerySchema>;
export type PanelStatistics = { view: 'atendimentos'; data: TicketStatistics } | { view: 'projetos'; data: ProjectStatistics } | { view: 'operacoes'; data: OperationsStatistics } | { view: 'estoque'; data: InventoryStatistics };
export interface PanelMirrorMetadata { views: PanelId[] }
export interface PanelMirrorStatus { active: boolean; views: PanelId[]; updatedAt: string | null }
