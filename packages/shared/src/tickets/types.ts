

export enum TicketStatus {
    OPEN = 'OPEN',
    IN_PROGRESS = 'IN_PROGRESS',
    WAITING_CLIENT = 'WAITING_CLIENT',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED',
}

export enum TicketPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL',
}

export type TicketSource = 'INTERNAL' | 'CLIENT';
export type TicketSourceFilter = TicketSource | 'ALL';

export interface TicketStatistics {
    generatedAt: string;
    source: TicketSourceFilter;
    scope: 'ALL' | 'OPEN_AND_ASSIGNED';
    period: { start: string; end: string };
    openedInPeriod: number;
    closedInPeriod: number;
    current: {
        pending: number;
        inProgress: number;
        waitingClient: number;
        resolved: number;
        needingAttention: number;
        averagePendingSeconds: number | null;
        oldestPendingAt: string | null;
    };
    sectors: { source: TicketSource; name: string; openedInPeriod: number }[];
}
