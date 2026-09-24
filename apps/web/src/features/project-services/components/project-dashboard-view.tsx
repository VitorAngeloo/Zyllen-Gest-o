"use client";

import type { ProjectStatistics } from '@zyllen/shared';
import { Button } from '@web/components/ui/button';
import { Skeleton } from '@web/components/ui/skeleton';
import { EmptyState, ListSectionHeader } from '@web/components/ui/workspace';
import { PROJECT_DASHBOARD_COPY as copy, PROJECT_SERVICE_COPY as serviceCopy } from '@web/lib/brand-voice';

interface Props {
    data?: ProjectStatistics;
    loading: boolean;
    failed: boolean;
    fetching: boolean;
    onRetry: () => void;
}

const metricTones: Record<string, string> = {
    active: 'border-[var(--zyllen-highlight)]/35 bg-[var(--zyllen-highlight)]/[0.08]',
    'in-progress': 'border-sky-400/25 bg-sky-400/[0.055]',
    pending: 'border-amber-400/25 bg-amber-400/[0.05]',
    scheduled: 'border-violet-400/25 bg-violet-400/[0.05]',
    completed: 'border-emerald-400/25 bg-emerald-400/[0.05]',
    cancelled: 'border-rose-400/20 bg-rose-400/[0.04]',
};

function validColor(color: string) {
    return /^#[a-fA-F0-9]{6}$/.test(color) ? color : '#ABFF10';
}

