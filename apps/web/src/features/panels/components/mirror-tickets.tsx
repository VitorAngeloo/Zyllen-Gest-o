"use client";

import { useCallback, useEffect, useState } from 'react';
import type { TicketSourceFilter } from '@zyllen/shared';
import type { TicketSummary } from '@web/features/tickets/types/ticket.types';
import type { TicketReadSource } from '@web/features/tickets/types/ticket-read-source';
import { useTicketDashboard } from '@web/features/tickets/hooks/use-ticket-dashboard';
import { useTicketStatistics } from '@web/features/tickets/hooks/use-ticket-statistics';
import { TicketDetailDialog } from '@web/features/tickets/components/ticket-detail-dialog';
import { formatTicketElapsed, needsTicketAttention, ticketTimes } from '@web/features/tickets/utils/ticket-time';
import { localTicketDate, ticketStatisticsPeriod, type TicketPeriodPreset } from '@web/features/tickets/utils/ticket-statistics-period';
import { Button } from '@web/components/ui/button';
import { TICKET_DASHBOARD_COPY as boardCopy, TICKET_INSIGHTS_COPY as copy } from '@web/lib/brand-voice';
import { mirrorPage, useMirrorPageSize } from './mirror-paging';
import styles from './panel-mirror.module.css';
import ticketStyles from '@web/features/tickets/components/ticket-dashboard.module.css';

function TicketCard({ ticket, now, onDetails }: { ticket: TicketSummary; now: number; onDetails: (id: string) => void }) {
    const attention = needsTicketAttention(ticket, now);
    const times = ticketTimes(ticket, now);
    const requester = ticket.source === 'INTERNAL' ? ticket.internalUser?.name : ticket.externalUser?.name;
    return <li data-ticket-id={ticket.id} data-attention={attention} className={`${styles.ticketItem} ${attention ? ticketStyles.attention : ''}`}><button type="button" aria-label={`Ver detalhes: ${ticket.title || 'Sem título'}`} onClick={() => onDetails(ticket.id)} className={styles.ticketButton}>
        <span className={styles.ticketTitle}>{ticket.title || 'Sem título'}</span>
        <span className={styles.ticketMeta}>{requester || boardCopy.requesterUnavailable} · {ticket.assignedTo?.name || 'Aguardando técnico'}</span>
        <span className={styles.ticketAge}>Aberto há {formatTicketElapsed(times.total)}{attention && <strong> · {boardCopy.attentionLabel}</strong>}</span>
    </button></li>;
}

function TicketList({ title, tickets, slide, size, now, loading, failed, onRetry, onDetails, column }: { title: string; tickets?: TicketSummary[]; slide: number; size: number; now: number; loading: boolean; failed: boolean; onRetry: () => void; onDetails: (id: string) => void; column: string }) {
    const page = mirrorPage(tickets ?? [], slide, size);
    return <section className={styles.panel} data-mirror-panel aria-label={title}><div className={styles.panelHead}><h3 className={styles.panelTitle}>{title}</h3><span className={styles.count}>{tickets?.length ?? '—'}</span></div>
        {failed && <div role="alert" className={styles.inlineError}><span>Falha ao atualizar a lista.</span><Button type="button" size="sm" variant="ghost" onClick={onRetry}>{copy.retry}</Button></div>}
        <div className={styles.panelContent}>{loading && !tickets ? <p role="status" className={styles.empty}>Carregando chamados…</p> : page.items.length ? <ul className={styles.ticketList} data-ticket-column={column}>{page.items.map(ticket => <TicketCard key={ticket.id} ticket={ticket} now={now} onDetails={onDetails} />)}</ul> : !failed && <p className={styles.empty}>Nenhum chamado nesta situação.</p>}</div>
        {page.total > 1 && <p className={styles.pageMarker}>{page.start}–{page.end} de {tickets?.length} · troca automática</p>}
    </section>;
}

