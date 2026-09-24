import { z } from 'zod';
import { projectStatisticsQuerySchema } from '../project-services';
import { ticketStatisticsQuerySchema, type TicketPriority, type TicketStatistics } from '../tickets';
import type { ProjectServiceStatus, ProjectServiceType, ProjectStatistics } from '../project-services';
import type { OperationsStatistics } from '../trips';
import type { InventoryStatistics } from '../inventory/statistics';
import type { VehicleStatistics } from '../vehicles';
export const PANEL_IDS = ['atendimentos', 'atendimentos-clientes', 'clientes-atencao', 'projetos', 'operacoes', 'estoque', 'carros'] as const;
export type PanelId = typeof PANEL_IDS[number];
export const PANEL_PERMISSION_OPTIONS: Record<PanelId, readonly string[]> = {
    atendimentos: ['tickets.view'],
    'atendimentos-clientes': ['tickets.view'],
    'clientes-atencao': ['tickets.view'],
    projetos: ['schedule.view'],
    operacoes: ['schedule.view'],
    estoque: ['inventory.view'],
    carros: ['vehicles.view', 'schedule.view'],
};
export const PANEL_PERMISSIONS: Record<PanelId, string> = Object.fromEntries(PANEL_IDS.map(id => [id, PANEL_PERMISSION_OPTIONS[id][0]])) as Record<PanelId, string>;
export const PANEL_ROTATION_MS = 60_000;
export const panelMirrorInputSchema = z.object({ views: z.array(z.enum(PANEL_IDS)).min(1).max(PANEL_IDS.length).refine(views => new Set(views).size === views.length, 'Selecione cada visão uma vez') }).strict();
export type PanelMirrorInput = z.infer<typeof panelMirrorInputSchema>;
export const panelAttentionClientsInputSchema = z.object({ companyIds: z.array(z.string().uuid()).max(12, 'Selecione no máximo 12 clientes de atenção').refine(ids => new Set(ids).size === ids.length, 'Selecione cada cliente uma vez') }).strict();
export type PanelAttentionClientsInput = z.infer<typeof panelAttentionClientsInputSchema>;
export const panelAttentionClientsQuerySchema = z.object({ q: z.string().trim().max(80).default('') }).strict();
export type PanelAttentionClientsQuery = z.infer<typeof panelAttentionClientsQuerySchema>;
export const panelStatisticsQuerySchema = z.object({ view: z.enum(PANEL_IDS), start: z.string().optional(), end: z.string().optional(), source: z.enum(['ALL', 'INTERNAL', 'CLIENT']).default('ALL') }).strict().superRefine((value, ctx) => {
    if (value.view === 'clientes-atencao' || value.view === 'carros') return;
    if (value.view === 'estoque') {
        if (value.start || value.end) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['start'], message: 'Estoque usa uma janela fixa de 30 dias' });
        return;
    }
    const period = value.view === 'atendimentos' || value.view === 'atendimentos-clientes'
        ? ticketStatisticsQuerySchema.safeParse({ start: value.start, end: value.end, source: value.source })
        : projectStatisticsQuerySchema.safeParse({ start: value.start, end: value.end });
    if (!period.success) for (const issue of period.error.issues) ctx.addIssue(issue);
});
export type PanelStatisticsQuery = z.infer<typeof panelStatisticsQuerySchema>;
export const panelTicketsQuerySchema = z.object({ status: z.enum(['OPEN', 'IN_PROGRESS']), source: z.enum(['ALL', 'INTERNAL', 'CLIENT']).default('ALL'), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(100) }).strict();
export type PanelTicketsQuery = z.infer<typeof panelTicketsQuerySchema>;
export type PanelStatistics = { view: 'atendimentos' | 'atendimentos-clientes'; data: TicketStatistics } | { view: 'projetos'; data: ProjectStatistics } | { view: 'operacoes'; data: OperationsStatistics } | { view: 'estoque'; data: InventoryStatistics };
export interface PanelMirrorMetadata { views: PanelId[] }
export interface PanelMirrorStatus { active: boolean; views: PanelId[]; updatedAt: string | null }
export interface PanelAttentionClient { id: string; name: string; contactName: string | null; contactPhone: string | null }
export interface PanelAttentionClientsData { selected: PanelAttentionClient[]; options: PanelAttentionClient[] }
export interface PanelVehiclesData extends VehicleStatistics {}

export interface InternalDashboardTicket {
    id: string;
    title: string;
    description: string;
    priority: TicketPriority;
    status: 'OPEN' | 'IN_PROGRESS';
    createdAt: string;
    firstResponseAt: string | null;
    assignedTo: { name: string } | null;
}

export interface InternalDashboardProject {
    name: string;
    companyName: string;
    type: ProjectServiceType;
    status: ProjectServiceStatus;
    startDate: string | null;
    endDate: string | null;
}

export interface InternalDashboardVehicleReservation {
    id: string;
    title: string;
    vehicleName: string;
    responsibleName: string;
    startDate: string;
    endDate: string;
}

export interface InternalDashboardData {
    generatedAt: string;
    tickets: {
        open: { total: number; items: InternalDashboardTicket[] };
        inProgress: { total: number; items: InternalDashboardTicket[] };
    };
    projects: {
        current: ProjectStatistics['current'];
        highlights: InternalDashboardProject[];
    };
    vehicles: {
        active: number;
        available: number;
        occupied: number;
        current: InternalDashboardVehicleReservation[];
        upcoming: InternalDashboardVehicleReservation[];
    };
}
