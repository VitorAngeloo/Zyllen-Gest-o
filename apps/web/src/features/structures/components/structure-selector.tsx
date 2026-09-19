"use client";
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { structureInputSchema, type ProjectServiceType, type StructureInput } from '@zyllen/shared';
import type { RequestOptions } from '@web/lib/api-client';
import { useAuth } from '@web/features/auth/context/auth-context';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { STRUCTURES_COPY as copy } from '@web/lib/brand-voice';
import { structureApi } from '../api/structure-api';

interface Props { companyId: string; type: ProjectServiceType; structureId?: string | null; cycleId?: string | null; options: RequestOptions; enabled: boolean; onChange: (structureId: string | null, cycleId: string | null) => void }
export function StructureSelector({ companyId, type, structureId, cycleId, options, enabled, onChange }: Props) {
    const { user, hasPermission } = useAuth();
    const client = useQueryClient(), mounted = useRef(true);
    const [creating, setCreating] = useState(false), [name, setName] = useState(''), [kind, setKind] = useState<StructureInput['kind']>('ROOM');
    const [error, setError] = useState('');
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    const list = useQuery({ queryKey: ['structures', 'options', user?.id, companyId], queryFn: ({ signal }) => structureApi.all(companyId, { ...options, signal }), enabled: enabled && !!companyId });
    const cycle = useQuery({ queryKey: ['structure-cycles', 'available', user?.id, structureId], queryFn: ({ signal }) => structureApi.available(structureId!, { ...options, signal }), enabled: enabled && !!structureId && type === 'REMOVAL', staleTime: 0 });
    const save = useMutation({ mutationFn: () => structureApi.create(structureInputSchema.parse({ companyId, name, kind }), options),
        onSuccess: async row => {
            await client.invalidateQueries({ queryKey: ['structures'] });
            if (mounted.current) { onChange(row.id, null); setCreating(false); setName(''); setError(''); }
        }, onError: (err: Error) => { if (mounted.current) setError(err.message); },
    });
    const cls = 'mt-1 w-full min-w-0 rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] px-3 py-2 text-sm text-white';
    return <div className="space-y-3 rounded-lg border border-[var(--zyllen-border)] p-3">
        <label className="block text-xs text-[var(--zyllen-muted)]">{copy.select}<select aria-label={copy.select} className={cls} disabled={!companyId || list.isPending || list.isError} value={structureId ?? ''} onChange={event => onChange(event.target.value || null, null)}>
            <option value="">{copy.noStructure}</option>{list.data?.map(item => <option key={item.id} value={item.id}>{item.name} · {copy.kinds[item.kind]}</option>)}
        </select></label>
        {list.isError || cycle.isError ? <div role="alert" className="text-xs text-red-200"><p>{copy.selectionFailed}</p><Button type="button" variant="outline" size="sm" onClick={() => { void list.refetch(); if (structureId && type === 'REMOVAL') void cycle.refetch(); }}>{copy.retry}</Button></div> : structureId && type === 'REMOVAL' ? <label className="block text-xs text-[var(--zyllen-muted)]">{copy.selectCycle}<select aria-label={copy.selectCycle} required className={cls} value={cycleId ?? ''} disabled={cycle.isPending} onChange={event => onChange(structureId, event.target.value || null)}>
            <option value="">{cycle.isPending ? copy.loading : cycle.data ? copy.chooseCycle : copy.noAvailableCycle}</option>{cycle.data && <option value={cycle.data.id}>{cycle.data.installation.projectName} · {cycle.data.installedAt ? new Date(cycle.data.installedAt).toLocaleString('pt-BR') : copy.missingDate}</option>}
        </select></label> : structureId ? <p className="text-xs text-[var(--zyllen-muted)]">{copy.newCycle}</p> : null}
        {enabled && companyId && hasPermission('schedule.create') && <Button type="button" variant="outline" size="sm" disabled={save.isPending} aria-expanded={creating} onClick={() => { setCreating(value => !value); setError(''); }}>{creating ? copy.cancel : copy.create}</Button>}
        {creating && <fieldset disabled={save.isPending} className="space-y-3 border-t border-[var(--zyllen-border)] pt-3">
            <p className="text-xs text-[var(--zyllen-muted)]">{copy.inlineDescription}</p>
            <label className="block text-xs text-[var(--zyllen-muted)]">{copy.name}<Input aria-label={copy.name} maxLength={200} value={name} onChange={event => { setName(event.target.value); setError(''); }} /></label>
            <label className="block text-xs text-[var(--zyllen-muted)]">{copy.kind}<select aria-label={copy.kind} className={cls} value={kind} onChange={event => setKind(event.target.value as StructureInput['kind'])}>{Object.entries(copy.kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            {error && <p role="alert" className="text-xs text-red-200">{error}</p>}
            <Button type="button" size="sm" disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>{save.isPending ? copy.saving : copy.inlineSave}</Button>
        </fieldset>}
    </div>;
}
