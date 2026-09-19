"use client";

import { TicketPriority, TicketStatus } from "@zyllen/shared";
import { ArrowRightLeft, Check, ChevronRight, Timer, UserCheck } from "lucide-react";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import { TICKET_DASHBOARD_COPY } from "@web/lib/brand-voice";
import type { TicketSummary } from "../types/ticket.types";
import { formatTicketElapsed, needsTicketAttention, ticketTimes } from "../utils/ticket-time";
import styles from "./ticket-dashboard.module.css";

const PRIORITY_LABELS = {
    [TicketPriority.LOW]: "Baixa", [TicketPriority.MEDIUM]: "Média",
    [TicketPriority.HIGH]: "Alta", [TicketPriority.CRITICAL]: "Crítica",
};

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
    return <Badge variant={priority === TicketPriority.CRITICAL || priority === TicketPriority.HIGH ? "destructive" : priority === TicketPriority.LOW ? "success" : "warning"} className="shrink-0 text-[10px]">
        Prioridade {PRIORITY_LABELS[priority] ?? priority}
    </Badge>;
}

interface Props {
    ticket: TicketSummary;
    now: number;
    canReassign: boolean;
    readOnly?: boolean;
    onDetails: (id: string) => void;
    onAssign: (id: string) => void;
    onClose: (id: string) => void;
    onReassign: (id: string) => void;
}

export function TicketDashboardCard({ ticket, now, canReassign, readOnly = false, onDetails, onAssign, onClose, onReassign }: Props) {
    const attention = needsTicketAttention(ticket, now);
    const times = ticketTimes(ticket, now);
    const inProgress = ticket.status === TicketStatus.IN_PROGRESS;
    const requester = ticket.source === "INTERNAL" ? ticket.internalUser?.name || "Colaborador" : ticket.externalUser?.name || "Cliente";
    const context = ticket.source === "INTERNAL" ? ticket.internalUser?.sector || "Sem setor" : ticket.externalUser?.company?.name || ticket.company?.name || "Sem empresa";

    return <article data-ticket-id={ticket.id} data-attention={attention} className={`rounded-lg border bg-[var(--zyllen-bg-dark)] ${attention ? styles.attention : "border-white/10"}`}>
        <button type="button" onClick={() => onDetails(ticket.id)} aria-label={`Ver detalhes: ${ticket.title || "Sem título"}`} className="w-full rounded-t-lg p-4 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zyllen-highlight)]">
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">{ticket.source === "INTERNAL" ? "Interno" : "Cliente"}</Badge>
                <TicketPriorityBadge priority={ticket.priority} />
                {attention && <span className="text-xs font-semibold text-red-300">{TICKET_DASHBOARD_COPY.attentionLabel}</span>}
            </div>
            <h3 className="mt-2 break-words text-sm font-semibold text-white">{ticket.title || "Sem título"}</h3>
            <p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-white/75">{ticket.description || "Sem descrição informada."}</p>
            <div className="mt-3 space-y-1 text-xs text-[var(--zyllen-muted)]">
                <p className="break-words">Solicitante: <span className="text-white/90">{requester}</span> · {context}</p>
                <p className="break-words">Técnico: <span className={inProgress ? "text-blue-300" : "text-[var(--zyllen-muted)]"}>{ticket.assignedTo?.name || "Aguardando atribuição"}</span></p>
            </div>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-3 text-xs">
                <div><dt className="text-[var(--zyllen-muted)]">Aberto há</dt><dd className={`mt-1 flex items-center gap-1 font-mono tabular-nums ${attention ? "font-semibold text-red-300" : "text-white"}`}><Timer size={12} />{formatTicketElapsed(times.total)}</dd></div>
                {inProgress && <div><dt className="text-[var(--zyllen-muted)]">Em atendimento há</dt><dd className="mt-1 font-mono tabular-nums text-blue-300">{times.service === null ? "—" : formatTicketElapsed(times.service)}</dd></div>}
            </dl>
            <span className="mt-3 flex items-center gap-1 text-xs text-[var(--zyllen-highlight)]">{TICKET_DASHBOARD_COPY.viewDetails}<ChevronRight size={12} /></span>
        </button>
        {!readOnly && <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-3 py-2">
            {!inProgress ? <Button type="button" size="sm" variant="ghost" className="h-8 gap-1 text-xs text-[var(--zyllen-highlight)] hover:bg-[var(--zyllen-highlight)]/10" onClick={() => onAssign(ticket.id)}><UserCheck size={14} />Assumir</Button> : <>
                <Button type="button" size="sm" variant="ghost" className="h-8 gap-1 text-xs text-emerald-300 hover:bg-emerald-400/10" onClick={() => onClose(ticket.id)}><Check size={14} />Finalizar</Button>
                {canReassign && <Button type="button" size="sm" variant="ghost" className="h-8 gap-1 text-xs text-amber-300 hover:bg-amber-400/10" onClick={() => onReassign(ticket.id)}><ArrowRightLeft size={14} />Mover</Button>}
            </>}
        </div>}
    </article>;
}