export function MirrorTickets({ reader, slide, onDetailsOpenChange }: { reader: TicketReadSource; slide: number; onDetailsOpenChange: (open: boolean) => void }) {
    const [source, setSource] = useState<TicketSourceFilter>('ALL');
    const [preset, setPreset] = useState<TicketPeriodPreset>('30_DAYS');
    const [from, setFrom] = useState(() => localTicketDate(Date.now()));
    const [to, setTo] = useState(() => localTicketDate(Date.now()));
    const { now, selectedId, setSelectedId, open, inProgress, detail } = useTicketDashboard(true, source, reader);
    const period = ticketStatisticsPeriod(preset, localTicketDate(now), from, to);
    const stats = useTicketStatistics(source, period, reader);
    const size = useMirrorPageSize();
    const sectors = mirrorPage(stats.data?.sectors ?? [], slide, size + 2);
    const closeDetails = useCallback(() => setSelectedId(null), [setSelectedId]);
    useEffect(() => { onDetailsOpenChange(selectedId !== null); return () => onDetailsOpenChange(false); }, [selectedId, onDetailsOpenChange]);
    const data = stats.data;
    const metrics = data ? [
        { key: 'opened', label: copy.opened, value: data.openedInPeriod, tone: 'green' },
        { key: 'closed', label: copy.closed, value: data.closedInPeriod, tone: 'mint' },
        { key: 'pending', label: copy.pending, value: data.current.pending, tone: 'amber' },
        { key: 'in-progress', label: copy.inProgress, value: data.current.inProgress, tone: 'blue' },
        { key: 'wait', label: copy.wait, value: data.current.averagePendingSeconds === null ? '—' : formatTicketElapsed(data.current.averagePendingSeconds * 1000), tone: 'muted' },
        { key: 'attention', label: copy.attention, value: data.current.needingAttention, tone: data.current.needingAttention ? 'red' : 'muted' },
    ] : [];
    return <div className={styles.viewState}>
        {stats.isError && <div role="alert" className={styles.error}><span>{data ? 'Indicadores desatualizados.' : copy.loadError}</span><Button type="button" size="sm" variant="outline" onClick={() => { void stats.refetch(); }}>{copy.retry}</Button></div>}
        <div className={styles.view}>
            {data ? <div className={styles.metricsSix}>{metrics.map(metric => <div key={metric.key} className={styles.metric} data-tone={metric.tone} data-ticket-metric={metric.key}><span className={styles.metricLabel}>{metric.label}</span><strong className={styles.metricValue} data-metric-value>{metric.value}</strong></div>)}</div> : stats.isLoading ? <div role="status" className={styles.loading}>Carregando indicadores…</div> : null}
            <div className={styles.contextBar}><span>{data ? `${new Date(data.period.start).toLocaleDateString('pt-BR')} a ${new Date(Date.parse(data.period.end) - 1).toLocaleDateString('pt-BR')} · situação atual nas filas` : 'Atendimentos · período selecionado'}</span>{data && <span>Esperando resposta: <strong>{data.current.waitingClient}</strong> · resolvidos: <strong>{data.current.resolved}</strong></span>}{!period && <span role="alert" className={styles.warning}>{copy.invalidPeriod}</span>}<div className={styles.filters}><label><span>Origem</span><select aria-label={copy.source} value={source} onChange={event => setSource(event.target.value as TicketSourceFilter)}>{Object.entries(copy.sources).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Período</span><select aria-label={copy.period} value={preset} onChange={event => setPreset(event.target.value as TicketPeriodPreset)}>{Object.entries(copy.presets).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{preset === 'CUSTOM' && <><label><span>De</span><input type="date" aria-label={copy.from} value={from} onChange={event => setFrom(event.target.value)} /></label><label><span>Até</span><input type="date" aria-label={copy.to} value={to} onChange={event => setTo(event.target.value)} /></label></>}</div>{data && <span className={styles.updated}>{copy.updated(new Date(data.generatedAt).toLocaleTimeString('pt-BR'))}</span>}</div>
            <div className={styles.ticketGrid}>
                <TicketList title="Chamados em aberto" column="open" tickets={open.data} slide={slide} size={size} now={now} loading={open.isLoading} failed={open.isError} onRetry={() => { void open.refetch(); }} onDetails={setSelectedId} />
                <TicketList title="Em atendimento" column="in-progress" tickets={inProgress.data} slide={slide} size={size} now={now} loading={inProgress.isLoading} failed={inProgress.isError} onRetry={() => { void inProgress.refetch(); }} onDetails={setSelectedId} />
                <section className={styles.panel} data-mirror-panel aria-label={copy.sectors}><div className={styles.panelHead}><h3 className={styles.panelTitle}>{copy.sectors}</h3><span className={styles.count}>{data?.sectors.length ?? '—'}</span></div><div className={styles.panelContent}>{sectors.items.length ? <ul className={styles.sectorList}>{sectors.items.map(sector => <li key={`${sector.source}:${sector.name}`}><span>{sector.name}{sector.source === 'INTERNAL' ? ' · Internos' : ''}</span><strong>{sector.openedInPeriod}</strong></li>)}</ul> : <p className={styles.empty}>{data ? copy.emptySectors : 'Aguardando indicadores…'}</p>}</div>{sectors.total > 1 && <p className={styles.pageMarker}>Página {sectors.page} de {sectors.total} · troca automática</p>}</section>
            </div>
        </div>
        <TicketDetailDialog open={selectedId !== null} ticket={detail.data} loading={detail.isLoading} error={detail.isError} now={now} onClose={closeDetails} onRetry={() => { void detail.refetch(); }} />
    </div>;
}
