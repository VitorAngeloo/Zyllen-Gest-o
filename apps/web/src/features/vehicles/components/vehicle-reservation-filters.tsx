"use client";
import { useId } from 'react';
import type { VehicleRecord } from '@zyllen/shared';
import { SearchableSelect } from '@web/components/ui/searchable-select';
import { VEHICLES_COPY as copy } from '@web/lib/brand-voice';
import { VehicleReservationDatePicker } from './vehicle-reservation-date-picker';

interface Props { from: string; to: string; vehicleId: string; responsibleId: string; vehicles: VehicleRecord[]; users: { id: string; name: string }[]; disabled: boolean; onFrom: (value: string) => void; onTo: (value: string) => void; onVehicle: (value: string) => void; onResponsible: (value: string) => void }
export function VehicleReservationFilters({ from, to, vehicleId, responsibleId, vehicles, users, disabled, onFrom, onTo, onVehicle, onResponsible }: Props) {
    const prefix = useId();
    return <details className="border-y border-white/10 bg-white/[0.015] py-4" data-vehicle-reservation-filters>
        <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 transition-colors hover:text-white">{copy.filterReservations}</summary>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="min-w-0 text-sm text-[var(--zyllen-muted)]"><label htmlFor={prefix + 'from'}>{copy.filterFrom}</label><VehicleReservationDatePicker id={prefix + 'from'} label={copy.filterFrom} value={from} onChange={onFrom} disabled={disabled} /></div>
            <div className="min-w-0 text-sm text-[var(--zyllen-muted)]"><label htmlFor={prefix + 'to'}>{copy.filterTo}</label><VehicleReservationDatePicker id={prefix + 'to'} label={copy.filterTo} value={to} onChange={onTo} disabled={disabled} /></div>
            <label htmlFor={prefix + 'vehicle'} className="text-sm text-[var(--zyllen-muted)]">{copy.filterVehicle}<select id={prefix + 'vehicle'} aria-label={copy.filterVehicle} disabled={disabled} className="mt-1 h-9 w-full rounded-md border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] px-2 text-white disabled:opacity-50" value={vehicleId} onChange={event => onVehicle(event.target.value)}><option value="">{copy.allVehicles}</option>{vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}</select></label>
            <div className="min-w-0 text-sm text-[var(--zyllen-muted)]"><label htmlFor={prefix + 'responsible'}>{copy.filterResponsible}</label><div className="mt-1"><SearchableSelect id={prefix + 'responsible'} ariaLabel={copy.filterResponsible} disabled={disabled} value={responsibleId} options={[{ value: '', label: copy.allResponsible }, ...users.map(person => ({ value: person.id, label: person.name }))]} placeholder={copy.allResponsible} searchPlaceholder={copy.searchResponsible} emptyText={copy.noResponsible} onValueChange={onResponsible} /></div></div>
        </div>
    </details>;
}
