import type { TicketStatus, TicketSourceFilter, TicketStatisticsQuery, TicketStatistics } from '@zyllen/shared';
import type { TicketDetail, TicketSummary } from './ticket.types';
export interface TicketReadSource {
    key: string;
    list(status: TicketStatus, source: TicketSourceFilter, signal?: AbortSignal): Promise<TicketSummary[]>;
    statistics(query: TicketStatisticsQuery, signal?: AbortSignal): Promise<TicketStatistics>;
    detail(id: string, signal?: AbortSignal): Promise<TicketDetail>;
}
