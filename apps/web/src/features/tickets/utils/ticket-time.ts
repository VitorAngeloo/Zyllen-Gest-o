import { TicketStatus } from "@zyllen/shared";
import type { TicketSummary } from "../types/ticket.types";

export const TICKET_ATTENTION_AFTER_MS = 60 * 60 * 1000;

export function elapsedSince(since: string | null | undefined, until: number): number {
    if (!since) return 0;
    const startedAt = Date.parse(since);
    return Number.isFinite(startedAt) ? Math.max(0, until - startedAt) : 0;
}

export function formatTicketElapsed(ms: number): string {
    const seconds = Math.floor(Math.max(0, ms) / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min ${String(s).padStart(2, "0")}s`;
    if (m > 0) return `${m}min ${String(s).padStart(2, "0")}s`;
    return `${s}s`;
}

export function needsTicketAttention(ticket: TicketSummary, now: number): boolean {
    return !ticket.closedAt &&
        (ticket.status === TicketStatus.OPEN || ticket.status === TicketStatus.IN_PROGRESS) &&
        elapsedSince(ticket.createdAt, now) >= TICKET_ATTENTION_AFTER_MS;
}

export function ticketTimes(ticket: TicketSummary, now: number) {
    const end = ticket.closedAt ? Date.parse(ticket.closedAt) : now;
    return {
        total: elapsedSince(ticket.createdAt, end),
        waiting: elapsedSince(ticket.createdAt, ticket.firstResponseAt ? Date.parse(ticket.firstResponseAt) : end),
        service: ticket.elapsedSeconds != null && ticket.closedAt
            ? ticket.elapsedSeconds * 1000
            : ticket.firstResponseAt ? elapsedSince(ticket.firstResponseAt, end) : null,
    };
}

export function formatTicketDate(date: string | null | undefined): string {
    return date && Number.isFinite(Date.parse(date)) ? new Date(date).toLocaleString("pt-BR") : "—";
}
