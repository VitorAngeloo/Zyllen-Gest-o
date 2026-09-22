"use client";
import { useState } from 'react';
import { useAuth } from '@web/features/auth/context/auth-context';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Skeleton } from '@web/components/ui/skeleton';
import { Select, SelectOption } from '@web/components/ui/select';
import { EmptyState, ListSectionHeader, WorkspaceBar, WorkspaceGroup } from '@web/components/ui/workspace';
import { PROJECT_SERVICE_COPY as copy, PROJECTS_AGENDA_COPY as workspaceCopy } from '@web/lib/brand-voice';
import StructuresScreen from '@web/features/structures/screens/structures-screen';
import { useProjectServices } from '../hooks/use-project-services';
import { ProjectServiceDialog } from './project-service-dialog';
import { ProjectMarkerSettings } from './project-marker-settings';
import { ProjectServiceTable } from './project-service-table';

export default function ProjectServicesPanel({ showHistory = false }: { showHistory?: boolean }) {
    const { hasPermission } = useAuth();
    const [page, setPage] = useState(1), [search, setSearch] = useState(''), [statusFilter, setStatusFilter] = useState(''), [type, setType] = useState('');
    const [dialog, setDialog] = useState<{ id?: string } | null>(null), [historyOpen, setHistoryOpen] = useState(showHistory);
    const [actionError, setActionError] = useState('');
    const params = new URLSearchParams({ page: String(page), limit: '50', ...(search ? { search } : {}), ...(statusFilter ? { status: statusFilter } : {}), ...(type ? { type } : {}) });
    const { list, choices, status } = useProjectServices(params);
    const canEdit = hasPermission('schedule.update'), canCreate = hasPermission('schedule.create');
    const records = list.data?.data ?? [];
    return <div className="space-y-5">
        <ListSectionHeader title={copy.title} count={list.data?.total ?? 0} description={copy.urgentFirst} actions={<><Button type="button" variant="outline" size="sm" aria-expanded={historyOpen} onClick={() => setHistoryOpen(value => !value)}>{historyOpen ? workspaceCopy.hideInstallationHistory : workspaceCopy.installationHistory}</Button>
            {canCreate && <Button type="button" disabled={!choices.data || choices.isError} onClick={() => setDialog({})}>{copy.create}</Button>}</>} />
        <WorkspaceBar className="sm:block">
            <WorkspaceGroup label="Filtrar projetos">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Input aria-label={copy.search} placeholder={copy.search} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
                    <Select aria-label={copy.statusFilter} value={statusFilter} onValueChange={value => { setStatusFilter(value); setPage(1); }}><SelectOption value="">{copy.allStatuses}</SelectOption>{Object.entries(copy.statuses).map(([value, label]) => <SelectOption key={value} value={value}>{label}</SelectOption>)}</Select>
                    <Select aria-label={copy.typeFilter} value={type} onValueChange={value => { setType(value); setPage(1); }}><SelectOption value="">{copy.allTypes}</SelectOption>{Object.entries(copy.types).map(([value, label]) => <SelectOption key={value} value={value}>{label}</SelectOption>)}</Select></div>
            </WorkspaceGroup>
        </WorkspaceBar>
        {canCreate && choices.data && <ProjectMarkerSettings markers={choices.data.markers} onCreated={async () => { await choices.refetch(); }} />}
        {actionError && <p role="alert" className="border-l-2 border-red-400 bg-red-500/5 px-4 py-3 text-sm text-red-200">{actionError}</p>}
        {(list.isError || choices.isError) && <div role="alert" className="border-l-2 border-red-400 bg-red-500/5 px-4 py-3 text-sm text-red-200"><p>{copy.loadError}</p><Button type="button" size="sm" variant="ghost" onClick={() => { void list.refetch(); void choices.refetch(); }}>{copy.retry}</Button></div>}
        {list.isLoading ? <div className="divide-y divide-white/10 border-y border-white/10">{Array.from({ length: 5 }, (_, index) => <div key={index} className="px-4 py-4"><Skeleton className="h-5 w-full max-w-md" /></div>)}</div> : records.length ? <ProjectServiceTable records={records} canEdit={canEdit} pending={status.isPending || !choices.data || choices.isError} onEdit={record => setDialog({ id: record.id })} onStatus={(record, value) => {
            setActionError(''); status.mutate({ id: record.id, status: value }, { onError: (error: Error) => setActionError(error.message) });
        }} /> : !list.isError && <EmptyState title={copy.empty} description={search || statusFilter || type ? 'Revise os filtros para consultar outros projetos.' : undefined} />}
        {list.data && list.data.total > list.data.limit && <nav aria-label="Paginação de projetos" className="flex items-center justify-end gap-3 text-xs text-[var(--zyllen-muted)]"><Button type="button" variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(value => value - 1)}>{copy.previous}</Button><span>{copy.page(page)}</span><Button type="button" variant="outline" size="sm" disabled={page * list.data.limit >= list.data.total} onClick={() => setPage(value => value + 1)}>{copy.next}</Button></nav>}
        {historyOpen && <StructuresScreen />}
        {dialog && <ProjectServiceDialog id={dialog.id} onClose={() => setDialog(null)} />}
    </div>;
}
