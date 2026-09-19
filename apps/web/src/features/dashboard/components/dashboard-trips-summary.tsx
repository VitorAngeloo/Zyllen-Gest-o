"use client";
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { DASHBOARD_OPERATIONAL_COPY as copy } from '@web/lib/brand-voice';
import { TripDialog } from '@web/features/trips/components/trip-dialog';
import { useDashboardStatistics } from '../hooks/use-dashboard-statistics';
import { DashboardSummaryCard, DashboardMetric } from './dashboard-summary-card';

export function DashboardTripsSummary() {
    const query = useDashboardStatistics('operacoes'), data = query.data?.view === 'operacoes' ? query.data.data : undefined;
    const [selected, setSelected] = useState<string | null>(null);
    return <DashboardSummaryCard id="operacoes" title={copy.trips} icon={MapPin} href="/dashboard/projetos?aba=viagens" linkLabel={copy.openTrips}
        loading={query.isLoading} failed={query.isError} hasData={!!data} onRetry={() => { void query.refetch(); }}>
        {data && <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2"><DashboardMetric domain="operation" id="planned" label={copy.plannedTrips} value={data.current.plannedTrips} />
                <DashboardMetric domain="operation" id="inProgress" label={copy.runningTrips} value={data.current.tripsInProgress} /></div>
            {data.dataQuality.travelWithoutBooking > 0 && <p className="rounded-lg border border-amber-400/25 bg-amber-500/5 p-3 text-xs text-amber-200">{copy.travelWithoutBooking}: <strong>{data.dataQuality.travelWithoutBooking}</strong></p>}
            {data.nextInterstateTrips.length > 0 ? <div><h4 className="mb-2 text-xs font-medium text-[var(--zyllen-muted)]">{copy.nextInterstateTrips}</h4><ul className="space-y-2">{data.nextInterstateTrips.slice(0, 3).map(item => <li key={item.id}><button type="button" onClick={() => setSelected(item.id)} className="w-full rounded-lg border border-[var(--zyllen-border)] p-2 text-left hover:border-[var(--zyllen-highlight)]/40">
                <span className="block break-words text-sm font-medium text-white">{item.title}</span><span className="mt-1 block break-words text-xs text-[var(--zyllen-muted)]">{item.destinationCity}/{item.destinationState} · {new Date(item.startDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </button></li>)}</ul></div> : data.current.plannedTrips === 0 && data.current.tripsInProgress === 0 && <p className="text-sm text-[var(--zyllen-muted)]">{copy.tripsEmpty}</p>}
        </div>}
        {selected && <TripDialog id={selected} onClose={() => setSelected(null)} />}
    </DashboardSummaryCard>;
}
