"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { projectServiceInputSchema, type ProjectServiceOptions, type ProjectServicePerson, type ProjectServiceRecord } from '@zyllen/shared';
import type { RequestOptions } from '@web/lib/api-client';
import { useAuth } from '@web/features/auth/context/auth-context';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@web/components/ui/dialog';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Textarea } from '@web/components/ui/textarea';
import { PROJECT_SERVICE_COPY as copy, PROJECTS_AGENDA_COPY as workspaceCopy, STRUCTURES_COPY as structureCopy } from '@web/lib/brand-voice';
import { StructureSelector } from '@web/features/structures/components/structure-selector';
import { StructureHistory } from '@web/features/structures/components/structure-history';
import { projectServiceApi } from '../api/project-service-api';
import { projectServiceFormValues, type ProjectServiceFormValues } from '../utils/project-service-form';

const fieldClass = 'w-full min-w-0 rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] px-3 py-2 text-sm text-white [color-scheme:dark]';
function Field({ label, children }: { label: string; children: ReactNode }) {
    return <label className="block min-w-0 space-y-1 text-xs text-[var(--zyllen-muted)]"><span>{label}</span>{children}</label>;
}
function peopleWithAssigned(active: ProjectServicePerson[], assigned: ProjectServicePerson[] = []) {
    return [...active.map(user => ({ ...user, inactive: false })), ...assigned.filter(user => !active.some(person => person.id === user.id)).map(user => ({ ...user, inactive: true }))];
}
interface Props { editing?: ProjectServiceRecord; initialDates?: { start: string; end: string }; choices: ProjectServiceOptions; options: RequestOptions; onClose: () => void; onSaved: () => Promise<void> }

