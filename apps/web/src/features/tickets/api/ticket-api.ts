import type { TicketStatus, TicketSourceFilter, TicketStatistics, TicketStatisticsQuery } from "@zyllen/shared";
import { apiClient, type RequestOptions } from "@web/lib/api-client";
import type { TicketDetail, TicketPage, TicketSummary } from "../types/ticket.types";

export const ticketApi = {
    async listForClientAttention(options: RequestOptions): Promise<TicketSummary[]> {
        const rows = new Map<string, TicketSummary>();
        for (let page = 1; ; page++) {
            const result = await apiClient.get<TicketPage>(`/tickets?limit=100&page=${page}`, options);
            for (const row of result.data) rows.set(row.id, row);
            if (page * (result.limit ?? 100) >= (result.total ?? result.data.length)) return [...rows.values()];
            if (!result.data.length) throw new Error('Não foi possível carregar todos os chamados para o monitor. Tente novamente.');
        }
    },
    async listActive(status: TicketStatus, options: RequestOptions, assignedToId?: string, source: TicketSourceFilter = "ALL"): Promise<TicketSummary[]> {
        const tickets = new Map<string, TicketSummary>();
        for (let page = 1; ; page++) {
            const params = new URLSearchParams({ status, source, page: String(page), limit: "100" });
            if (assignedToId) params.set("assignedToId", assignedToId);
            const result = await apiClient.get<TicketPage>(`/tickets?${params}`, options);
            for (const ticket of result.data) tickets.set(ticket.id, ticket);
            if (!result.data.length || page * result.limit >= result.total) break;
        }
        return [...tickets.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    },
    async statistics(query: TicketStatisticsQuery, options: RequestOptions): Promise<TicketStatistics> {
        const params = new URLSearchParams(query);
        const result = await apiClient.get<{ data: TicketStatistics }>(`/tickets/statistics?${params}`, options);
        return result.data;
    },
    async detail(id: string, options: RequestOptions): Promise<TicketDetail> {
        const result = await apiClient.get<{ data: TicketDetail }>(`/tickets/${encodeURIComponent(id)}`, options);
        return result.data;
    },
};
