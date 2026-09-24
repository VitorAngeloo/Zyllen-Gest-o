"use client";

import { useState } from "react";
import type { TicketSourceFilter } from "@zyllen/shared";
import { Button } from "@web/components/ui/button";
import { Skeleton } from "@web/components/ui/skeleton";
import { TICKET_INSIGHTS_COPY as copy } from "@web/lib/brand-voice";
import { useTicketStatistics } from "../hooks/use-ticket-statistics";
import { localTicketDate, ticketStatisticsPeriod, type TicketPeriodPreset } from "../utils/ticket-statistics-period";
import { formatTicketElapsed } from "../utils/ticket-time";
import type { TicketReadSource } from '../types/ticket-read-source';

interface Props {
    source: TicketSourceFilter;
    onSourceChange?: (source: TicketSourceFilter) => void;
    now: number;
    reader?: TicketReadSource;
    compact?: boolean;
    title?: string;
    description?: string;
}

export function TicketDashboardInsights({ source, onSourceChange, now, reader, compact = false, title = copy.title, description = copy.description }: Props) {
    const today = localTicketDate(now);
    const [preset, setPreset] = useState<TicketPeriodPreset>("30_DAYS");
    const [from, setFrom] = useState(today);
    const [to, setTo] = useState(today);
    const period = ticketStatisticsPeriod(preset, today, from, to);
    const query = useTicketStatistics(source, period, reader);
    const data = query.data;
    const breakdown = copy.breakdowns[source];
    const metrics = data ? [
        { key: "opened", label: copy.opened, value: data.openedInPeriod, context: copy.periodContext },
        { key: "closed", label: copy.closed, value: data.closedInPeriod, context: copy.periodContext },
        { key: "pending", label: copy.pending, value: data.current.pending, context: copy.pendingContext },
        { key: "in-progress", label: copy.inProgress, value: data.current.inProgress, context: copy.currentContext },
        { key: "wait", label: copy.wait, value: data.current.averagePendingSeconds === null ? "—" : formatTicketElapsed(data.current.averagePendingSeconds * 1000), context: copy.waitContext },
        { key: "attention", label: copy.attention, value: data.current.needingAttention, context: copy.attentionContext },
    ] : [];
    const fieldClass = "mt-1 w-full min-w-0 rounded-md border border-white/15 bg-[var(--zyllen-bg-dark)] px-3 py-2 text-sm text-white [color-scheme:dark] focus:border-[var(--zyllen-highlight)]/60 focus:outline-none";

    return <div aria-label={title} className={`@container border-y border-white/10 bg-white/[0.018] ${compact ? 'space-y-3 px-3 py-3' : 'space-y-5 rounded-lg border-x p-4 sm:p-5'}`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div><h3 className="text-sm font-semibold text-white">{title}</h3>{!compact && <p className="mt-1 max-w-xl text-xs text-[var(--zyllen-muted)]">{description}</p>}</div>
            <div className={`grid w-full gap-3 sm:w-auto ${onSourceChange ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {onSourceChange && <label className="min-w-0 text-xs text-[var(--zyllen-muted)]">{copy.source}<select aria-label={copy.source} className={fieldClass} value={source} onChange={event => onSourceChange(event.target.value as TicketSourceFilter)}>{Object.entries(copy.sources).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
                <label className="min-w-0 text-xs text-[var(--zyllen-muted)]">{copy.period}<select aria-label={copy.period} className={fieldClass} value={preset} onChange={event => setPreset(event.target.value as TicketPeriodPreset)}>{Object.entries(copy.presets).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
        </div>
        {preset === "CUSTOM" && <div className="grid max-w-md grid-cols-2 gap-3">
            <label className="min-w-0 text-xs text-[var(--zyllen-muted)]">{copy.from}<input type="date" aria-label={copy.from} value={from} className={fieldClass} onChange={event => setFrom(event.target.value)} /></label>
            <label className="min-w-0 text-xs text-[var(--zyllen-muted)]">{copy.to}<input type="date" aria-label={copy.to} value={to} className={fieldClass} onChange={event => setTo(event.target.value)} /></label>
        </div>}
        {!period ? <p role="alert" className="text-sm text-amber-300">{copy.invalidPeriod}</p> : <>
            {!compact && <p className="text-xs text-[var(--zyllen-muted)]">{copy.range(new Date(period.start).toLocaleDateString("pt-BR"), new Date(Date.parse(period.end) - 1).toLocaleDateString("pt-BR"))}</p>}
            {query.isError && <div role="alert" className="rounded-md border border-red-400/40 p-3 text-sm text-red-200"><p>{copy.loadError}</p><Button type="button" size="sm" variant="ghost" className="mt-1" onClick={() => { void query.refetch(); }}>{copy.retry}</Button></div>}
            {query.isLoading ? <div className="grid grid-cols-2 gap-3 @md:grid-cols-3 @4xl:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-24 rounded-md" />)}</div> : data && <>
                <div className={`grid grid-cols-2 gap-x-3 @md:grid-cols-3 @4xl:grid-cols-6 ${compact ? 'gap-y-3' : 'gap-y-5'}`}>{metrics.map(metric => <div key={metric.key} data-ticket-metric={metric.key} className={`min-w-0 border-l-2 py-1 pl-3 pr-2 ${metric.key === "attention" && data.current.needingAttention ? "border-red-400 bg-red-500/[0.06]" : "border-white/15"}`}>
                    <p className="text-xs text-[var(--zyllen-muted)]">{metric.label}</p><p data-metric-value className={`${compact ? 'mt-1 text-lg' : 'mt-2 text-xl'} break-words font-semibold text-white`}>{metric.value}</p>{!compact && <p className="mt-1 text-[10px] text-[var(--zyllen-muted)]">{metric.context}</p>}
                </div>)}</div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--zyllen-muted)]"><span>{copy.waitingClient}: <strong className="text-white">{data.current.waitingClient}</strong></span><span>{copy.resolved}: <strong className="text-white">{data.current.resolved}</strong></span></div>
                <div className="border-t border-[var(--zyllen-border)] pt-3"><h3 className="text-sm font-medium text-white">{breakdown.title}</h3>{!compact && <p className="mt-1 text-xs text-[var(--zyllen-muted)]">{breakdown.context}</p>}
                    {data.sectors.length ? <ul aria-label={breakdown.title} className={`${compact ? 'mt-2 max-h-24' : 'mt-3 max-h-40'} grid grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3`}>{data.sectors.map(sector => <li key={`${sector.source}:${sector.name}`} className="flex min-w-0 items-center justify-between gap-3 rounded-md bg-white/[0.03] px-3 py-2 text-xs"><span className="break-words text-[var(--zyllen-muted)]">{sector.name}{source === "ALL" && sector.source === "INTERNAL" && <span className="ml-1 text-[10px]">· {copy.sources.INTERNAL}</span>}</span><strong className="shrink-0 text-[var(--zyllen-highlight)]">{sector.openedInPeriod}</strong></li>)}</ul> : <p className="mt-3 text-xs text-[var(--zyllen-muted)]">{copy.emptySectors}</p>}
                </div>
                <p className="text-[10px] text-[var(--zyllen-muted)]">{data.scope === "ALL" ? copy.allScope : copy.ownScope} · {copy.updated(new Date(data.generatedAt).toLocaleTimeString("pt-BR"))}</p>
            </>}
        </>}
    </div>;
}
