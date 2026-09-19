import type { TicketPriority, TicketStatus, TicketSource } from "@zyllen/shared";

type TicketPerson = { name: string; email?: string | null; sector?: string | null };

export interface TicketSummary {
    id: string;
    title: string;
    description: string;
    source: TicketSource;
    status: TicketStatus;
    priority: TicketPriority;
    createdAt: string;
    updatedAt?: string;
    firstResponseAt: string | null;
    closedAt: string | null;
    slaDueAt: string | null;
    elapsedSeconds: number | null;
    resolutionNotes: string | null;
    assignedToInternalUserId: string | null;
    internalUser: TicketPerson | null;
    externalUser: (TicketPerson & {
        phone?: string | null;
        position?: string | null;
        company?: { name: string } | null;
        project?: { name: string } | null;
    }) | null;
    company: { id?: string; name: string } | null;
    assignedTo: TicketPerson | null;
}

export interface TicketDetail extends TicketSummary {
    attachments: { id: string; fileName: string; filePath: string }[];
    messages: { id: string; content: string; authorType: string; createdAt: string }[];
    rating: { rating: number; comment?: string | null; createdAt: string; evaluator?: { name: string } | null } | null;
}

export interface TicketPage {
    data: TicketSummary[];
    total: number;
    page: number;
    limit: number;
}
