"use client";
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Car } from 'lucide-react';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { VEHICLES_COPY as copy } from '@web/lib/brand-voice';
import { DashboardSummaryCard } from './dashboard-summary-card';
import { vehicleApi, isVehicleServiceUnavailable, shouldRetryVehicleQuery } from '@web/features/vehicles/api/vehicle-api';
export function DashboardVehiclesSummary() {
    const { user } = useAuth(), options = useAuthedFetch();
    const query = useQuery({ queryKey: ['vehicles', 'statistics', user?.id], queryFn: ({ signal }) => vehicleApi.statistics({ ...options, signal }), enabled: !!user, refetchInterval: 30_000, retry: shouldRetryVehicleQuery });
    const unavailable = isVehicleServiceUnavailable(query.error);
    const data = unavailable ? undefined : query.data;
    return <DashboardSummaryCard id="carros" title={copy.summary} icon={Car} href="/dashboard/carros" linkLabel={copy.open} loading={query.isLoading} failed={query.isError && !unavailable} hasData={!!data} notice={unavailable ? copy.unavailable : undefined} onRetry={() => { void query.refetch(); }}>
        {data && <div className="space-y-3"><div className="grid grid-cols-2 gap-2">{[{ id: 'available', label: copy.available, value: data.availableVehicles }, { id: 'occupied', label: copy.occupied, value: data.occupiedVehicles }].map(item => <div key={item.id} data-vehicle-metric={item.id} className="rounded-lg bg-[var(--zyllen-bg-dark)] p-3"><p data-metric-value className="text-2xl font-semibold text-white">{item.value}</p><p className="mt-1 text-xs text-[var(--zyllen-muted)]">{item.label}</p></div>)}</div>
            <p className="text-xs text-[var(--zyllen-muted)]">{copy.summaryContext}</p>
            {data.activeVehicles === 0 && <p className="text-sm text-[var(--zyllen-muted)]">{copy.emptyFleet}</p>}
            {data.current.slice(0, 3).map(item => <p key={item.id} className="break-words text-xs text-amber-200">{copy.current}: {item.vehicle.name} · {item.responsible.name}</p>)}
            {data.upcoming.length ? <div><h4 className="mb-2 text-xs text-[var(--zyllen-muted)]">{copy.upcoming}</h4><ul className="space-y-2">{data.upcoming.slice(0, 3).map(item => <li key={item.id}><Link href="/dashboard/carros" className="block rounded-lg border border-[var(--zyllen-border)] p-2 hover:border-[var(--zyllen-highlight)]/40"><span className="block break-words text-sm text-white">{item.vehicle.name} · {item.title}</span><span className="mt-1 block break-words text-xs text-[var(--zyllen-muted)]">{item.responsible.name} · {new Date(item.startDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span></Link></li>)}</ul></div> : data.activeVehicles > 0 && <p className="text-sm text-[var(--zyllen-muted)]">{copy.noUpcoming}</p>}
        </div>}
    </DashboardSummaryCard>;
}
