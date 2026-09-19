"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { TicketStatus } from "@zyllen/shared";
import { AlertCircle, FileText, MessageSquare, Timer } from "lucide-react";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@web/components/ui/dialog";
import { Skeleton } from "@web/components/ui/skeleton";
import { TICKET_DASHBOARD_COPY } from "@web/lib/brand-voice";
import type { TicketDetail } from "../types/ticket.types";
import { formatTicketDate, formatTicketElapsed, needsTicketAttention, ticketTimes } from "../utils/ticket-time";
import { TicketPriorityBadge } from "./ticket-dashboard-card";
import styles from "./ticket-dashboard.module.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const STATUS_LABELS = {
    [TicketStatus.OPEN]: "Aberto", [TicketStatus.IN_PROGRESS]: "Em atendimento",
    [TicketStatus.WAITING_CLIENT]: "Aguardando cliente", [TicketStatus.RESOLVED]: "Resolvido", [TicketStatus.CLOSED]: "Encerrado",
};

interface Props {
    open: boolean;
    ticket?: TicketDetail;
    loading: boolean;
    error: boolean;
    now: number;
    onClose: () => void;
    onRetry: () => void;
}

export function TicketDetailDialog({ open, ticket, loading, error, now, onClose, onRetry }: Props) {
    const id = useId();
    const content = useRef<HTMLDivElement>(null);
    const attention = ticket ? needsTicketAttention(ticket, now) : false;
    const times = ticket ? ticketTimes(ticket, now) : null;

    useEffect(() => {
        if (!open) return;
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        content.current?.focus();
        return () => { if (previous?.isConnected) previous.focus(); };
    }, [open]);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
        if (event.key !== "Tab") return;
        const buttons = content.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]');
        if (!buttons?.length) { event.preventDefault(); return; }
        const first = buttons[0]; const last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === content.current)) {
            event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === content.current)) {
            event.preventDefault(); first.focus();
        }
    };

    return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
        <DialogContent ref={content} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onKeyDown={handleKeyDown} onClose={onClose} className={`max-w-3xl outline-none ${attention ? "border-red-400/70" : "border-[var(--zyllen-border)]"}`}>
            <DialogHeader className="pr-12">
                <DialogTitle id={`${id}-title`}>Detalhes do chamado</DialogTitle>
                <DialogDescription id={`${id}-description`}>{TICKET_DASHBOARD_COPY.detailDescription}</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-5">
                {error && <div role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
                    <p>{TICKET_DASHBOARD_COPY.detailError}</p>
                    <Button type="button" size="sm" variant="ghost" className="mt-2 text-white" onClick={onRetry}>Tentar novamente</Button>
                </div>}
                {loading ? <div aria-label="Carregando detalhes" className="space-y-3"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-24 w-full" /><Skeleton className="h-20 w-full" /></div> : ticket && times ? <>
                    {attention && <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm text-red-200 ${styles.attention}`}>
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <div><p className="font-semibold">{TICKET_DASHBOARD_COPY.attentionLabel}</p><p className="mt-1 text-xs">{TICKET_DASHBOARD_COPY.attentionDescription}</p></div>
                    </div>}
                    <section className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{STATUS_LABELS[ticket.status] ?? ticket.status}</Badge>
                            <Badge variant="outline">{ticket.source === "INTERNAL" ? "Chamado interno" : "Chamado de cliente"}</Badge>
                            <TicketPriorityBadge priority={ticket.priority} />
                        </div>
                        <h3 className="break-words text-xl font-semibold text-white">{ticket.title || "Sem título"}</h3>
                        <div><h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--zyllen-muted)]">Descrição do pedido</h4><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white">{ticket.description || "Sem descrição informada."}</p></div>
                    </section>
                    <dl className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] p-4 text-sm sm:grid-cols-2">
                        <Info label="Solicitante" value={ticket.source === "INTERNAL" ? ticket.internalUser?.name : ticket.externalUser?.name} />
                        {ticket.source === "INTERNAL" ? <Info label="Setor" value={ticket.internalUser?.sector} /> : <>
                            <Info label="Empresa" value={ticket.externalUser?.company?.name || ticket.company?.name} />
                            <Info label="Projeto" value={ticket.externalUser?.project?.name} />
                            <Info label="Telefone" value={ticket.externalUser?.phone} />
                            <Info label="Cargo" value={ticket.externalUser?.position} />
                            <Info label="E-mail" value={ticket.externalUser?.email} />
                        </>}
                        <Info label="Técnico responsável" value={ticket.assignedTo?.name || "Aguardando atribuição"} />
                        {ticket.assignedTo?.sector && <Info label="Setor do técnico" value={ticket.assignedTo.sector} />}
                        <Info label="Abertura" value={formatTicketDate(ticket.createdAt)} />
                        <Info label="Início do atendimento" value={formatTicketDate(ticket.firstResponseAt)} />
                        <Info label="Prazo de SLA" value={formatTicketDate(ticket.slaDueAt)} />
                        {ticket.closedAt && <Info label="Encerramento" value={formatTicketDate(ticket.closedAt)} />}
                    </dl>
                    <section aria-label="Tempos do chamado" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Time label={ticket.closedAt ? "Tempo total" : "Aberto há"} value={formatTicketElapsed(times.total)} attention={attention} />
                        <Time label={ticket.firstResponseAt ? "Espera até o atendimento" : "Aguardando atendimento há"} value={formatTicketElapsed(times.waiting)} />
                        <Time label="Tempo de atendimento" value={times.service === null ? "Não iniciado" : formatTicketElapsed(times.service)} />
                    </section>
                    <section><h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white"><FileText size={16} />Anexos ({ticket.attachments?.length ?? 0})</h4>
                        {ticket.attachments?.length ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{ticket.attachments.map(attachment => <a key={attachment.id} href={`${API_BASE}${attachment.filePath}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-[var(--zyllen-border)] p-3 text-sm text-[var(--zyllen-highlight)] hover:bg-white/5">
                            <FileText size={16} className="shrink-0" /><span className="break-all">{attachment.fileName}<span className="block text-xs text-[var(--zyllen-muted)]">Abrir anexo em outra aba</span></span>
                        </a>)}</div> : <p className="text-sm text-[var(--zyllen-muted)]">Nenhum anexo neste chamado.</p>}
                    </section>
                    <section><h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-white"><MessageSquare size={16} />Mensagens ({ticket.messages?.length ?? 0})</h4>
                        {ticket.messages?.length ? <div className="space-y-2">{ticket.messages.map(message => <div key={message.id} className="rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] p-3">
                            <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs text-[var(--zyllen-muted)]"><span>{message.authorType === "external" ? (ticket.source === "INTERNAL" ? "Colaborador" : "Cliente") : "Atendente"}</span><span>{formatTicketDate(message.createdAt)}</span></div>
                            <p className="whitespace-pre-wrap break-words text-sm text-white">{message.content}</p>
                        </div>)}</div> : <p className="text-sm text-[var(--zyllen-muted)]">Nenhuma mensagem neste chamado.</p>}
                    </section>
                    {ticket.resolutionNotes && <section className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-3"><h4 className="mb-2 text-sm font-semibold text-emerald-300">Descrição do atendimento</h4><p className="whitespace-pre-wrap break-words text-sm text-white">{ticket.resolutionNotes}</p></section>}
                    {ticket.rating && <section className="rounded-lg border border-amber-400/30 p-3 text-sm"><h4 className="font-semibold text-amber-300">Avaliação do atendimento: {ticket.rating.rating}/5</h4>{ticket.rating.comment && <p className="mt-2 whitespace-pre-wrap break-words text-white">{ticket.rating.comment}</p>}<p className="mt-2 text-xs text-[var(--zyllen-muted)]">{ticket.rating.evaluator?.name} · {formatTicketDate(ticket.rating.createdAt)}</p></section>}
                </> : null}
            </DialogBody>
            <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Fechar detalhes</Button></DialogFooter>
        </DialogContent>
    </Dialog>;
}

function Info({ label, value }: { label: string; value?: string | null }) {
    return <div><dt className="text-xs text-[var(--zyllen-muted)]">{label}</dt><dd className="mt-1 break-words text-white">{value || "—"}</dd></div>;
}

function Time({ label, value, attention = false }: { label: string; value: string; attention?: boolean }) {
    return <div className={`rounded-lg border p-3 ${attention ? "border-red-400/50 bg-red-500/10" : "border-[var(--zyllen-border)]"}`}><p className="text-xs text-[var(--zyllen-muted)]">{label}</p><p className={`mt-2 flex items-center gap-1 font-mono text-sm tabular-nums ${attention ? "text-red-300" : "text-white"}`}><Timer size={14} />{value}</p></div>;
}
