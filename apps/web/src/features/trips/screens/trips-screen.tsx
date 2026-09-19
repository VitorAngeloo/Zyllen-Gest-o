"use client";

import { useState } from 'react';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Select, SelectOption } from '@web/components/ui/select';
import { Skeleton } from '@web/components/ui/skeleton';
import { EmptyState, ListSectionHeader, WorkspaceBar, WorkspaceGroup } from '@web/components/ui/workspace';
import { useAuth } from '@web/features/auth/context/auth-context';
import { TRIP_COPY as copy } from '@web/lib/brand-voice';
import { MapPin } from 'lucide-react';
import { TripDialog } from '../components/trip-dialog';
import { useTrips } from '../hooks/use-trips';

export default function TripsScreen() {
    const { isLoading, hasPermission } = useAuth();
    const [page, setPage] = useState(1), [search, setSearch] = useState(''), [status, setStatus] = useState(''), [interstate, setInterstate] = useState('');
    const [dialog, setDialog] = useState<{ id?: string } | null>(null);
    const params = new URLSearchParams({ page: String(page), limit: '50', ...(search ? { search } : {}), ...(status ? { status } : {}), ...(interstate ? { interstate } : {}) });
    const { list } = useTrips(params);

    if (isLoading) return <Skeleton className="h-48" />;
    if (!hasPermission('schedule.view')) return <p className="text-sm text-[var(--zyllen-muted)]">{copy.noAccess}</p>;

    const records = list.data?.data ?? [];
    const filtered = !!(search || status || interstate);

    return <div className="space-y-5">
        <ListSectionHeader
            title={copy.title}
            count={list.data?.total ?? 0}
            description={copy.description}
            actions={hasPermission('schedule.create') ? <Button onClick={() => setDialog({})}>{copy.create}</Button> : undefined}
        />

        <WorkspaceBar className="sm:block">
            <WorkspaceGroup label="Filtrar viagens">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Input aria-label={copy.search} placeholder={copy.search} maxLength={200} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
                    <Select aria-label={copy.status} value={status} onValueChange={value => { setStatus(value); setPage(1); }}>
                        <SelectOption value="">{copy.allStatuses}</SelectOption>
                        {Object.entries(copy.statuses).map(([value, label]) => <SelectOption key={value} value={value}>{label}</SelectOption>)}
                    </Select>
                    <Select aria-label={copy.routeFilter} value={interstate} onValueChange={value => { setInterstate(value); setPage(1); }}>
                        <SelectOption value="">{copy.allRoutes}</SelectOption>
                        <SelectOption value="true">{copy.interstate}</SelectOption>
                        <SelectOption value="false">{copy.sameState}</SelectOption>
                    </Select>
                </div>
            </WorkspaceGroup>
        </WorkspaceBar>

        {list.isError && <div role="alert" className="border-l-2 border-red-400 bg-red-500/5 px-4 py-3 text-sm text-red-200"><p>{copy.loadError}</p><Button variant="ghost" disabled={list.isFetching} onClick={() => { void list.refetch(); }}>{copy.retry}</Button></div>}

        {list.isLoading ? (
            <div className="divide-y divide-white/10 border-y border-white/10">
                {Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-2 px-4 py-4"><Skeleton className="h-5 w-52" /><Skeleton className="h-3 w-full max-w-lg" /></div>)}
            </div>
        ) : list.data && (records.length ? (
            <ul className="divide-y divide-white/10 border-y border-white/10">
                {records.map(trip => (
                    <li key={trip.id} data-trip-card={trip.id} className="min-w-0 px-4 py-4 transition-colors hover:bg-white/[0.025]">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="font-semibold text-white [overflow-wrap:anywhere]">{trip.title}</h2>
                                    <span className="border-l border-white/15 pl-3 text-xs text-white">{copy.statuses[trip.status] ?? trip.status}</span>
                                </div>
                                <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--zyllen-muted)] [overflow-wrap:anywhere]"><MapPin size={12} aria-hidden="true" />{trip.originCity}/{trip.originState} → {trip.destinationCity}/{trip.destinationState}</p>
                                <div className="mt-3 grid gap-x-6 gap-y-2 text-xs text-[var(--zyllen-muted)] sm:grid-cols-3">
                                    <p><span className="block text-[10px] uppercase tracking-[0.12em] text-white/35">Rota</span>{trip.interstate ? copy.interstate : copy.sameState} · {copy.count(trip.services.length)}</p>
                                    <p className="tabular-nums"><span className="block text-[10px] uppercase tracking-[0.12em] text-white/35">{copy.departure}</span>{new Date(trip.startDate).toLocaleString('pt-BR')}</p>
                                    <p className="tabular-nums"><span className="block text-[10px] uppercase tracking-[0.12em] text-white/35">{copy.return}</span>{new Date(trip.endDate).toLocaleString('pt-BR')}</p>
                                </div>
                                <p className="mt-3 text-xs text-[var(--zyllen-muted)] [overflow-wrap:anywhere]">{[...trip.internalAssignees, ...trip.contractors].map(user => user.name).join(' · ')}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setDialog({ id: trip.id })}>{copy.view}</Button>
                        </div>
                    </li>
                ))}
            </ul>
        ) : (
            <EmptyState
                icon={<MapPin size={28} />}
                title={copy.empty}
                description={filtered ? 'Revise os filtros para consultar outras viagens.' : undefined}
                action={!filtered && hasPermission('schedule.create') ? <Button variant="outline" size="sm" onClick={() => setDialog({})}>{copy.create}</Button> : undefined}
            />
        ))}

        {list.data && list.data.total > 0 && <nav aria-label="Paginação de viagens" className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--zyllen-muted)]"><span>{copy.page(page, list.data.total)}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || list.isFetching} onClick={() => setPage(current => current - 1)}>{copy.previous}</Button><Button size="sm" variant="outline" disabled={page * 50 >= list.data.total || list.isFetching} onClick={() => setPage(current => current + 1)}>{copy.next}</Button></div></nav>}

        {dialog && <TripDialog id={dialog.id} onClose={() => setDialog(null)} />}
    </div>;
}
