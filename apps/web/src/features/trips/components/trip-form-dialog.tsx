"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { BRAZIL_STATES, tripInputSchema, type TripOptions, type TripPerson, type TripRecord, type TripStatusInput } from '@zyllen/shared';
import type { RequestOptions } from '@web/lib/api-client';
import { useAuth } from '@web/features/auth/context/auth-context';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@web/components/ui/dialog';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Textarea } from '@web/components/ui/textarea';
import { PROJECT_SERVICE_COPY as serviceCopy, TRIP_COPY as copy } from '@web/lib/brand-voice';
import { tripApi } from '../api/trip-api';
import { tripFormValues, type TripFormValues } from '../utils/trip-form';

const fieldClass = 'w-full min-w-0 rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] px-3 py-2 text-sm text-white [color-scheme:dark]';
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block min-w-0 space-y-1 text-xs text-[var(--zyllen-muted)]"><span>{label}</span>{children}</label>; }
function people(active: TripPerson[], assigned: TripPerson[] = []) {
    return [...active.map(user => ({ ...user, inactive: false })), ...assigned.filter(user => !active.some(item => item.id === user.id)).map(user => ({ ...user, inactive: true }))];
}
interface Props { editing?: TripRecord; initialDates?: { start: string; end: string }; choices: TripOptions; options: RequestOptions; onClose: () => void; onSaved: () => Promise<void> }

