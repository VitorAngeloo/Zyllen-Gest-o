"use client";
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { structureInputSchema, type StructureInput, type StructureRecord } from '@zyllen/shared';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Skeleton } from '@web/components/ui/skeleton';
import { STRUCTURES_COPY as copy } from '@web/lib/brand-voice';
import { projectServiceApi } from '@web/features/project-services/api/project-service-api';
import { ProjectServiceDialog } from '@web/features/project-services/components/project-service-dialog';
import { StructureHistory } from '../components/structure-history';
import { structureApi } from '../api/structure-api';

export default function StructuresScreen() {
    const { user, userType, isLoading, hasPermission } = useAuth();
    const options = useAuthedFetch(), client = useQueryClient();
    const enabled = !!user && userType === 'internal' && hasPermission('schedule.view'), canCreate = enabled && hasPermission('schedule.create');
    const [companyId, setCompanyId] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(1);
    const [selected, setSelected] = useState<StructureRecord>(), [creating, setCreating] = useState(false), [error, setError] = useState('');
    const [serviceId, setServiceId] = useState<string>();
    const [form, setForm] = useState<StructureInput>({ companyId: '', name: '', kind: 'ROOM' });
    const choices = useQuery({ queryKey: ['project-service-options', user?.id], queryFn: ({ signal }) => projectServiceApi.options({ ...options, signal }), enabled });
    const query = useQuery({ queryKey: ['structures', 'list', user?.id, companyId, search, page], queryFn: ({ signal }) => structureApi.list(new URLSearchParams({ ...(companyId ? { companyId } : {}), ...(search.trim() ? { search: search.trim() } : {}), page: String(page), limit: '50' }), { ...options, signal }), enabled, refetchInterval: 30_000 });
    const save = useMutation({ mutationFn: () => structureApi.create(structureInputSchema.parse(form), options), onSuccess: async row => {
        await client.invalidateQueries({ queryKey: ['structures'] }); setForm({ companyId: '', name: '', kind: 'ROOM' }); setCreating(false); setSelected(row); setError('');
    }, onError: (err: Error) => setError(err.message) });
    if (isLoading) return <Skeleton className="h-48 rounded-xl" />;
    if (!enabled) return <p>{copy.noAccess}</p>;
    const cls = 'w-full min-w-0 rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] px-3 py-2 text-sm text-white';
    return <div className="space-y-5 rounded-xl border border-[var(--zyllen-border)] p-4"><header className="space-y-3"><h2 className="text-lg font-semibold text-white">{copy.title}</h2><p className="text-sm text-[var(--zyllen-muted)]">{copy.description}</p>{canCreate && <Button size="sm" disabled={!choices.data || choices.isError} onClick={() => { setCreating(value => !value); setError(''); }}>{creating ? copy.cancel : copy.create}</Button>}</header>
        {choices.isError && <div role="alert" className="text-sm text-red-200"><p>{copy.failed}</p><Button size="sm" variant="outline" onClick={() => { void choices.refetch(); }}>{copy.retry}</Button></div>}
        {creating && canCreate && <form aria-label={copy.create} className="space-y-4 rounded-xl border border-[var(--zyllen-border)] p-4" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
            <fieldset disabled={save.isPending} className="grid gap-3 sm:grid-cols-3"><label className="space-y-1 text-xs text-[var(--zyllen-muted)]">{copy.company}<select aria-label={copy.company} className={cls} required value={form.companyId} onChange={event => setForm(value => ({ ...value, companyId: event.target.value }))}><option value="">{copy.chooseCompany}</option>{choices.data?.companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
                <label className="space-y-1 text-xs text-[var(--zyllen-muted)]">{copy.name}<Input aria-label={copy.name} autoFocus required maxLength={200} value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} /></label>
                <label className="space-y-1 text-xs text-[var(--zyllen-muted)]">{copy.kind}<select aria-label={copy.kind} className={cls} value={form.kind} onChange={event => setForm(value => ({ ...value, kind: event.target.value as StructureInput['kind'] }))}>{Object.entries(copy.kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </fieldset>{error && <p role="alert" className="text-sm text-red-200">{error}</p>}<Button type="submit" disabled={save.isPending || !choices.data || choices.isError}>{save.isPending ? copy.saving : copy.save}</Button>
        </form>}
        <div className="grid gap-3 sm:grid-cols-2"><Input aria-label={copy.search} placeholder={copy.search} maxLength={200} value={search} onChange={event => { setSearch(event.target.value); setPage(1); setSelected(undefined); }} /><select aria-label={copy.company} className={cls} value={companyId} onChange={event => { setCompanyId(event.target.value); setPage(1); setSelected(undefined); }}><option value="">{copy.allCompanies}</option>{choices.data?.companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>
        {query.isError && <div role="alert" className="space-y-2 text-sm text-red-200"><p>{copy.failed}</p><Button size="sm" variant="outline" onClick={() => { void query.refetch(); }}>{copy.retry}</Button></div>}
        {!query.data ? query.isLoading && <p role="status">{copy.loading}</p> : query.data.data.length === 0 ? <p>{copy.empty}</p> : <div className="overflow-x-auto rounded-xl border border-[var(--zyllen-border)]"><table className="w-full text-left text-sm"><thead className="text-xs text-[var(--zyllen-muted)]"><tr>{[copy.name, copy.company, copy.kind, copy.cycles].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{query.data.data.map(row => <tr key={row.id} className="border-t border-[var(--zyllen-border)]"><td className="p-3 text-white">{row.name}</td><td className="p-3">{row.company.name}</td><td className="p-3">{copy.kinds[row.kind]}</td><td className="p-3"><Button size="sm" variant="outline" aria-label={`${copy.history}: ${row.name}`} onClick={() => setSelected(row)}>{copy.history}</Button></td></tr>)}</tbody></table></div>}
        {query.data && query.data.total > 50 && <nav className="flex flex-wrap items-center justify-between gap-2 text-xs"><Button size="sm" variant="outline" disabled={page === 1 || query.isFetching} onClick={() => setPage(value => value - 1)}>{copy.previous}</Button><span>{copy.page(page, Math.ceil(query.data.total / 50))}</span><Button size="sm" variant="outline" disabled={page * 50 >= query.data.total || query.isFetching} onClick={() => setPage(value => value + 1)}>{copy.next}</Button></nav>}
        {selected && <StructureHistory key={selected.id} id={selected.id} name={selected.name} onClose={() => setSelected(undefined)} onOpenProject={setServiceId} />}
        {serviceId && <ProjectServiceDialog id={serviceId} onClose={() => setServiceId(undefined)} />}
    </div>;
}
