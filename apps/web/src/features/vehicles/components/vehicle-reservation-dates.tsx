"use client";
import { useId } from 'react';
import { VEHICLES_COPY as copy } from '@web/lib/brand-voice';
import { VehicleReservationDatePicker } from './vehicle-reservation-date-picker';
import { VehicleReservationTimePicker } from './vehicle-reservation-time-picker';

export interface ReservationDatesValue { startDate: string; startTime: string; endDate: string; endTime: string }
interface Props { value: ReservationDatesValue; onChange: (field: keyof ReservationDatesValue, value: string) => void; disabled?: boolean; className?: string }
export function VehicleReservationDates({ value, onChange, disabled, className = 'space-y-3' }: Props) {
    const prefix = useId();
    return <div className={className}>{([
        { date: 'startDate', time: 'startTime', dateLabel: copy.startDate, timeLabel: copy.pickupTime },
        { date: 'endDate', time: 'endTime', dateLabel: copy.endDate, timeLabel: copy.returnTime },
    ] as const).map(pair => <div key={pair.date} className="grid grid-cols-2 items-end gap-3">
        <div className="min-w-0 text-sm text-white"><label htmlFor={prefix + pair.date}>{pair.dateLabel}</label><VehicleReservationDatePicker id={prefix + pair.date} label={pair.dateLabel} disabled={disabled} value={value[pair.date]} onChange={next => onChange(pair.date, next)} /></div>
        <div className="min-w-0 text-sm text-white"><label htmlFor={prefix + pair.time}>{pair.timeLabel}</label><VehicleReservationTimePicker id={prefix + pair.time} label={pair.timeLabel} disabled={disabled} value={value[pair.time]} onChange={next => onChange(pair.time, next)} /></div>
    </div>)}</div>;
}
