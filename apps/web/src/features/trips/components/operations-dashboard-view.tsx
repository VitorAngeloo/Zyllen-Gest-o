"use client";

import type { OperationsStatistics, OperationServiceHighlight } from '@zyllen/shared';
import { Button } from '@web/components/ui/button';
import { Skeleton } from '@web/components/ui/skeleton';
import { EmptyState, ListSectionHeader } from '@web/components/ui/workspace';
import { OPERATIONS_DASHBOARD_COPY as copy, PROJECT_SERVICE_COPY as serviceCopy, TRIP_COPY as tripCopy } from '@web/lib/brand-voice';

const metricTones: Record<string, string> = {
    'planned-trips': 'border-[var(--zyllen-highlight)]/35 bg-[var(--zyllen-highlight)]/[0.08]',
    'running-trips': 'border-sky-400/25 bg-sky-400/[0.055]',
    installations: 'border-emerald-400/25 bg-emerald-400/[0.05]',
    removals: 'border-violet-400/25 bg-violet-400/[0.05]',
    'completed-trips': 'border-cyan-400/25 bg-cyan-400/[0.05]',
    'planned-trips-in-period': 'border-amber-400/25 bg-amber-400/[0.05]',
};

function validColor(color: string) {
    return /^#[a-fA-F0-9]{6}$/.test(color) ? color : '#ABFF10';
}

