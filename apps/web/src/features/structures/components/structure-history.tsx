"use client";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { Button } from '@web/components/ui/button';
import { STRUCTURES_COPY as copy, PROJECT_SERVICE_COPY as projectCopy } from '@web/lib/brand-voice';
import { structureApi } from '../api/structure-api';

export function StructureHistory({ id, name, onClose, onOpenProject }: { id: string; name: string; onClose: () => void; onOpenProject?: (id: string) => void }) {
    const { user, userType, hasPermission } = useAuth();
    const options = useAuthedFetch();
    const [page, setPage] = useState(1);
    const query = useQuery({ queryKey: ['structure-cycles', 'history', user?.id, id, page], queryFn: ({ signal }) => structureApi.cycles(id, page, { ...options, signal }), enabled: !!user && userType === 'internal' && hasPermission('schedule.view'), refetchInterval: 30_000 });
    const date = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR') : copy.missingDate;
    return <section aria-label={`${copy.cycles}: ${name}`} className="space-y-4 rounded-xl border border-[var(--zyllen-border)] p-4">
        <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-white">{name} · {copy.cycles}</h2><Button variant="outline" size="sm" onClick={onClose}>{copy.closeHistory}</Button></header>
        <p className="text-xs text-[var(--zyllen-muted)]">{copy.daysContext}</p>
        {query.isError && <div role="alert" className="space-y-2 text-sm text-red-200"><p>{copy.historyFailed}</p><Button size="sm" variant="outline" onClick={() => { void query.refetch(); }}>{copy.retry}</Button></div>}
        {!query.data ? query.isLoading && <p role="status">{copy.loading}</p> : query.data.data.length === 0 ? <p className="text-sm text-[var(--zyllen-muted)]">{copy.noCycles}</p> : <div className="space-y-3">{query.data.data.map(cycle => <article key={cycle.id} className="space-y-3 rounded-lg border border-[var(--zyllen-border)] p-4 text-sm">
            <p className="font-medium text-white">{copy.states[cycle.status]}</p>
            <div><p className="text-xs text-[var(--zyllen-muted)]">{copy.installation}</p>{onOpenProject ? <button type="button" className="text-left text-[var(--zyllen-highlight)] underline" onClick={() => onOpenProject(cycle.installation.id)}>{cycle.installation.projectName}</button> : <span className="text-white">{cycle.installation.projectName}</span>}<span className="ml-2 text-xs text-[var(--zyllen-muted)]">{projectCopy.statuses[cycle.installation.status as keyof typeof projectCopy.statuses] ?? cycle.installation.status}</span></div>
            <div><p className="text-xs text-[var(--zyllen-muted)]">{copy.removal}</p>{cycle.removals.length ? <ul className="space-y-1">{cycle.removals.map(item => <li key={item.id}>{onOpenProject ? <button type="button" className="text-left text-[var(--zyllen-highlight)] underline" onClick={() => onOpenProject(item.id)}>{item.projectName}</button> : <span className="text-white">{item.projectName}</span>}<span className="ml-2 text-xs text-[var(--zyllen-muted)]">{projectCopy.statuses[item.status as keyof typeof projectCopy.statuses] ?? item.status}</span></li>)}</ul> : <p>{copy.noRemoval}</p>}</div>
            <dl className="grid grid-cols-1 gap-3 text-[var(--zyllen-muted)] sm:grid-cols-3"><div><dt className="text-xs">{copy.installed}</dt><dd className="mt-1 text-white">{cycle.installedAt ? date(cycle.installedAt) : cycle.status === 'PLANNED' ? copy.planned : copy.missingDate}</dd></div><div><dt className="text-xs">{copy.removed}</dt><dd className="mt-1 text-white">{cycle.removedAt ? date(cycle.removedAt) : cycle.status === 'INSTALLED' ? copy.notRemoved : '—'}</dd></div><div><dt className="text-xs">{copy.duration}</dt><dd className="mt-1 text-white">{cycle.durationDays ?? '—'}</dd></div></dl>
        </article>)}</div>}
        {query.data && query.data.total > 20 && <nav aria-label={copy.cycles} className="flex flex-wrap items-center justify-between gap-2 text-xs"><Button size="sm" variant="outline" disabled={page === 1 || query.isFetching} onClick={() => setPage(value => value - 1)}>{copy.previous}</Button><span>{copy.page(page, Math.ceil(query.data.total / 20))}</span><Button size="sm" variant="outline" disabled={page * 20 >= query.data.total || query.isFetching} onClick={() => setPage(value => value + 1)}>{copy.next}</Button></nav>}
    </section>;
}
