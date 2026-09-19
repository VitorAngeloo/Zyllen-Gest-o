"use client";
import { useEffect, useId, useState } from 'react';
import { Popover } from 'radix-ui';
import { Clock3 } from 'lucide-react';
import { Input } from '@web/components/ui/input';
import { Button } from '@web/components/ui/button';
import { VEHICLES_COPY as copy } from '@web/lib/brand-voice';
import { VehicleTimeWheel } from './vehicle-time-wheel';

interface Props { id: string; label: string; value: string; onChange: (value: string) => void; disabled?: boolean }
export function VehicleReservationTimePicker({ id, label, value, onChange, disabled }: Props) {
    const [open, setOpen] = useState(false), [hour, setHour] = useState(8), [minute, setMinute] = useState(0);
    const titleId = useId(), helpId = useId(), draft = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
    const show = (next: boolean) => {
        if (next && disabled) return;
        if (next) { const valid = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value), parts = valid ? value.split(':').map(Number) : [8, 0]; setHour(parts[0]); setMinute(parts[1]); }
        setOpen(next);
    };
    return <Popover.Root open={open} onOpenChange={show}>
        <div className="relative"><Popover.Trigger asChild><Input type="text" id={id} aria-label={label} aria-required="true" aria-haspopup="dialog" role="combobox" readOnly disabled={disabled} value={value} placeholder={copy.timePlaceholder} className="cursor-pointer pr-10" onKeyDown={event => { if (['Enter', ' ', 'ArrowDown'].includes(event.key)) { event.preventDefault(); show(true); } }} /></Popover.Trigger><Clock3 aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--zyllen-muted)]" /></div>
        <Popover.Portal><Popover.Content aria-labelledby={titleId} aria-describedby={helpId} align="start" sideOffset={8} collisionPadding={12} style={{ maxHeight: 'var(--radix-popover-content-available-height)' }} className="z-50 w-[min(18rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] p-4 text-white shadow-2xl">
            <h4 id={titleId} className="font-medium">{label}</h4><p id={helpId} className="mt-1 text-xs text-[var(--zyllen-muted)]">{copy.timeHelp}</p>
            <output aria-label={copy.selectedTime} className="my-3 block text-center font-mono text-2xl font-semibold text-[var(--zyllen-highlight)]">{draft}</output>
            <div className="flex items-end gap-3"><VehicleTimeWheel label={copy.hours} count={24} value={hour} onChange={setHour} /><span aria-hidden="true" className="pb-[86px] font-mono text-xl">:</span><VehicleTimeWheel label={copy.minutes} count={60} value={minute} onChange={setMinute} /></div>
            <div className="mt-4 flex gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>{copy.cancel}</Button><Button type="button" size="sm" variant="highlight" className="flex-1" onClick={() => { onChange(draft); setOpen(false); }}>{copy.confirmTime}</Button></div>
            {value && <Button type="button" size="sm" variant="ghost" className="mt-2 w-full text-[var(--zyllen-muted)]" onClick={() => { onChange(''); setOpen(false); }}>{copy.clearTime}</Button>}
        </Popover.Content></Popover.Portal>
    </Popover.Root>;
}
