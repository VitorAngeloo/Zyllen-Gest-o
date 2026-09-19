"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Popover } from 'radix-ui';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@web/components/ui/input';
import { Button } from '@web/components/ui/button';
import { localCalendarDate } from '@web/lib/date-period';
import { VEHICLES_COPY as copy } from '@web/lib/brand-voice';
import { reservationDateIso, reservationDateText } from '../utils/vehicle-reservation-period';

interface Props { id: string; label: string; value: string; onChange: (value: string) => void; disabled?: boolean }
function dayDate(year: number, month: number, day: number) {
    const date = new Date(0); date.setFullYear(year, month, day); date.setHours(12, 0, 0, 0); return date;
}
function selectedDate(value: string) {
    const iso = reservationDateIso(value);
    if (!iso) return new Date();
    const [year, month, day] = iso.split('-').map(Number);
    return dayDate(year, month - 1, day);
}
export function VehicleReservationDatePicker({ id, label, value, onChange, disabled }: Props) {
    const [open, setOpen] = useState(false), [view, setView] = useState(() => selectedDate(value));
    const [focusDay, setFocusDay] = useState(() => selectedDate(value).getDate());
    const titleId = useId(), daysRef = useRef<HTMLDivElement>(null), today = reservationDateText(localCalendarDate(Date.now()));
    const focusAfterMove = useRef(false);
    const year = view.getFullYear(), month = view.getMonth(), firstDay = dayDate(year, month, 1).getDay(), count = dayDate(year, month + 1, 0).getDate();
    const years = Array.from(new Set([...Array.from({ length: 201 }, (_, index) => 1900 + index), year])).sort((a, b) => a - b);
    useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
    useLayoutEffect(() => { if (focusAfterMove.current) { focusAfterMove.current = false; daysRef.current?.querySelector<HTMLButtonElement>(`[data-calendar-day="${focusDay}"]`)?.focus(); } }, [view, focusDay]);
    const show = (next: boolean) => {
        if (next && disabled) return;
        if (next) { const date = selectedDate(value); setView(date); setFocusDay(date.getDate()); }
        setOpen(next);
    };
    const choose = (date: Date) => { onChange(reservationDateText(localCalendarDate(date.getTime()))); setOpen(false); };
    const move = (date: Date, focus = false) => {
        if (date.getFullYear() < 100 || date.getFullYear() > 9999) return;
        focusAfterMove.current = focus;
        setView(date); setFocusDay(date.getDate());
    };
    return <Popover.Root open={open} onOpenChange={show}>
        <div className="relative"><Popover.Trigger asChild><Input type="text" id={id} aria-label={label} aria-required="true" aria-haspopup="dialog" role="combobox" readOnly disabled={disabled} value={value} placeholder={copy.datePlaceholder} className="cursor-pointer pr-10" onKeyDown={event => { if (['Enter', ' ', 'ArrowDown'].includes(event.key)) { event.preventDefault(); show(true); } }} /></Popover.Trigger><CalendarDays aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--zyllen-muted)]" /></div>
        <Popover.Portal><Popover.Content aria-labelledby={titleId} align="start" sideOffset={8} collisionPadding={12} style={{ maxHeight: 'var(--radix-popover-content-available-height)' }} className="z-50 w-[min(19rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] p-3 text-white shadow-2xl" onOpenAutoFocus={event => { event.preventDefault(); daysRef.current?.querySelector<HTMLButtonElement>(`[data-calendar-day="${focusDay}"]`)?.focus(); }}>
            <h4 id={titleId} className="mb-3 font-medium">{label}</h4>
            <div className="mb-3 flex items-center gap-1">
                <Button type="button" size="sm" variant="ghost" aria-label={copy.previousMonth} disabled={year === 100 && month === 0} onClick={() => move(dayDate(year, month - 1, 1))}><ChevronLeft size={16} /></Button>
                <select aria-label={copy.calendarMonth} value={month} className="min-w-0 flex-1 rounded-md border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] py-1.5 text-sm" onChange={event => move(dayDate(year, Number(event.target.value), 1))}>{copy.months.map((name, index) => <option key={name} value={index}>{name}</option>)}</select>
                <select aria-label={copy.calendarYear} value={year} className="w-20 rounded-md border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] py-1.5 text-sm" onChange={event => move(dayDate(Number(event.target.value), month, 1))}>{years.map(item => <option key={item} value={item}>{item}</option>)}</select>
                <Button type="button" size="sm" variant="ghost" aria-label={copy.nextMonth} disabled={year === 9999 && month === 11} onClick={() => move(dayDate(year, month + 1, 1))}><ChevronRight size={16} /></Button>
            </div>
            <div className="mb-1 grid grid-cols-7 text-center text-xs text-[var(--zyllen-muted)]">{copy.weekdays.map(day => <span key={day}>{day}</span>)}</div>
            <div ref={daysRef} className="grid grid-cols-7 gap-1">{Array.from({ length: firstDay }, (_, index) => <span key={`empty-${index}`} />)}{Array.from({ length: count }, (_, index) => {
                const day = index + 1, date = dayDate(year, month, day), text = reservationDateText(localCalendarDate(date.getTime()));
                return <button key={day} type="button" data-calendar-day={day} aria-label={text} aria-pressed={text === value} aria-current={text === today ? 'date' : undefined} tabIndex={day === focusDay ? 0 : -1} className={`h-9 rounded-md text-sm focus-visible:outline-2 focus-visible:outline-[var(--zyllen-highlight)] ${text === value ? 'bg-[var(--zyllen-highlight)] font-semibold text-black' : 'hover:bg-white/10'} ${text === today && text !== value ? 'border border-[var(--zyllen-highlight)]/60' : ''}`} onClick={() => choose(date)} onKeyDown={event => {
                    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
                    if (event.key in offsets) { event.preventDefault(); move(dayDate(year, month, day + offsets[event.key]), true); }
                    else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); move(dayDate(year, month, event.key === 'Home' ? 1 : count), true); }
                    else if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); move(dayDate(year, month + (event.key === 'PageUp' ? -1 : 1), 1), true); }
                }}>{day}</button>;
            })}</div>
            <Button type="button" size="sm" variant="ghost" className="mt-2 w-full" onClick={() => choose(new Date())}>{copy.today}</Button>
        </Popover.Content></Popover.Portal>
    </Popover.Root>;
}