function MetricCard({ metric, featured = false }: { metric: { key: string; label: string; value: number; context: string }; featured?: boolean }) {
    return <div data-operation-metric={metric.key} className={`min-w-0 rounded-xl border p-4 ${metricTones[metric.key] ?? 'border-white/10 bg-white/[0.025]'} ${featured ? 'sm:flex sm:flex-col sm:justify-between' : ''}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">{metric.label}</p>
        <p data-metric-value className={`mt-2 font-mono font-semibold tabular-nums ${featured ? 'text-5xl text-[var(--zyllen-highlight)]' : 'text-3xl text-white'}`}>{metric.value}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--zyllen-muted)]">{metric.context}</p>
    </div>;
}

function ServiceSection({ title, context, items, history = false }: { title: string; context: string; items: OperationServiceHighlight[]; history?: boolean }) {
    return <section aria-label={title} className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/10">
        <div className="p-4"><ListSectionHeader title={title} count={items.length} description={context} /></div>
        {items.length ? <ul className="divide-y divide-white/10 border-t border-white/10">{items.map(service => {
            const color = validColor(service.color);
            return <li key={service.id} data-operation-service={service.id} className="min-w-0 px-4 py-4 transition-colors hover:bg-white/[0.025]" style={{ backgroundImage: `linear-gradient(90deg, ${color}17, transparent 42%)`, boxShadow: `inset 3px 0 0 ${color}` }}>
                {service.markerName && <p className="mb-1 text-xs font-medium text-[var(--zyllen-highlight)] [overflow-wrap:anywhere]">{service.markerName}</p>}
                <h3 className="font-semibold text-white [overflow-wrap:anywhere]">{service.name}</h3>
                <p className="mt-1 text-xs text-[var(--zyllen-muted)] [overflow-wrap:anywhere]">{service.companyName} · {serviceCopy.types[service.type]}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-md bg-black/20 px-2 py-1 text-white">{serviceCopy.statuses[service.status] ?? service.status}</span>{!history && <span className={`rounded-md px-2 py-1 ${service.urgency === 2 ? 'bg-red-500/20 text-red-100' : 'bg-black/20 text-white/70'}`}>{serviceCopy.urgencies[service.urgency]}</span>}</div>
                <p className="mt-3 text-xs text-[var(--zyllen-muted)]">{history && service.completedAt ? `${copy.completed}: ${new Date(service.completedAt).toLocaleString('pt-BR')}` : service.startDate ? `${copy.planned}: ${new Date(service.startDate).toLocaleString('pt-BR')}` : copy.noDate}</p>
            </li>;
        })}</ul> : <EmptyState title={copy.empty} className="mx-4 mb-4 min-h-28" />}
    </section>;
}

function TripSection({ data }: { data: OperationsStatistics['nextInterstateTrips'] }) {
    return <section aria-label={copy.nextTrips} className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/10">
        <div className="p-4"><ListSectionHeader title={copy.nextTrips} count={data.length} description={copy.upcomingContext} /></div>
        {data.length ? <ul className="divide-y divide-white/10 border-t border-white/10">{data.map(trip => <li key={trip.id} data-operation-trip={trip.id} className="min-w-0 bg-sky-400/[0.035] px-4 py-4 transition-colors hover:bg-sky-400/[0.06]">
            <h3 className="font-semibold text-white [overflow-wrap:anywhere]">{trip.title}</h3>
            <p className="mt-1 text-xs text-[var(--zyllen-muted)] [overflow-wrap:anywhere]">{trip.originCity}/{trip.originState} → {trip.destinationCity}/{trip.destinationState}</p>
            <p className="mt-3 text-xs text-[var(--zyllen-muted)]">{tripCopy.departure}: {new Date(trip.startDate).toLocaleString('pt-BR')}<br />{tripCopy.return}: {new Date(trip.endDate).toLocaleString('pt-BR')}</p>
            <p className="mt-2 text-xs text-[var(--zyllen-muted)]">{tripCopy.count(trip.serviceCount)}</p>
        </li>)}</ul> : <EmptyState title={copy.empty} className="mx-4 mb-4 min-h-28" />}
    </section>;
}

interface Props { data?: OperationsStatistics; loading: boolean; failed: boolean; fetching: boolean; onRetry: () => void }

export function OperationsDashboardView({ data, loading, failed, fetching, onRetry }: Props) {
    const currentMetrics = data ? [
        { key: 'planned-trips', label: copy.plannedTrips, value: data.current.plannedTrips, context: copy.currentDescription },
        { key: 'running-trips', label: copy.inProgress, value: data.current.tripsInProgress, context: copy.currentTitle },
    ] : [];
    const periodMetrics = data ? [
        { key: 'installations', label: copy.installations, value: data.installationsCompleted, context: copy.actualContext },
        { key: 'removals', label: copy.removals, value: data.removalsCompleted, context: copy.actualContext },
        { key: 'completed-trips', label: copy.completedTrips, value: data.tripsCompleted, context: copy.actualContext },
        { key: 'planned-trips-in-period', label: copy.plannedTripsInPeriod, value: data.tripsPlanned, context: copy.plannedContext },
    ] : [];

    return <div className="space-y-5">
        {failed && <div role="alert" className="rounded-xl border border-red-400/50 bg-red-500/10 p-4 text-sm text-red-200"><p>{copy.loadError}</p>{data && <p className="mt-1">{copy.stale}</p>}<Button type="button" variant="ghost" size="sm" className="mt-2" disabled={fetching} onClick={onRetry}>{copy.retry}</Button></div>}

        {loading ? <div className="grid gap-4 xl:grid-cols-[minmax(17rem,0.55fr)_minmax(0,1.45fr)]">
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4"><Skeleton className="h-4 w-32" /><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{Array.from({ length: 2 }, (_, index) => <Skeleton key={index} className="h-28" />)}</div></div>
            <div className="rounded-2xl border border-white/10 bg-black/10 p-4"><Skeleton className="h-4 w-36" /><div className="mt-4 grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28" />)}</div></div>
        </div> : data && <>
            <div className="grid gap-4 xl:grid-cols-[minmax(17rem,0.55fr)_minmax(0,1.45fr)]">
                <section aria-label={copy.currentTitle} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <p className="text-sm font-semibold text-white">{copy.currentTitle}</p>
                    <p className="mt-1 text-xs text-[var(--zyllen-muted)]">{copy.currentDescription}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{currentMetrics.map((metric, index) => <MetricCard key={metric.key} metric={metric} featured={index === 0} />)}</div>
                </section>
                <section aria-label={copy.periodTitle} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <p className="text-sm font-semibold text-white">{copy.periodTitle}</p>
                    <p className="mt-1 text-xs text-[var(--zyllen-muted)]">{copy.periodDescription}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">{periodMetrics.map(metric => <MetricCard key={metric.key} metric={metric} />)}</div>
                </section>
            </div>

            {(data.dataQuality.servicesCompletedWithoutDate > 0 || data.dataQuality.tripsCompletedWithoutDate > 0 || data.dataQuality.travelWithoutBooking > 0 || data.dataQuality.unclassified > 0) && <div role="status" className="space-y-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.055] px-4 py-3 text-sm text-amber-100">{(data.dataQuality.servicesCompletedWithoutDate > 0 || data.dataQuality.tripsCompletedWithoutDate > 0) && <p>{copy.missingDates(data.dataQuality.servicesCompletedWithoutDate, data.dataQuality.tripsCompletedWithoutDate)}</p>}{data.dataQuality.travelWithoutBooking > 0 && <p>{copy.withoutBooking(data.dataQuality.travelWithoutBooking)}</p>}{data.dataQuality.unclassified > 0 && <p>{copy.unclassified(data.dataQuality.unclassified)}</p>}</div>}

            <section aria-label={copy.upcomingTitle} className="space-y-3">
                <ListSectionHeader title={copy.upcomingTitle} description={copy.upcomingDescription} />
                <div className="grid gap-4 xl:grid-cols-3"><ServiceSection title={copy.nextInstallations} context={copy.upcomingContext} items={data.nextInstallations} /><ServiceSection title={copy.relevantInstallations} context={copy.relevantContext} items={data.relevantInstallations} /><TripSection data={data.nextInterstateTrips} /></div>
            </section>
            <section aria-label={copy.historyTitle} className="space-y-3">
                <ListSectionHeader title={copy.historyTitle} description={copy.historyDescription} />
                <div className="grid gap-4 xl:grid-cols-2"><ServiceSection title={copy.latestInstallations} context={copy.latestContext} items={data.latestInstallations} history /><ServiceSection title={copy.latestRemovals} context={copy.latestContext} items={data.latestRemovals} history /></div>
            </section>
            <p className="text-right text-xs text-[var(--zyllen-muted)]">{copy.updated(new Date(data.generatedAt).toLocaleString('pt-BR'))}</p>
        </>}
    </div>;
}
