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

// Presentation only: no form, assignment, status mutation or authentication dependency.
export function ProjectDashboardView({ data, loading, failed, fetching, onRetry }: Props) {
    const metrics = data ? [
        { key: 'active', label: copy.active, value: data.current.active, context: copy.activeContext },
        { key: 'in-progress', label: copy.inProgress, value: data.current.inProgress, context: copy.currentContext },
        { key: 'pending', label: copy.pending, value: data.current.pending, context: copy.pendingContext },
        { key: 'scheduled', label: copy.scheduled, value: data.current.scheduled, context: copy.currentContext },
        { key: 'completed', label: copy.completed, value: data.completedInPeriod, context: copy.periodContext },
        { key: 'cancelled', label: copy.cancelled, value: data.cancelledInPeriod, context: copy.periodContext },
    ] : [];
    const missingDates = !!data && (data.dataQuality.completedWithoutDate > 0 || data.dataQuality.cancelledWithoutDate > 0);
    return <div className="space-y-5">
        {failed && <div role="alert" className="rounded-xl border border-red-400/50 bg-red-500/10 p-4 text-sm text-red-200">
            <p>{copy.loadError}</p>{data && <p className="mt-1">{copy.stale}</p>}
            <Button type="button" variant="ghost" size="sm" className="mt-2" disabled={fetching} onClick={onRetry}>{copy.retry}</Button>
        </div>}
        {loading ? <div className="grid border-y border-white/10 sm:grid-cols-3 xl:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div key={index} className="border-b border-white/10 p-4 sm:border-b-0 sm:border-r"><Skeleton className="h-3 w-20" /><Skeleton className="mt-3 h-8 w-12" /><Skeleton className="mt-2 h-3 w-24" /></div>)}</div> : data && <>
            <div aria-label={copy.title} className="grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0 xl:grid-cols-6">{metrics.map(metric => <div key={metric.key} data-project-metric={metric.key} className={`min-w-0 px-4 py-5 ${metric.key === 'active' ? 'bg-[var(--zyllen-highlight)]/[0.035]' : ''}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">{metric.label}</p><p data-metric-value className={`mt-2 font-mono text-3xl font-semibold tabular-nums ${metric.key === 'active' ? 'text-[var(--zyllen-highlight)]' : 'text-white'}`}>{metric.value}</p><p className="mt-1 text-[10px] text-[var(--zyllen-muted)]">{metric.context}</p>
            </div>)}</div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-y border-white/10 px-4 py-3 text-xs text-[var(--zyllen-muted)]"><span>{copy.total}: <strong className="font-mono tabular-nums text-white">{data.current.total}</strong></span><span>{copy.doneNow}: <strong className="font-mono tabular-nums text-white">{data.current.done}</strong></span><span>{copy.cancelledNow}: <strong className="font-mono tabular-nums text-white">{data.current.cancelled}</strong></span></div>
            {(missingDates || data.dataQuality.unclassified > 0) && <div role="status" className="border-l-2 border-amber-400 bg-amber-400/5 px-4 py-3 text-sm text-amber-200"><p className="font-medium">{copy.qualityTitle}</p>{missingDates && <p className="mt-1">{copy.missingDates(data.dataQuality.completedWithoutDate, data.dataQuality.cancelledWithoutDate)}</p>}{data.dataQuality.unclassified > 0 && <p className="mt-1">{copy.unclassified(data.dataQuality.unclassified)}</p>}</div>}
            {!data.current.total && <EmptyState title={copy.empty} />}
            <section aria-label={copy.highlights} className="space-y-3"><ListSectionHeader title={copy.highlights} count={data.highlights.length} description={copy.highlightsContext} />
                {data.highlights.length ? <ul className="divide-y divide-white/10 border-y border-white/10">{data.highlights.map(project => <li key={project.id} data-project-highlight={project.id} className="relative min-w-0 px-4 py-4 transition-colors hover:bg-white/[0.025] before:absolute before:inset-y-3 before:left-0 before:w-0.5" style={{ borderLeftColor: /^#[a-fA-F0-9]{6}$/.test(project.color) ? project.color : '#ABFF10', boxShadow: `inset 2px 0 0 ${/^#[a-fA-F0-9]{6}$/.test(project.color) ? project.color : '#ABFF10'}` }}>
                    {project.markerName && <p data-service-marker className="mb-1 text-xs font-medium text-[var(--zyllen-highlight)] [overflow-wrap:anywhere]">{project.markerName}</p>}
                    <h3 className="font-semibold text-white [overflow-wrap:anywhere]">{project.name}</h3><p className="mt-1 text-xs text-[var(--zyllen-muted)] [overflow-wrap:anywhere]">{project.companyName} · {serviceCopy.types[project.type]}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-md bg-white/5 px-2 py-1 text-white">{serviceCopy.statuses[project.status]}</span><span className={`rounded-md px-2 py-1 ${project.urgency === 2 ? 'bg-red-500/15 text-red-200' : 'bg-white/5 text-[var(--zyllen-muted)]'}`}>{serviceCopy.urgencies[project.urgency]}</span>{project.relevant && <span className="rounded-md bg-[var(--zyllen-highlight)]/10 px-2 py-1 text-[var(--zyllen-highlight)]">{copy.relevant}</span>}</div>
                    <p className="mt-3 text-xs text-[var(--zyllen-muted)]">{project.startDate ? `${copy.planned}: ${new Date(project.startDate).toLocaleString('pt-BR')}` : copy.noDate}</p>
                </li>)}</ul> : <EmptyState title={copy.noActive} />}
            </section>
            <p className="text-xs text-[var(--zyllen-muted)]">{copy.updated(new Date(data.generatedAt).toLocaleString('pt-BR'))}</p>
        </>}
    </div>;
}