export function TripFormDialog({ editing, initialDates, choices, options, onClose, onSaved }: Props) {
    const { hasPermission } = useAuth();
    const canUpdate = hasPermission('schedule.update');
    const terminal = !!editing && ['DONE', 'CANCELLED'].includes(editing.status);
    const canSave = hasPermission(editing ? 'schedule.update' : 'schedule.create') && !terminal;
    const [form, setForm] = useState(() => ({ ...tripFormValues(editing), ...(!editing && initialDates ? { startDate: initialDates.start, endDate: initialDates.end } : {}) }));
    const [error, setError] = useState('');
    const [confirmation, setConfirmation] = useState<TripStatusInput['status'] | null>(null);
    const dialogRef = useRef<HTMLDivElement>(null), titleId = useId();
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        if (canSave) dialogRef.current?.querySelector<HTMLElement>('input:not(:disabled), select:not(:disabled), button:not(:disabled)')?.focus({ preventScroll: true });
        else dialogRef.current?.focus({ preventScroll: true });
        if (dialogRef.current) dialogRef.current.scrollTop = 0;
        return () => previous?.focus();
    }, []);
    function field<K extends keyof TripFormValues>(name: K, value: TripFormValues[K]) {
        if (name !== 'allowConflicts') setError('');
        setForm(current => ({ ...current, [name]: value, ...(name !== 'allowConflicts' ? { allowConflicts: false } : {}) }));
    }
    function toggle(name: 'installerIds' | 'contractorIds' | 'serviceIds', id: string) { field(name, form[name].includes(id) ? form[name].filter(value => value !== id) : [...form[name], id]); }
    const save = useMutation({ mutationFn: async () => {
        const input = tripInputSchema.safeParse({ ...form, startDate: form.startDate ? new Date(form.startDate).toISOString() : '', endDate: form.endDate ? new Date(form.endDate).toISOString() : '' });
        if (!input.success) throw new Error(input.error.issues.map(issue => issue.message).join('. '));
        return tripApi.save(editing?.id, input.data, options);
    }, onSuccess: async () => { await onSaved(); onClose(); }, onError: (error: Error) => setError(error.message) });
    const status = useMutation({ mutationFn: (value: TripStatusInput['status']) => tripApi.status(editing!.id, { status: value }, options),
        onSuccess: async () => { await onSaved(); onClose(); }, onError: (error: Error) => { setConfirmation(null); setError(error.message); } });
    const busy = save.isPending || status.isPending;
    const serviceChoices = [...choices.services, ...(editing?.services ?? []).filter(service => !choices.services.some(item => item.id === service.id))];
    return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[90vh] max-w-3xl overflow-y-auto" onKeyDown={event => {
        if (event.key === 'Escape' && !busy) { event.preventDefault(); onClose(); }
        if (event.key === 'Tab') {
            const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), a[href]') ?? [])].filter(item => !item.closest('fieldset:disabled'));
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
    }}>
        <DialogHeader><DialogTitle id={titleId}>{!canSave ? copy.details : editing ? copy.edit : copy.create}</DialogTitle><p className="mt-1 text-xs text-[var(--zyllen-muted)]">{copy.periodContext}</p></DialogHeader>
        <DialogBody><form id="trip-form" className="space-y-5" onSubmit={event => { event.preventDefault(); if (canSave && !busy) save.mutate(); }}>
            {editing && <div className="rounded-lg border border-[var(--zyllen-border)] p-3 text-xs text-[var(--zyllen-muted)]"><p className="mb-3 font-semibold text-white">{copy.statuses[editing.status] ?? editing.status} · {editing.interstate ? copy.interstate : copy.sameState}</p><dl className="grid gap-3 sm:grid-cols-3">{([{ label: copy.started, value: editing.startedAt }, { label: copy.completed, value: editing.completedAt }, { label: copy.cancelled, value: editing.cancelledAt }]).map(item => <div key={item.label}><dt>{item.label}</dt><dd className="mt-1 text-white">{item.value ? new Date(item.value).toLocaleString('pt-BR') : copy.noActualDate}</dd></div>)}</dl>{terminal && <p className="mt-3">{copy.terminal}</p>}</div>}
            <fieldset disabled={busy || !canSave} className="space-y-5 [&_input:disabled]:opacity-100 [&_textarea:disabled]:opacity-100 [&_select:disabled]:opacity-100 [&_input:disabled]:text-[var(--zyllen-muted)] [&_textarea:disabled]:text-[var(--zyllen-muted)] [&_select:disabled]:text-[var(--zyllen-muted)]">
                <Field label={copy.name}><Input aria-label={copy.name} required maxLength={200} value={form.title} onChange={event => field('title', event.target.value)} /></Field>
                <fieldset disabled={editing?.status === 'IN_PROGRESS'} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label={copy.originCity}><Input aria-label={copy.originCity} required maxLength={100} value={form.originCity} onChange={event => field('originCity', event.target.value)} /></Field>
                    <Field label={copy.originState}><select aria-label={copy.originState} required className={fieldClass} value={form.originState} onChange={event => field('originState', event.target.value)}><option value="">{copy.chooseState}</option>{BRAZIL_STATES.map(state => <option key={state}>{state}</option>)}</select></Field>
                    <Field label={copy.destinationCity}><Input aria-label={copy.destinationCity} required maxLength={100} value={form.destinationCity} onChange={event => field('destinationCity', event.target.value)} /></Field>
                    <Field label={copy.destinationState}><select aria-label={copy.destinationState} required className={fieldClass} value={form.destinationState} onChange={event => field('destinationState', event.target.value)}><option value="">{copy.chooseState}</option>{BRAZIL_STATES.map(state => <option key={state}>{state}</option>)}</select></Field>
                </fieldset>{editing?.status === 'IN_PROGRESS' && <p className="text-xs text-[var(--zyllen-muted)]">{copy.routeLocked}</p>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label={copy.departure}><Input aria-label={copy.departure} required type="datetime-local" value={form.startDate} onChange={event => field('startDate', event.target.value)} /></Field><Field label={copy.return}><Input aria-label={copy.return} required type="datetime-local" value={form.endDate} onChange={event => field('endDate', event.target.value)} /></Field></div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{([{ field: 'installerIds', title: copy.internal, choices: people(choices.internalUsers, editing?.internalAssignees) }, { field: 'contractorIds', title: copy.contractors, choices: people(choices.contractors, editing?.contractors) }] as const).map(group => <fieldset key={group.field} className="min-w-0 rounded-lg border border-[var(--zyllen-border)] p-3"><legend className="px-1 text-xs text-white">{group.title}</legend><div className="max-h-36 space-y-2 overflow-y-auto">{group.choices.length ? group.choices.map(user => <label key={user.id} className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] [overflow-wrap:anywhere]"><input type="checkbox" checked={form[group.field].includes(user.id)} disabled={user.inactive && !form[group.field].includes(user.id)} onChange={() => toggle(group.field, user.id)} />{user.name}{user.inactive && ` · ${copy.inactive}`}</label>) : <p className="text-xs text-[var(--zyllen-muted)]">{copy.noPeople}</p>}</div></fieldset>)}</div>
                <fieldset className="rounded-lg border border-[var(--zyllen-border)] p-3"><legend className="px-1 text-xs text-white">{copy.services}</legend><p className="mb-3 text-xs text-[var(--zyllen-muted)]">{copy.servicesContext}</p><div className="max-h-44 space-y-3 overflow-y-auto">{serviceChoices.length ? serviceChoices.map(service => {
                    const unavailable = !!service.tripId && service.tripId !== editing?.id;
                    return <label key={service.id} className="flex items-start gap-2 text-sm text-[var(--zyllen-muted)]"><input type="checkbox" className="mt-1" disabled={unavailable} checked={form.serviceIds.includes(service.id)} onChange={() => toggle('serviceIds', service.id)} /><span className="min-w-0 [overflow-wrap:anywhere]"><span className="text-white">{service.name}</span><span className="mt-0.5 block text-xs">{service.companyName} · {serviceCopy.types[service.type]}{unavailable && ` · ${copy.anotherTrip}`}</span></span></label>;
                }) : <p className="text-xs text-[var(--zyllen-muted)]">{copy.noServices}</p>}</div></fieldset>
                <Field label={copy.notes}><Textarea aria-label={copy.notes} rows={3} maxLength={10000} value={form.notes} onChange={event => field('notes', event.target.value)} /></Field>
                {error.includes('conflito de horário') && <label className="flex items-start gap-2 text-sm text-amber-200"><input type="checkbox" checked={form.allowConflicts} onChange={event => field('allowConflicts', event.target.checked)} />{copy.allowConflicts}</label>}
            </fieldset>
            {error && <p role="alert" className="rounded-lg border border-red-400/50 p-3 text-sm text-red-200">{error}</p>}
            {editing && canUpdate && <div className="space-y-3 border-t border-[var(--zyllen-border)] pt-4">{confirmation ? <div role="alert" className="space-y-3 rounded-lg border border-amber-400/40 p-3"><p className="text-sm text-amber-200">{copy.confirmation[confirmation]}</p><div className="flex flex-wrap gap-2"><Button type="button" disabled={busy} onClick={() => status.mutate(confirmation)}>{copy.confirm}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmation(null)}>{copy.abort}</Button></div></div> : <div className="flex flex-wrap gap-2">{([{ value: 'IN_PROGRESS', label: copy.start, show: editing.status === 'SCHEDULED' }, { value: 'DONE', label: copy.finish, show: editing.status === 'IN_PROGRESS' }, { value: 'CANCELLED', label: copy.cancel, show: !terminal }, { value: 'SCHEDULED', label: copy.reopen, show: terminal || editing.status === 'IN_PROGRESS' }] as const).filter(item => item.show).map(item => <Button key={item.value} type="button" variant="outline" disabled={busy} onClick={() => { setError(''); setConfirmation(item.value); }}>{item.label}</Button>)}</div>}</div>}
        </form></DialogBody><DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={busy}>{copy.close}</Button>{canSave && <Button type="submit" form="trip-form" disabled={busy || !!confirmation}>{save.isPending ? copy.saving : copy.save}</Button>}</DialogFooter>
    </DialogContent></Dialog>;
}
