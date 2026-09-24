import type { PanelAttentionClient, PanelAttentionClientsData, PanelId, PanelMirrorMetadata, PanelMirrorStatus, PanelStatistics, PanelStatisticsQuery, PanelVehiclesData, TicketStatisticsQuery } from '@zyllen/shared';
import { apiClient, type RequestOptions } from '@web/lib/api-client';
import { MONITORING_PANEL_COPY as copy } from '@web/lib/brand-voice';
import type { TicketReadSource } from '@web/features/tickets/types/ticket-read-source';
import type { TicketDetail, TicketPage } from '@web/features/tickets/types/ticket.types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
async function publicGet<T>(path: string, signal?: AbortSignal): Promise<T> {
    let response: Response;
    try { response = await fetch(`${API_BASE}${path}`, { signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' }); }
    catch (error) { if (error instanceof Error && error.name === 'AbortError') throw error; throw new Error('Não foi possível conectar ao painel. Tente novamente.'); }
    let body: unknown;
    try { body = await response.json(); } catch { throw new Error(copy.failure); }
    if (!response.ok) throw new Error(response.status === 404 || response.status === 403 ? 'Este espelho não está disponível. Solicite um novo link.' : 'Não foi possível atualizar o painel. Tente novamente.');
    return body as T;
}
function params(query: PanelStatisticsQuery) { return new URLSearchParams(Object.entries(query).filter(([, value]) => value !== undefined) as [string, string][]).toString(); }
export interface PanelReader {
    key: string;
    tickets?: TicketReadSource;
    statistics(query: PanelStatisticsQuery, signal?: AbortSignal): Promise<PanelStatistics>;
    attentionClients?(signal?: AbortSignal): Promise<PanelAttentionClient[]>;
    vehicles?(signal?: AbortSignal): Promise<PanelVehiclesData>;
}
export interface PanelCompanyOption { id: string; name: string; cnpj?: string | null }
export const panelApi = {
    async status(options: RequestOptions) { return (await apiClient.get<{ data: PanelMirrorStatus }>('/personal-panel/mirror', options)).data; },
    async generate(views: PanelId[], options: RequestOptions) { return (await apiClient.post<{ data: { path: string; views: PanelId[] } }>('/personal-panel/mirror', { views }, options)).data; },
    async updateMirror(views: PanelId[], options: RequestOptions) { return (await apiClient.put<{ data: PanelMirrorStatus }>('/personal-panel/mirror', { views }, options)).data; },
    async revoke(options: RequestOptions) { await apiClient.delete('/personal-panel/mirror', options); },
    async attentionClients(search: string, options: RequestOptions) { return (await apiClient.get<{ data: PanelAttentionClientsData }>(`/personal-panel/attention-clients?${new URLSearchParams({ q: search })}`, options)).data; },
    async updateAttentionClients(companyIds: string[], options: RequestOptions) { return (await apiClient.put<{ data: PanelAttentionClientsData }>('/personal-panel/attention-clients', { companyIds }, options)).data; },
    async companyOptions(search: string, options: RequestOptions) { return (await apiClient.get<{ data: PanelCompanyOption[] }>(`/clients/companies/search?${new URLSearchParams({ q: search })}`, options)).data; },
    async metadata(token: string, signal?: AbortSignal) { return (await publicGet<{ data: PanelMirrorMetadata }>(`/panel-mirrors/${encodeURIComponent(token)}`, signal)).data; },
    native(key: string, options: RequestOptions): PanelReader {
        return { key, async statistics(query, signal) { return (await apiClient.get<{ data: PanelStatistics }>(`/personal-panel/statistics?${params(query)}`, { ...options, signal })).data; } };
    },
    mirror(token: string): PanelReader {
        const root = `/panel-mirrors/${encodeURIComponent(token)}`, key = `panel-mirror:${token}`;
        const statistics = async (query: PanelStatisticsQuery, signal?: AbortSignal) => (await publicGet<{ data: PanelStatistics }>(`${root}/statistics?${params(query)}`, signal)).data;
        return { key, statistics,
            async attentionClients(signal) { return (await publicGet<{ data: PanelAttentionClient[] }>(`${root}/attention-clients`, signal)).data; },
            async vehicles(signal) { return (await publicGet<{ data: PanelVehiclesData }>(`${root}/vehicles`, signal)).data; },
            tickets: { key,
            async list(status, source, signal) {
                const rows = new Map<string, TicketPage['data'][number]>();
                for (let page = 1; ; page++) {
                    const data = await publicGet<TicketPage>(`${root}/tickets?${new URLSearchParams({ status, source, page: String(page), limit: '100' })}`, signal);
                    data.data.forEach(row => rows.set(row.id, row));
                    if (!data.data.length || page * data.limit >= data.total) return [...rows.values()];
                }
            },
            async detail(id, signal) { return (await publicGet<{ data: TicketDetail }>(`${root}/tickets/${encodeURIComponent(id)}`, signal)).data; },
            async statistics(query: TicketStatisticsQuery, signal) {
                const view = query.source === 'CLIENT' ? 'atendimentos-clientes' : 'atendimentos';
                const result = await statistics({ ...query, view }, signal);
                if (result.view !== view) throw new Error('Resposta de indicadores inválida');
                return result.data;
            },
        } };
    },
};
