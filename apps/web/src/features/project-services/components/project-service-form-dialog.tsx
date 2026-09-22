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
import { SearchableSelect } from '@web/components/ui/searchable-select';
import { Textarea } from '@web/components/ui/textarea';
import { PROJECT_SERVICE_COPY as copy, PROJECTS_AGENDA_COPY as workspaceCopy, STRUCTURES_COPY as structureCopy } from '@web/lib/brand-voice';
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
    const internalPeople = peopleWithAssigned(choices.internalUsers, editing?.internalAssignees);
    const sectorGroups = Object.groupBy(internalPeople, person => person.sector?.trim() || 'Outros');
    const travelPeople = internalPeople.filter(person => ['Técnico', 'Gestor', 'Administrador'].includes(person.roleName ?? '')
        && person.name.trim().toLocaleLowerCase('pt-BR') !== 'dashboard');
    const projectNames = new Map(choices.projects.map(project => [project.id, project.name]));
    const selectedCompany = choices.companies.find(company => company.id === form.companyId);
    const companyHasAddress = Boolean(selectedCompany?.address || selectedCompany?.city || selectedCompany?.state);
    const dialogRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const companyFieldId = useId();
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        dialogRef.current?.querySelector<HTMLElement>('input:not(:disabled), select:not(:disabled), button:not(:disabled)')?.focus();
        return () => previous?.focus();
    }, []);
    function field<K extends keyof ProjectServiceFormValues>(name: K, value: ProjectServiceFormValues[K]) {
        if (name !== 'allowConflicts') setError('');
        setForm(current => ({ ...current, [name]: value, ...(name !== 'allowConflicts' ? { allowConflicts: false } : {}) }));
    }
    function toggle(name: 'installerIds' | 'contractorIds' | 'travelParticipantIds', id: string) {
        field(name, form[name].includes(id) ? form[name].filter(value => value !== id) : [...form[name], id]);
    }
    const save = useMutation({
        mutationFn: async () => {
            const input = projectServiceInputSchema.safeParse({ ...form, sectors: [], startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
                endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined });
            if (!input.success) throw new Error(input.error.issues.map(issue => issue.message).join('. '));
            return projectServiceApi.save(editing?.id, input.data, options);
        },
        onSuccess: async () => { await client.invalidateQueries({ queryKey: ['structure-cycles'] }); await onSaved(); onClose(); },
        onError: (error: Error) => setError(error.message),
    });
    return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose(); }}><DialogContent ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} onClose={save.isPending ? undefined : onClose} className="max-h-[90vh] max-w-3xl overflow-y-auto" onKeyDown={event => {
        if (event.key === 'Escape' && !save.isPending) { event.preventDefault(); onClose(); }
        if (event.key === 'Tab') {
            const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), a[href]') ?? [])];
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
    }}>
        <DialogHeader><DialogTitle id={titleId}>{!canSave ? copy.details : editing ? copy.edit : copy.create}</DialogTitle><p className="mt-1 text-xs text-[var(--zyllen-muted)]">{copy.oneService}</p></DialogHeader>
        <DialogBody>{editing?.trip && <div className="mb-4 rounded-lg border border-sky-400/40 p-3 text-sm text-sky-200"><p>{copy.bookedTravel}: {editing.trip.title}</p><Link className="mt-2 inline-block underline" href="/dashboard/projetos?aba=viagens">Ver viagens</Link></div>}
            {editing?.structureCycle && <div className="mb-4 space-y-2 rounded-lg border border-[var(--zyllen-border)] p-3 text-sm"><p>{structureCopy.select}: {editing.structureCycle.structureName}</p><p className="text-xs text-[var(--zyllen-muted)]">{structureCopy.immutable}</p><Button type="button" size="sm" variant="outline" aria-expanded={historyOpen} onClick={() => setHistoryOpen(value => !value)}>{historyOpen ? structureCopy.closeHistory : structureCopy.history}</Button></div>}
            {!choices.companies.length && <p role="status" className="mb-4 text-sm text-amber-200">{workspaceCopy.noClients}</p>}
            <form id="project-service-form" autoComplete="off" className="space-y-5" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
            <fieldset disabled={save.isPending || !canSave} className="space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="min-w-0 space-y-1 text-xs text-[var(--zyllen-muted)]"><label htmlFor={companyFieldId}>{copy.company}</label><SearchableSelect id={companyFieldId} ariaLabel={copy.company} placeholder={copy.chooseCompany} searchPlaceholder="Digite o nome do cliente" emptyText="Nenhum cliente encontrado" value={form.companyId} options={choices.companies.map(company => ({ value: company.id, label: company.name }))} disabled={!!editing || !canSave || save.isPending} required className={fieldClass} onValueChange={companyId => {
                        const company = choices.companies.find(item => item.id === companyId);
                        setForm(current => ({ ...current, companyId, projectId: undefined, followupId: null, name: '',
                            address: company?.address ?? '', city: company?.city ?? '', state: company?.state ?? '',
                            structureId: null, removalCycleId: null, allowConflicts: false }));
                    }} /></div>
                    {!editing && <Field label={copy.existingProject}><select aria-label={copy.existingProject} className={fieldClass} value={form.projectId ?? ''} onChange={event => {
                        const project = choices.projects.find(item => item.id === event.target.value);
                        setForm(current => ({ ...current, projectId: project?.id, followupId: null, name: project?.name ?? '',
                            address: project ? project.address ?? '' : selectedCompany?.address ?? '',
                            city: project ? project.city ?? '' : selectedCompany?.city ?? '',
                            state: project ? project.state ?? '' : selectedCompany?.state ?? '', allowConflicts: false }));
                    }}><option value="">{copy.newProject}</option>{choices.projects.filter(project => project.companyId === form.companyId && !project.hasService).map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>}
                    <Field label={copy.marker}><select aria-label={copy.marker} className={fieldClass} value={form.markerId ?? ''} onChange={event => field('markerId', event.target.value || null)}><option value="">{copy.noMarker}</option>{choices.markers.map(marker => <option key={marker.id} value={marker.id}>{marker.name}</option>)}</select></Field>
                    {(!form.projectId || editing) ? <Field label={copy.name}><Input aria-label={copy.name} autoComplete="off" required maxLength={200} value={form.name} onChange={event => field('name', event.target.value)} /></Field>
                        : <p className="self-end text-sm text-white">{form.name}</p>}
                    {editing?.type === 'REMOVAL' && <p className="self-end text-xs text-[var(--zyllen-muted)]">Serviço existente: desinstalação</p>}
                    <Field label={copy.urgency}><select aria-label={copy.urgency} className={fieldClass} value={form.urgency} onChange={event => field('urgency', Number(event.target.value))}>{copy.urgencies.map((label, index) => <option key={index} value={index}>{label}</option>)}</select></Field>
                </div>
                <Field label="Vincular acompanhamento"><select aria-label="Vincular acompanhamento" className={fieldClass} value={form.followupId ?? ''} onChange={event => field('followupId', event.target.value || null)}><option value="">Nenhum acompanhamento</option>{(choices.followups ?? []).filter(item => item.companyId === form.companyId && (!item.serviceId || item.serviceId === editing?.id) && (!item.projectId || item.projectId === form.projectId)).map(item => <option key={item.id} value={item.id}>{item.code} · {item.projectId ? projectNames.get(item.projectId) ?? 'Projeto não encontrado' : 'Sem projeto vinculado'}</option>)}</select></Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label={copy.address}><Input aria-label={copy.address} autoComplete="off" required value={form.address} maxLength={1000} onChange={event => field('address', event.target.value)} /></Field>
                    <Field label={copy.maps}><Input aria-label={copy.maps} autoComplete="off" type="url" placeholder="https://maps.app.goo.gl/..." value={form.mapsUrl} onChange={event => field('mapsUrl', event.target.value)} /></Field>
                    <Field label={copy.city}><Input aria-label={copy.city} autoComplete="off" value={form.city} maxLength={100} onChange={event => field('city', event.target.value)} /></Field>
                    <Field label={copy.state}><Input aria-label={copy.state} autoComplete="off" value={form.state} maxLength={2} onChange={event => field('state', event.target.value.toUpperCase())} /></Field>
                    <Field label={copy.start}><Input aria-label={copy.start} type="datetime-local" value={form.startDate} onChange={event => field('startDate', event.target.value)} /></Field>
                    <Field label={copy.end}><Input aria-label={copy.end} type="datetime-local" value={form.endDate} onChange={event => field('endDate', event.target.value)} /></Field>
                </div>{!editing && !form.projectId && companyHasAddress && <p className="text-xs text-[var(--zyllen-muted)]">Endereço sugerido a partir do cadastro do cliente. Confira e ajuste se o projeto ocorrer em outro local.</p>}<p className="text-xs text-[var(--zyllen-muted)]">{copy.optionalDate}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <fieldset className="rounded-lg border border-[var(--zyllen-border)] p-3"><legend className="px-1 text-xs text-white">{copy.internal}</legend>
                        <div className="max-h-48 space-y-3 overflow-y-auto">{Object.entries(sectorGroups).map(([sector, people]) => <div key={sector}><p className="mb-1 text-xs font-semibold text-white">{sector}</p><div className="space-y-1">{people?.map(person => <label key={person.id} className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)]"><input type="checkbox" checked={form.installerIds.includes(person.id)} disabled={person.inactive && !form.installerIds.includes(person.id)} onChange={() => toggle('installerIds', person.id)} />{person.name}{person.inactive && ` · ${copy.inactive}`}</label>)}</div></div>)}{!internalPeople.length && <p className="text-xs text-[var(--zyllen-muted)]">{copy.noPeople}</p>}</div>
                    </fieldset>
                    <fieldset className="rounded-lg border border-[var(--zyllen-border)] p-3"><legend className="px-1 text-xs text-white">{copy.contractors}</legend><div className="max-h-48 space-y-2 overflow-y-auto">{peopleWithAssigned(choices.contractors, editing?.contractors).map(person => <label key={person.id} className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)]"><input type="checkbox" checked={form.contractorIds.includes(person.id)} disabled={person.inactive && !form.contractorIds.includes(person.id)} onChange={() => toggle('contractorIds', person.id)} />{person.name}{person.inactive && ` · ${copy.inactive}`}</label>)}</div></fieldset>
                </div>
                <div className="flex flex-wrap items-center gap-5 text-xs text-[var(--zyllen-muted)]"><Field label={copy.color}><input type="color" aria-label={copy.color} value={form.color} onChange={event => field('color', event.target.value)} className="h-9 w-16 rounded border border-[var(--zyllen-border)]" /></Field><label className="flex items-center gap-2"><input type="checkbox" checked={form.requiresTravel} disabled={!!editing?.trip} onChange={event => field('requiresTravel', event.target.checked)} />Terá viagem?</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.relevant} onChange={event => { field('relevant', event.target.checked); if (event.target.checked) field('urgency', 2); }} />{copy.relevant}</label></div>
                {form.requiresTravel && <fieldset className="space-y-3 rounded-lg border border-sky-400/30 p-3"><legend className="px-1 text-sm text-white">Viagem do projeto</legend><p className="text-xs text-[var(--zyllen-muted)]">O destino, endereço e período vêm dos campos do projeto. Informe a origem e escolha os participantes.</p><div className="grid gap-3 sm:grid-cols-2"><Field label="Cidade de origem"><Input autoComplete="off" required value={form.travelOriginCity} onChange={event => field('travelOriginCity', event.target.value)} /></Field><Field label="UF de origem"><Input autoComplete="off" required maxLength={2} value={form.travelOriginState} onChange={event => field('travelOriginState', event.target.value.toUpperCase())} /></Field></div><div className="max-h-36 space-y-2 overflow-y-auto">{travelPeople.map(person => <label key={person.id} className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)]"><input type="checkbox" checked={form.travelParticipantIds.includes(person.id)} disabled={person.inactive && !form.travelParticipantIds.includes(person.id)} onChange={() => toggle('travelParticipantIds', person.id)} />{person.name} · {person.roleName}</label>)}{!travelPeople.length && <p className="text-xs text-amber-200">Nenhum colaborador de nível Técnico ou superior disponível.</p>}</div></fieldset>}
                <Field label={copy.notes}><Textarea aria-label={copy.notes} autoComplete="off" value={form.notes} rows={3} maxLength={10000} onChange={event => field('notes', event.target.value)} /></Field>
                {error && <div role="alert" className="space-y-3 rounded-lg border border-red-400/50 p-3 text-sm text-red-200"><p>{error}</p>{error.includes('conflito de horário') && <label className="flex items-start gap-2"><input type="checkbox" checked={form.allowConflicts} onChange={event => field('allowConflicts', event.target.checked)} />{copy.allowConflicts}</label>}</div>}
            </fieldset>
        </form>{historyOpen && editing?.structureCycle && <div className="mt-5"><StructureHistory id={editing.structureCycle.structureId} name={editing.structureCycle.structureName} onClose={() => setHistoryOpen(false)} /></div>}</DialogBody><DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>{copy.cancel}</Button>{canSave && <Button type="submit" form="project-service-form" disabled={save.isPending}>{save.isPending ? copy.saving : copy.save}</Button>}</DialogFooter>
    </DialogContent></Dialog>;
}
