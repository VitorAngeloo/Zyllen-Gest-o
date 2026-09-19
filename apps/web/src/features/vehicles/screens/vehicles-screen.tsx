"use client";
import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { VehicleRecord, VehicleReservationRecord } from '@zyllen/shared';
import { toast } from 'sonner';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { Button } from '@web/components/ui/button';
import { PageHeader } from '@web/components/ui/page-header';
import { Skeleton } from '@web/components/ui/skeleton';
import { ListSectionHeader } from '@web/components/ui/workspace';
import { datePeriod, localCalendarDate } from '@web/lib/date-period';
import { localDateTime } from '@web/lib/date-time';
import { VEHICLES_COPY as copy } from '@web/lib/brand-voice';
import { vehicleApi, isVehicleServiceUnavailable, shouldRetryVehicleQuery } from '../api/vehicle-api';
import { VehicleDialog } from '../components/vehicle-dialog';
import { VehicleReservationForm } from '../components/vehicle-reservation-form';
import { VehicleReservationFilters } from '../components/vehicle-reservation-filters';
import { reservationDateIso, reservationDateText } from '../utils/vehicle-reservation-period';

export default function VehiclesScreen() {
    const { user, userType, hasPermission, isLoading } = useAuth(), options = useAuthedFetch(), client = useQueryClient();
    const enabled = !!user && userType === 'internal' && hasPermission('schedule.view');
    const [from, setFrom] = useState(() => reservationDateText(localCalendarDate(Date.now()))), [to, setTo] = useState(() => reservationDateText(localCalendarDate(Date.now() + 30 * 86400000)));
    const [vehicleId, setVehicleId] = useState(''), [responsibleId, setResponsibleId] = useState(''), [page, setPage] = useState(1);
    const [vehicleDialog, setVehicleDialog] = useState<{ editing?: VehicleRecord } | null>(null), [editing, setEditing] = useState<VehicleReservationRecord | undefined>();
    const reservationRef = useRef<HTMLDivElement>(null);
    useEffect(() => { if (editing) { reservationRef.current?.scrollIntoView({ block: 'center' }); reservationRef.current?.querySelector('h3')?.focus(); } }, [editing]);
    const fromIso = reservationDateIso(from), toIso = reservationDateIso(to);
    const period = fromIso && toIso ? datePeriod('CUSTOM', '', fromIso, toIso) : null;
    const choices = useQuery({ queryKey: ['vehicles', 'options', user?.id], queryFn: ({ signal }) => vehicleApi.options({ ...options, signal }), enabled, refetchInterval: 30_000, retry: shouldRetryVehicleQuery });
    const bookings = useQuery({ queryKey: ['vehicles', 'reservations', user?.id, period?.start, period?.end, vehicleId, responsibleId, page], queryFn: ({ signal }) => vehicleApi.reservations({ ...period!, ...(vehicleId ? { vehicleId } : {}), ...(responsibleId ? { responsibleId } : {}), page, limit: 20 }, { ...options, signal }), enabled: enabled && !!period && choices.isSuccess, refetchInterval: 30_000, retry: shouldRetryVehicleQuery });
    const unavailable = isVehicleServiceUnavailable(choices.error) || isVehicleServiceUnavailable(bookings.error);
    const invalidate = async () => { await client.invalidateQueries({ queryKey: ['vehicles'] }); };
    const onReservationSaved = async (reservation: VehicleReservationRecord) => {
        const start = localDateTime(reservation.startDate).split('T')[0], end = localDateTime(reservation.endDate).split('T')[0];
        setFrom(reservationDateText(start));
        setTo(reservationDateText(datePeriod('CUSTOM', '', start, end) ? end : start));
        setVehicleId(reservation.vehicle.id); setResponsibleId(reservation.responsible.id); setPage(1); setEditing(undefined);
        await invalidate();
    };
    const cancel = useMutation({ mutationFn: (id: string) => vehicleApi.cancelReservation(id, options), onSuccess: () => { toast.success(copy.cancelled); void invalidate(); }, onError: (error: Error) => toast.error(error.message) });
    if (isLoading) return <Skeleton className="h-48" />;
    if (!enabled) return <p className="text-sm text-[var(--zyllen-muted)]">{copy.noAccess}</p>;
    const vehicles = choices.data?.vehicles ?? [], canCreate = hasPermission('schedule.create'), canEdit = hasPermission('schedule.update') && choices.isSuccess && !unavailable, canCancel = hasPermission('schedule.delete') && choices.isSuccess && !unavailable;
    return <div className="space-y-8"><PageHeader eyebrow="Operação" title={copy.title} description={copy.description} />
        {(choices.isError || bookings.isError) && <div role={unavailable ? 'status' : 'alert'} className={`border-l-2 px-4 py-3 text-sm ${unavailable ? 'border-amber-400 bg-amber-400/5 text-amber-200' : 'border-red-400 bg-red-500/5 text-red-200'}`}><p>{unavailable ? copy.unavailable : copy.error}</p><Button size="sm" variant="ghost" onClick={() => { void choices.refetch(); if (period && choices.isSuccess) void bookings.refetch(); }}>{copy.retry}</Button></div>}
        <section aria-label={copy.fleet} className="space-y-4"><ListSectionHeader title={copy.fleet} count={vehicles.length} description="Veículos disponíveis para os compromissos da operação." actions={canCreate ? <Button size="sm" disabled={!choices.isSuccess || unavailable} onClick={() => setVehicleDialog({})}>{copy.create}</Button> : undefined} />
            {choices.isLoading ? <div className="divide-y divide-white/10 border-y border-white/10">{Array.from({ length: 3 }, (_, index) => <div key={index} className="px-4 py-4"><Skeleton className="h-5 w-48" /></div>)}</div> : vehicles.length ? <ul className="divide-y divide-white/10 border-y border-white/10">{vehicles.map(vehicle => <li key={vehicle.id} data-vehicle-id={vehicle.id} className="flex items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-white/[0.025]"><div className="min-w-0"><p className="break-words font-medium text-white">{vehicle.name}</p><p className="mt-0.5 font-mono text-xs text-[var(--zyllen-muted)]">{vehicle.plate}{!vehicle.active ? ` · ${copy.inactive}` : ''}</p></div>{canEdit && <Button size="sm" variant="ghost" aria-label={`${copy.edit} ${vehicle.name}`} onClick={() => setVehicleDialog({ editing: vehicle })}>{copy.edit}</Button>}</li>)}</ul> : choices.data && <div className="border-y border-white/10 py-8 text-sm text-[var(--zyllen-muted)]">{copy.emptyFleet}</div>}
        </section>
        <section aria-label={copy.reservations} className="space-y-4"><ListSectionHeader title={copy.reservations} count={bookings.data?.total ?? 0} description="Planeje o uso da frota e acompanhe compromissos futuros e históricos." />
            {(canCreate || editing) && user && <div ref={reservationRef}><VehicleReservationForm key={editing?.id ?? 'new'} editing={editing} vehicles={vehicles} users={choices.data?.responsibleUsers ?? []} defaultResponsibleId={user.id} disabled={!choices.isSuccess || unavailable || (editing ? !canEdit : !canCreate)} onCancelEditing={() => setEditing(undefined)} onSaved={onReservationSaved} /></div>}
            <VehicleReservationFilters from={from} to={to} vehicleId={vehicleId} responsibleId={responsibleId} vehicles={vehicles} users={choices.data?.reservationResponsibleUsers ?? choices.data?.responsibleUsers ?? []} disabled={!choices.isSuccess || unavailable} onFrom={value => { setFrom(value); setPage(1); }} onTo={value => { setTo(value); setPage(1); }} onVehicle={value => { setVehicleId(value); setPage(1); }} onResponsible={value => { setResponsibleId(value); setPage(1); }} />
            {!period && <p role="alert" className="text-sm text-amber-200">{copy.invalidPeriod}</p>}
            {period && (bookings.isLoading ? <div className="divide-y divide-white/10 border-y border-white/10">{Array.from({ length: 4 }, (_, index) => <div key={index} className="px-4 py-4"><Skeleton className="h-5 w-full max-w-md" /></div>)}</div> : bookings.data && <><p className="text-xs text-[var(--zyllen-muted)]">{copy.total(bookings.data.total)}</p>{bookings.data.data.length ? <ul className="divide-y divide-white/10 border-y border-white/10">{bookings.data.data.map(booking => {
                const finished = Date.parse(booking.endDate) <= Date.now(), status = booking.cancelledAt ? copy.cancelledStatus : finished ? copy.finished : Date.parse(booking.startDate) <= Date.now() ? copy.ongoing : copy.scheduled;
                return <li key={booking.id} data-vehicle-reservation={booking.id} className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 transition-colors hover:bg-white/[0.025]"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><p className="break-words font-medium text-white">{booking.title}</p><span className="border-l border-white/15 pl-3 text-xs text-[var(--zyllen-muted)]">{status}</span></div><p className="mt-1 break-words text-sm text-[var(--zyllen-muted)]">{booking.vehicle.name} · {booking.responsible.name}</p><p className="mt-2 font-mono text-xs tabular-nums text-[var(--zyllen-muted)]">{new Date(booking.startDate).toLocaleString('pt-BR')} — {new Date(booking.endDate).toLocaleString('pt-BR')}</p>{booking.notes && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-[var(--zyllen-muted)]">{booking.notes}</p>}</div>
                    {!booking.cancelledAt && !finished && <div className="flex flex-wrap gap-2">{canEdit && <Button size="sm" variant="outline" disabled={!choices.data} onClick={() => setEditing(booking)}>{copy.edit}</Button>}{canCancel && <Button size="sm" variant="ghost" disabled={cancel.isPending} onClick={() => { if (window.confirm(copy.confirmCancel)) cancel.mutate(booking.id); }}>{copy.cancelReservation}</Button>}</div>}
                </li>;
            })}</ul> : <div className="border-y border-white/10 py-8 text-sm text-[var(--zyllen-muted)]">{copy.emptyReservations}</div>}
            {bookings.data.total > bookings.data.limit && <nav aria-label="Paginação de reservas" className="flex items-center justify-end gap-3"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(value => value - 1)}>{copy.previous}</Button><span className="font-mono text-xs text-[var(--zyllen-muted)]">{page}</span><Button size="sm" variant="outline" disabled={page * bookings.data.limit >= bookings.data.total} onClick={() => setPage(value => value + 1)}>{copy.next}</Button></nav>}</>)}
        </section>
        {vehicleDialog && <VehicleDialog editing={vehicleDialog.editing} onClose={() => setVehicleDialog(null)} onSaved={invalidate} />}
    </div>;
}
