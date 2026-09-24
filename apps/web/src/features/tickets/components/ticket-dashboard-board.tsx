"use client";

import { useCallback, useEffect } from "react";
import type { TicketSource } from "@zyllen/shared";
import { AlertCircle, Clock, Headset } from "lucide-react";
import { useAuth } from "@web/features/auth/context/auth-context";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Skeleton } from "@web/components/ui/skeleton";
import { TICKET_DASHBOARD_COPY } from "@web/lib/brand-voice";
import { useTicketDashboard } from "../hooks/use-ticket-dashboard";
import { needsTicketAttention } from "../utils/ticket-time";
import { TicketDashboardCard } from "./ticket-dashboard-card";
import { TicketDetailDialog } from "./ticket-detail-dialog";
import { TicketDashboardInsights } from "./ticket-dashboard-insights";
import styles from "./ticket-dashboard.module.css";
import type { TicketReadSource } from '../types/ticket-read-source';

interface Props {
    isManagerOrAdmin: boolean;
    readOnly?: boolean;
    reader?: TicketReadSource;
    onDetailsOpenChange?: (open: boolean) => void;
    onAssign: (id: string) => void;
    onClose: (id: string) => void;
    onReassign: (id: string) => void;
}

export function TicketDashboardBoard({ isManagerOrAdmin, readOnly = false, reader, onDetailsOpenChange, onAssign, onClose, onReassign }: Props) {
    return <section aria-label="Chamados no dashboard" className="@container space-y-6">
        <TicketSourceSection source="INTERNAL" compact isManagerOrAdmin={isManagerOrAdmin} readOnly={readOnly} reader={reader} onDetailsOpenChange={onDetailsOpenChange} onAssign={onAssign} onClose={onClose} onReassign={onReassign} />
        <TicketSourceSection source="CLIENT" isManagerOrAdmin={isManagerOrAdmin} readOnly={readOnly} reader={reader} onDetailsOpenChange={onDetailsOpenChange} onAssign={onAssign} onClose={onClose} onReassign={onReassign} />
    </section>;
}