export function ProjectServiceFormDialog({ editing, initialDates, choices, options, onClose, onSaved }: Props) {
    const { hasPermission } = useAuth();
    const client = useQueryClient();
    const canSave = hasPermission(editing ? 'schedule.update' : 'schedule.create');
    const [form, setForm] = useState(() => ({ ...projectServiceFormValues(editing), ...(!editing && initialDates ? { startDate: initialDates.start, endDate: initialDates.end } : {}) }));
    const [error, setError] = useState('');
    const [historyOpen, setHistoryOpen] = useState(false);
    const [markerName, setMarkerName] = useState('');
    const [markers, setMarkers] = useState(choices.markers);
    const [sectorsText, setSectorsText] = useState(form.sectors.join(', '));
    const dialogRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        dialogRef.current?.querySelector<HTMLElement>('input:not(:disabled), select:not(:disabled), button:not(:disabled)')?.focus();
        return () => previous?.focus();
    }, []);
    function field<K extends keyof ProjectServiceFormValues>(name: K, value: ProjectServiceFormValues[K]) {
        if (name !== 'allowConflicts') setError('');
        setForm(current => ({ ...current, [name]: value, ...(name !== 'allowConflicts' ? { allowConflicts: false } : {}) }));
    }
    function toggle(name: 'installerIds' | 'contractorIds', id: string) {
        field(name, form[name].includes(id) ? form[name].filter(value => value !== id) : [...form[name], id]);
    }
    const save = useMutation({
        mutationFn: async () => {
            const input = projectServiceInputSchema.safeParse({ ...form, sectors: sectorsText.split(',').map(value => value.trim()).filter(Boolean), startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
                endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined });
            if (!input.success) throw new Error(input.error.issues.map(issue => issue.message).join('. '));
            return projectServiceApi.save(editing?.id, input.data, options);
        },
        onSuccess: async () => { await client.invalidateQueries({ queryKey: ['structure-cycles'] }); await onSaved(); onClose(); },
        onError: (error: Error) => setError(error.message),
    });
    const marker = useMutation({ mutationFn: () => projectServiceApi.marker(markerName.trim(), options),
        onSuccess: value => { setMarkers(current => current.some(item => item.id === value.id) ? current : [...current, value]); field('markerId', value.id); setMarkerName(''); },
        onError: (error: Error) => setError(error.message),
    });
    return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose(); }}><DialogContent ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[90vh] max-w-3xl overflow-y-auto" onKeyDown={event => {
        if (event.key === 'Escape' && !save.isPending) { event.preventDefault(); onClose(); }
        if (event.key === 'Tab') {
            const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), a[href]') ?? [])];
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
    }}>
        <DialogHeader><DialogTitle id={titleId}>{!canSave ? copy.details : editing ? copy.edit : copy.create}</DialogTitle><p className="mt-1 text-xs text-[var(--zyllen-muted)]">{copy.oneService}</p></DialogHeader>
        <DialogBody>{editing?.trip && <div className="mb-4 rounded-lg border border-sky-400/40 p-3 text-sm text-sky-200"><p>{copy.bookedTravel}: {editing.trip.title}</p><p className="mt-1 text-xs">{copy.bookedTravelContext}</p><Link className="mt-2 inline-block underline" href="/dashboard/projetos?aba=viagens">{copy.manageTravel}</Link></div>}
            {editing?.structureCycle && <div className="mb-4 space-y-2 rounded-lg border border-[var(--zyllen-border)] p-3 text-sm"><p>{structureCopy.select}: {editing.structureCycle.structureName}</p><p className="text-xs text-[var(--zyllen-muted)]">{structureCopy.immutable}</p><Button type="button" size="sm" variant="outline" aria-expanded={historyOpen} onClick={() => setHistoryOpen(value => !value)}>{historyOpen ? structureCopy.closeHistory : structureCopy.history}</Button></div>}
            {!choices.companies.length && <p role="status" className="mb-4 text-sm text-amber-200">{workspaceCopy.noClients}</p>}
            <form id="project-service-form" className="space-y-5" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
            <fieldset disabled={save.isPending || !canSave} className="space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label={copy.company}><select aria-label={copy.company} required value={form.companyId} disabled={!!editing} className={fieldClass} onChange={event => setForm(current => ({ ...current, companyId: event.target.value, projectId: undefined, structureId: null, removalCycleId: null, allowConflicts: false }))}><option value="">{copy.chooseCompany}</option>{choices.companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></Field>
                    {!editing && <Field label={copy.existingProject}><select aria-label={copy.existingProject} className={fieldClass} value={form.projectId ?? ''} onChange={event => {
                        const project = choices.projects.find(item => item.id === event.target.value);
                        setForm(current => ({ ...current, projectId: project?.id, name: project?.name ?? current.name, address: project?.address ?? '', city: project?.city ?? '', state: project?.state ?? '', allowConflicts: false }));
                    }}><option value="">{copy.newProject}</option>{choices.projects.filter(project => project.companyId === form.companyId && !project.hasService).map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>}
                    <Field label={copy.marker}><select aria-label={copy.marker} className={fieldClass} value={form.markerId ?? ''} onChange={event => field('markerId', event.target.value || null)}><option value="">{copy.noMarker}</option>{markers.map(marker => <option key={marker.id} value={marker.id}>{marker.name}</option>)}</select></Field>
                    <Field label={copy.name}><Input aria-label={copy.name} required maxLength={200} value={form.name} onChange={event => field('name', event.target.value)} /></Field>
                    <Field label={copy.type}><select aria-label={copy.type} disabled={!!editing?.structureCycle} className={fieldClass} value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value as ProjectServiceFormValues['type'], removalCycleId: null, allowConflicts: false }))}>{Object.entries(copy.types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
                    <Field label={copy.urgency}><select aria-label={copy.urgency} className={fieldClass} value={form.urgency} onChange={event => field('urgency', Number(event.target.value))}>{copy.urgencies.map((label, index) => <option key={index} value={index}>{label}</option>)}</select></Field>
                </div>
                {!editing?.structureCycle && <StructureSelector key={`${form.companyId}:${form.type}`} companyId={form.companyId} type={form.type} structureId={form.structureId} cycleId={form.removalCycleId} options={options} enabled={canSave}
                        onChange={(structureId, removalCycleId) => setForm(current => ({ ...current, structureId, removalCycleId, allowConflicts: false }))} />}
                {hasPermission('schedule.create') && <div className="flex flex-wrap items-end gap-2"><div className="min-w-0 flex-1"><Field label={copy.newMarker}><Input aria-label={copy.newMarker} maxLength={100} value={markerName} onChange={event => setMarkerName(event.target.value)} /></Field></div><Button type="button" size="sm" variant="outline" disabled={!markerName.trim() || marker.isPending} onClick={() => marker.mutate()}>{copy.addMarker}</Button></div>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label={copy.address}><Input aria-label={copy.address} value={form.address} maxLength={1000} onChange={event => field('address', event.target.value)} /></Field>
                    <Field label={copy.maps}><Input aria-label={copy.maps} type="url" placeholder="https://maps.app.goo.gl/..." value={form.mapsUrl} onChange={event => field('mapsUrl', event.target.value)} /></Field>
                    <Field label={copy.city}><Input aria-label={copy.city} value={form.city} maxLength={100} onChange={event => field('city', event.target.value)} /></Field>
                    <Field label={copy.state}><Input aria-label={copy.state} value={form.state} maxLength={2} onChange={event => field('state', event.target.value.toUpperCase())} /></Field>
                    <Field label={copy.start}><Input aria-label={copy.start} type="datetime-local" value={form.startDate} onChange={event => field('startDate', event.target.value)} /></Field>
                    <Field label={copy.end}><Input aria-label={copy.end} type="datetime-local" value={form.endDate} onChange={event => field('endDate', event.target.value)} /></Field>
                </div><p className="text-xs text-[var(--zyllen-muted)]">{copy.optionalDate}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{([{ field: 'installerIds', title: copy.internal, people: peopleWithAssigned(choices.internalUsers, editing?.internalAssignees) }, { field: 'contractorIds', title: copy.contractors, people: peopleWithAssigned(choices.contractors, editing?.contractors) }] as const).map(group => <fieldset key={group.field} className="rounded-lg border border-[var(--zyllen-border)] p-3"><legend className="px-1 text-xs text-white">{group.title}</legend><div className="max-h-36 space-y-2 overflow-y-auto">{group.people.length ? group.people.map(user => <label key={user.id} className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)]"><input type="checkbox" checked={form[group.field].includes(user.id)} disabled={user.inactive && !form[group.field].includes(user.id)} onChange={() => toggle(group.field, user.id)} />{user.name}{user.inactive && ` · ${copy.inactive}`}</label>) : <p className="text-xs text-[var(--zyllen-muted)]">{copy.noPeople}</p>}</div></fieldset>)}</div>
                <Field label={copy.sectors}><Input aria-label={copy.sectors} value={sectorsText} onChange={event => { setSectorsText(event.target.value); field('allowConflicts', false); }} /></Field>
                <div className="flex flex-wrap items-center gap-5 text-xs text-[var(--zyllen-muted)]"><Field label={copy.color}><input type="color" aria-label={copy.color} value={form.color} onChange={event => field('color', event.target.value)} className="h-9 w-16 rounded border border-[var(--zyllen-border)]" /></Field><label className="flex items-center gap-2"><input type="checkbox" checked={form.requiresTravel} disabled={!!editing?.trip} onChange={event => field('requiresTravel', event.target.checked)} />{copy.travel}</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.relevant} onChange={event => field('relevant', event.target.checked)} />{copy.relevant}</label></div>
                <Field label={copy.notes}><Textarea aria-label={copy.notes} value={form.notes} rows={3} maxLength={10000} onChange={event => field('notes', event.target.value)} /></Field>
                {error && <div role="alert" className="space-y-3 rounded-lg border border-red-400/50 p-3 text-sm text-red-200"><p>{error}</p>{error.includes('conflito de horário') && <label className="flex items-start gap-2"><input type="checkbox" checked={form.allowConflicts} onChange={event => field('allowConflicts', event.target.checked)} />{copy.allowConflicts}</label>}</div>}
            </fieldset>
        </form>{historyOpen && editing?.structureCycle && <div className="mt-5"><StructureHistory id={editing.structureCycle.structureId} name={editing.structureCycle.structureName} onClose={() => setHistoryOpen(false)} /></div>}</DialogBody><DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>{copy.cancel}</Button>{canSave && <Button type="submit" form="project-service-form" disabled={save.isPending}>{save.isPending ? copy.saving : copy.save}</Button>}</DialogFooter>
    </DialogContent></Dialog>;
}
