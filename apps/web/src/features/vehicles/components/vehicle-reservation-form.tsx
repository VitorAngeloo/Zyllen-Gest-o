"use client";
import { useId, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { vehicleReservationSchema, type VehicleRecord, type VehicleReservationRecord } from '@zyllen/shared';
import { toast } from 'sonner';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Textarea } from '@web/components/ui/textarea';
import { SearchableSelect } from '@web/components/ui/searchable-select';
import { useAuthedFetch } from '@web/features/auth/context/auth-context';
import { localCalendarDate } from '@web/lib/date-period';
import { localDateTime } from '@web/lib/date-time';
import { VEHICLES_COPY as copy } from '@web/lib/brand-voice';
import { vehicleApi } from '../api/vehicle-api';
import { reservationDateText, reservationInstant } from '../utils/vehicle-reservation-period';
import { VehicleReservationDates } from './vehicle-reservation-dates';

interface Props {
    vehicles: VehicleRecord[]; users: { id: string; name: string }[]; defaultResponsibleId: string;
    editing?: VehicleReservationRecord; disabled: boolean; onCancelEditing: () => void;
    onSaved: (reservation: VehicleReservationRecord) => Promise<void>;
}
export function VehicleReservationForm({ vehicles, users, defaultResponsibleId, editing, disabled, onCancelEditing, onSaved }: Props) {
    const options = useAuthedFetch(), prefix = useId();
    const [form, setForm] = useState(() => {
        const date = reservationDateText(localCalendarDate(Date.now()));
        const [startDate = '', startTime = ''] = localDateTime(editing?.startDate).split('T');
        const [endDate = '', endTime = ''] = localDateTime(editing?.endDate).split('T');
        return { vehicleId: editing?.vehicle.id ?? '', title: editing?.title ?? '', responsibleId: editing?.responsible.id ?? '', notes: editing?.notes ?? '', startDate: editing ? reservationDateText(startDate) : date, startTime, endDate: editing ? reservationDateText(endDate) : date, endTime };
    });
    const [error, setError] = useState('');
    const request = useRef<{ key: string; id: string } | null>(null);
    const activeVehicles = vehicles.filter(vehicle => vehicle.active || vehicle.id === editing?.vehicle.id);
    const vehicleId = form.vehicleId || (activeVehicles.length === 1 ? activeVehicles[0].id : '');
    const responsibleId = form.responsibleId || (!editing && users.some(person => person.id === defaultResponsibleId) ? defaultResponsibleId : '');
    const people = editing && !users.some(person => person.id === editing.responsible.id) ? [...users, editing.responsible] : users;
    const save = useMutation({ mutationFn: async () => {
        if (disabled || !activeVehicles.some(vehicle => vehicle.id === vehicleId)) throw new Error(copy.chooseVehicle);
        if (!users.some(person => person.id === responsibleId)) throw new Error(copy.chooseResponsible);
        const startDate = reservationInstant(form.startDate, form.startTime), endDate = reservationInstant(form.endDate, form.endTime);
        if (!startDate || !endDate) throw new Error(copy.invalidDateTime);
        const input = vehicleReservationSchema.safeParse({ vehicleId, responsibleId, title: form.title, notes: form.notes.trim() || null, startDate, endDate });
        if (!input.success) throw new Error(input.error.issues[0].message);
        if (editing) return vehicleApi.updateReservation(editing.id, input.data, options);
        const key = JSON.stringify(input.data);
        if (!request.current || request.current.key !== key) request.current = { key, id: crypto.randomUUID() };
        return vehicleApi.reserve({ ...input.data, requestId: request.current.id }, options);
    }, onSuccess: reservation => {
        request.current = null;
        if (!editing) setForm(current => ({ ...current, title: '', notes: '', startTime: '', endTime: '' }));
        toast.success(copy.reserved);
        void onSaved(reservation);
    }, onError: (failure: Error) => setError(failure.message) });
    const blocked = disabled || activeVehicles.length === 0 || users.length === 0 || save.isPending;
    const update = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: value }));
    return <form aria-label={editing ? copy.editReservation : copy.reservation} data-vehicle-reservation-form className="space-y-3 rounded-xl border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] p-4" onSubmit={event => {
        event.preventDefault();
        if (blocked) return;
        setError(''); save.mutate();
    }}>
        <div><h3 tabIndex={-1} className="font-medium text-white">{editing ? copy.editReservation : copy.reservation}</h3><p className="mt-1 text-xs text-[var(--zyllen-muted)]">{copy.reservationDescription}</p></div>
        <fieldset disabled={blocked} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <label htmlFor={prefix + 'vehicle'} className="min-w-0 text-sm text-white">{copy.vehicle}<select id={prefix + 'vehicle'} aria-label={copy.vehicle} required className="mt-1 h-9 w-full rounded-md border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] px-2 text-white" value={vehicleId} onChange={event => update('vehicleId', event.target.value)}><option value="">{copy.chooseVehicle}</option>{activeVehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}{vehicle.plate ? ` · ${vehicle.plate}` : ''}</option>)}</select></label>
                <label htmlFor={prefix + 'title'} className="min-w-0 text-sm text-white">{copy.purpose}<Input id={prefix + 'title'} className="mt-1" required maxLength={200} value={form.title} onChange={event => update('title', event.target.value)} /></label>
                <div className="min-w-0 text-sm text-white"><label htmlFor={prefix + 'responsible'}>{copy.responsible}</label><div className="mt-1"><SearchableSelect id={prefix + 'responsible'} ariaLabel={copy.responsible} placeholder={copy.chooseResponsible} searchPlaceholder={copy.searchResponsible} emptyText={copy.noResponsible} disabled={blocked} value={responsibleId} options={people.map(person => ({ value: person.id, label: person.name }))} onValueChange={value => update('responsibleId', value)} /></div></div>
            </div>
            <VehicleReservationDates value={form} onChange={update} disabled={blocked} />
            <label htmlFor={prefix + 'notes'} className="block text-sm text-white">{copy.notes}<Textarea id={prefix + 'notes'} className="mt-1" maxLength={4000} value={form.notes} onChange={event => update('notes', event.target.value)} /></label>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">{editing && <Button type="button" variant="ghost" disabled={save.isPending} onClick={onCancelEditing}>{copy.stopEditing}</Button>}<Button type="submit" variant="highlight" disabled={blocked}>{save.isPending ? copy.saving : editing ? copy.save : copy.reservationSubmit}</Button></div>
    </form>;
}