function TicketSourceSection({ source, compact = false, isManagerOrAdmin, readOnly = false, reader, onDetailsOpenChange, onAssign, onClose, onReassign }: Props & { source: TicketSource; compact?: boolean }) {
    const { hasPermission } = useAuth();
    const { now, selectedId, setSelectedId, open, inProgress, detail } = useTicketDashboard(isManagerOrAdmin, source, reader);
    const closeDetails = useCallback(() => setSelectedId(null), [setSelectedId]);
    useEffect(() => { onDetailsOpenChange?.(selectedId !== null); return () => onDetailsOpenChange?.(false); }, [selectedId, onDetailsOpenChange]);
    const columns = [
        { id: "open", title: "Chamados em Aberto", query: open, icon: Headset, color: "text-amber-400", empty: TICKET_DASHBOARD_COPY.emptyOpen },
        { id: "in-progress", title: "Chamados em Atendimento", query: inProgress, icon: Clock, color: "text-blue-400", empty: TICKET_DASHBOARD_COPY.emptyInProgress },
    ];
    const attentionTickets = [...(open.data ?? []), ...(inProgress.data ?? [])]
        .filter(ticket => needsTicketAttention(ticket, now))
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    const attentionCount = attentionTickets.length;

    const internal = source === 'INTERNAL';
    const sourceLabel = internal ? 'Atendimentos internos' : 'Atendimentos de clientes';
    const attentionLimit = internal ? '5 horas' : '1 hora';

    return <section data-ticket-source={source} aria-label={sourceLabel} className={`space-y-4 border-l-2 pl-3 sm:pl-4 ${internal ? 'border-white/20' : 'border-[var(--zyllen-highlight)]/70'}`}>
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--zyllen-muted)]">{internal ? 'Equipe Zyllen' : 'Suporte aos clientes'}</p><h2 className="mt-1 text-lg font-semibold text-white">{sourceLabel}</h2></div>
            <p className="max-w-sm text-xs leading-relaxed text-[var(--zyllen-muted)]">Atenção após {attentionLimit} desde a abertura · mais antigos primeiro</p>
        </header>
        <TicketDashboardInsights source={source} now={now} reader={reader} compact={compact} title={internal ? 'Indicadores da equipe' : 'Indicadores dos clientes'} description={internal ? 'Volume e andamento das solicitações da equipe.' : 'Volume e andamento das solicitações recebidas dos clientes.'} />
        {attentionCount > 0 && <div data-ticket-attention-summary data-ticket-attention-source={source} className={`flex flex-wrap items-center gap-3 rounded-md border px-3 py-3 ${styles.attention}`}>
            <AlertCircle size={20} className="shrink-0 text-red-300" />
            <div className="min-w-0 flex-1"><p role="status" aria-live="polite" aria-atomic="true" className="text-sm font-semibold text-red-200">{attentionCount === 1 ? "1 chamado precisa de atenção" : `${attentionCount} chamados precisam de atenção`}</p><p className="mt-1 text-xs text-red-100/80">Limite desta fila: {attentionLimit} desde a abertura.</p></div>
            <Button type="button" variant="ghost" size="sm" className="text-red-100 hover:bg-red-500/20" onClick={() => setSelectedId(attentionTickets[0].id)}>Ver mais antigo</Button>
            <ul aria-label={TICKET_DASHBOARD_COPY.attentionList} className="grid w-full grid-cols-1 gap-2 @2xl:grid-cols-3">{attentionTickets.slice(0, 3).map(ticket => <li key={ticket.id} className="min-w-0"><button type="button" className="w-full rounded-md bg-red-950/30 px-3 py-2 text-left text-xs text-red-100 hover:bg-red-500/20 focus-visible:outline-2 focus-visible:outline-red-200" onClick={() => setSelectedId(ticket.id)}><span className="block break-words font-medium">{ticket.title}</span><span className="mt-1 block truncate text-red-100/70">{ticket.internalUser?.name ?? ticket.externalUser?.name ?? TICKET_DASHBOARD_COPY.requesterUnavailable}</span></button></li>)}</ul>
        </div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {columns.map(column => <Card key={column.id} className="rounded-lg border-white/10 bg-white/[0.025]">
                <CardHeader className="px-4 pb-3"><CardTitle className="flex flex-wrap items-center gap-2 text-sm text-white"><column.icon size={17} className={column.color} />{column.title}<Badge variant="secondary">{column.query.data?.length ?? 0}</Badge></CardTitle><p className="text-xs text-[var(--zyllen-muted)]">Clique para abrir o pedido completo</p></CardHeader>
                <CardContent className="px-4 sm:px-5">
                    {column.query.isError && <div role="alert" className="mb-3 rounded-md border border-red-400/40 p-3 text-xs text-red-200"><p>{TICKET_DASHBOARD_COPY.loadError}</p><Button type="button" size="sm" variant="ghost" className="mt-1 text-white" onClick={() => { void column.query.refetch(); }}>Tentar novamente</Button></div>}
                    {column.query.isLoading ? <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-36 w-full rounded-md" />)}</div> : column.query.data?.length ? <div className={`${compact ? 'max-h-[360px]' : 'max-h-[520px]'} space-y-3 overflow-y-auto p-1`} data-ticket-column={column.id} data-ticket-source-column={`${source}:${column.id}`}>
                        {column.query.data.map(ticket => <TicketDashboardCard key={ticket.id} ticket={ticket} now={now} readOnly={readOnly} canReassign={isManagerOrAdmin && hasPermission("tickets.triage")} onDetails={setSelectedId} onAssign={onAssign} onClose={onClose} onReassign={onReassign} />)}
                    </div> : !column.query.isError && <p className="py-8 text-center text-sm text-[var(--zyllen-muted)]">{column.empty}</p>}
                </CardContent>
            </Card>)}
        </div>
        <TicketDetailDialog open={selectedId !== null} ticket={detail.data} loading={detail.isLoading} error={detail.isError} now={now} onClose={closeDetails} onRetry={() => { void detail.refetch(); }} />
    </section>;
}