function MetricCard({ metric, featured = false }: { metric: { key: string; label: string; value: number; context: string }; featured?: boolean }) {
    return <div data-project-metric={metric.key} className={`min-w-0 rounded-md border p-4 ${metricTones[metric.key] ?? 'border-white/10 bg-white/[0.025]'} ${featured ? 'sm:row-span-2 sm:flex sm:flex-col sm:justify-between' : ''} ${metric.key === 'scheduled' ? 'xl:col-span-2' : ''}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">{metric.label}</p>
        <p data-metric-value className={`mt-2 font-mono font-semibold tabular-nums ${featured ? 'text-5xl text-[var(--zyllen-highlight)]' : 'text-3xl text-white'}`}>{metric.value}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--zyllen-muted)]">{metric.context}</p>
    </div>;
}

// Presentation only: no form, assignment, status mutation or authentication dependency.
export function ProjectDashboardView({ data, loading, failed, fetching, onRetry }: Props) {
    const currentMetrics = data ? [
        { key: 'active', label: copy.active, value: data.current.active, context: copy.activeContext },
        { key: 'in-progress', label: copy.inProgress, value: data.current.inProgress, context: copy.currentContext },
        { key: 'pending', label: copy.pending, value: data.current.pending, context: copy.pendingContext },
        { key: 'scheduled', label: copy.scheduled, value: data.current.scheduled, context: copy.currentContext },
    ] : [];
    const periodMetrics = data ? [
        { key: 'completed', label: copy.completed, value: data.completedInPeriod, context: copy.periodContext },
        { key: 'cancelled', label: copy.cancelled, value: data.cancelledInPeriod, context: copy.periodContext },
    ] : [];
    const missingDates = !!data && (data.dataQuality.completedWithoutDate > 0 || data.dataQuality.cancelledWithoutDate > 0);

    return <div className="space-y-5">
        {failed && <div role="alert" className="rounded-md border border-red-400/50 bg-red-500/10 p-4 text-sm text-red-200">
            <p>{copy.loadError}</p>{data && <p className="mt-1">{copy.stale}</p>}
            <Button type="button" variant="ghost" size="sm" className="mt-2" disabled={fetching} onClick={onRetry}>{copy.retry}</Button>
        </div>}

        {loading ? <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.55fr)]">
            <div className="rounded-lg border border-white/10 bg-black/10 p-4"><Skeleton className="h-4 w-32" /><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className={`h-28 ${index === 0 ? 'sm:row-span-2 sm:h-auto' : ''}`} />)}</div></div>
            <div className="rounded-lg border border-white/10 bg-black/10 p-4"><Skeleton className="h-4 w-36" /><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{Array.from({ length: 2 }, (_, index) => <Skeleton key={index} className="h-28" />)}</div></div>
        </div> : data && <>
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(17rem,0.55fr)]">
                <section aria-label={copy.currentTitle} className="rounded-lg border border-white/10 bg-black/10 p-4">
                    <p className="text-sm font-semibold text-white">{copy.currentTitle}</p>
                    <p className="mt-1 text-xs text-[var(--zyllen-muted)]">{copy.currentDescription}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {currentMetrics.map((metric, index) => <MetricCard key={metric.key} metric={metric} featured={index === 0} />)}
                    </div>
                </section>
                <section aria-label={copy.periodTitle} className="rounded-lg border border-white/10 bg-black/10 p-4">
                    <p className="text-sm font-semibold text-white">{copy.periodTitle}</p>
                    <p className="mt-1 text-xs text-[var(--zyllen-muted)]">{copy.periodDescription}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{periodMetrics.map(metric => <MetricCard key={metric.key} metric={metric} />)}</div>
                    <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center text-[10px] text-[var(--zyllen-muted)]">
                        <span>{copy.total}<strong className="mt-1 block font-mono text-sm tabular-nums text-white">{data.current.total}</strong></span>
                        <span>{copy.doneNow}<strong className="mt-1 block font-mono text-sm tabular-nums text-white">{data.current.done}</strong></span>
                        <span>{copy.cancelledNow}<strong className="mt-1 block font-mono text-sm tabular-nums text-white">{data.current.cancelled}</strong></span>
                    </div>
                </section>
            </div>

            {(missingDates || data.dataQuality.unclassified > 0) && <div role="status" className="rounded-md border border-amber-400/25 bg-amber-400/[0.055] px-4 py-3 text-sm text-amber-100"><p className="font-medium">{copy.qualityTitle}</p>{missingDates && <p className="mt-1 text-amber-100/75">{copy.missingDates(data.dataQuality.completedWithoutDate, data.dataQuality.cancelledWithoutDate)}</p>}{data.dataQuality.unclassified > 0 && <p className="mt-1 text-amber-100/75">{copy.unclassified(data.dataQuality.unclassified)}</p>}</div>}
            {!data.current.total && <EmptyState title={copy.empty} />}

            <section aria-label={copy.highlights} className="space-y-3">
                <ListSectionHeader title={copy.highlights} count={data.highlights.length} description={copy.highlightsContext} />
                {data.highlights.length ? <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.highlights.map(project => {
                    const color = validColor(project.color);
                    return <li key={project.id} data-project-highlight={project.id} className="relative min-w-0 overflow-hidden rounded-md border border-white/10 px-4 py-4 transition-colors hover:border-white/20" style={{ backgroundImage: `linear-gradient(135deg, ${color}1f, rgba(255,255,255,0.018) 58%)`, boxShadow: `inset 3px 0 0 ${color}` }}>
                        {project.markerName && <p data-service-marker className="mb-1 text-xs font-medium text-[var(--zyllen-highlight)] [overflow-wrap:anywhere]">{project.markerName}</p>}
                        <h3 className="font-semibold text-white [overflow-wrap:anywhere]">{project.name}</h3>
                        <p className="mt-1 text-xs text-[var(--zyllen-muted)] [overflow-wrap:anywhere]">{project.companyName} · {serviceCopy.types[project.type]}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-md bg-black/20 px-2 py-1 text-white">{serviceCopy.statuses[project.status]}</span><span className={`rounded-md px-2 py-1 ${project.urgency === 2 ? 'bg-red-500/20 text-red-100' : 'bg-black/20 text-white/70'}`}>{serviceCopy.urgencies[project.urgency]}</span>{project.relevant && <span className="rounded-md bg-[var(--zyllen-highlight)]/15 px-2 py-1 text-[var(--zyllen-highlight)]">{copy.relevant}</span>}</div>
                        <p className="mt-3 text-xs text-[var(--zyllen-muted)]">{project.startDate ? `${copy.planned}: ${new Date(project.startDate).toLocaleString('pt-BR')}` : copy.noDate}</p>
                    </li>;
                })}</ul> : <EmptyState title={copy.noActive} />}
            </section>
            <p className="text-right text-xs text-[var(--zyllen-muted)]">{copy.updated(new Date(data.generatedAt).toLocaleString('pt-BR'))}</p>
        </>}
    </div>;
}
