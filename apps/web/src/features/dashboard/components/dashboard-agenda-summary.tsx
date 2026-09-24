"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { SCHEDULE_TYPE_LABELS } from '@zyllen/shared';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { scheduleApi } from '@web/features/schedule/api/schedule-api';
import type { Schedule } from '@web/features/schedule/types/schedule.types';
import { ProjectServiceDialog } from '@web/features/project-services/components/project-service-dialog';
import { TripDialog } from '@web/features/trips/components/trip-dialog';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@web/components/ui/dialog';
import { useDialogFocus } from '@web/lib/use-dialog-focus';
import { DASHBOARD_OPERATIONAL_COPY as copy } from '@web/lib/brand-voice';
import { DashboardSummaryCard } from './dashboard-summary-card';

function ScheduleDetails({ record, onClose }: { record: Schedule; onClose: () => void }) {
    const ref = useRef<HTMLDivElement>(null), titleId = useId();
    useDialogFocus(ref, onClose);
    return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent ref={ref} onClose={onClose} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <DialogHeader><DialogTitle id={titleId}>{record.title}</DialogTitle></DialogHeader><DialogBody className="space-y-3 text-sm text-[var(--zyllen-muted)]">
            <p>{new Date(record.startDate).toLocaleString('pt-BR')} — {new Date(record.endDate).toLocaleString('pt-BR')}</p>
            <p>{record.companyName}{record.projectName ? ` · ${record.projectName}` : ''}</p><p>{record.installers.map(item => item.name).join(', ') || copy.noAssignees}</p>
            {record.address && <p>{record.address}</p>}{record.notes && <p className="whitespace-pre-wrap break-words">{record.notes}</p>}
        </DialogBody></DialogContent></Dialog>;
}
export function DashboardAgendaSummary({ compact = false }: { compact?: boolean }) {
    const { user } = useAuth(), options = useAuthedFetch();
    const [now, setNow] = useState(Date.now), [selected, setSelected] = useState<Schedule | null>(null);
    useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
    const query = useQuery({ queryKey: ['schedules', 'dashboard-upcoming', user?.id], queryFn: ({ signal }) => scheduleApi.upcoming(new Date(now).toISOString(), { ...options, signal }), enabled: !!user, refetchInterval: 30_000 });
    return <DashboardSummaryCard id="agenda" title={copy.agenda} icon={CalendarDays} href="/dashboard/projetos?aba=agenda&visao=calendario" linkLabel={copy.openAgenda}
        loading={query.isLoading} failed={query.isError} hasData={!!query.data} onRetry={() => { void query.refetch(); }}>
        {query.data && <><p className="mb-3 text-xs text-[var(--zyllen-muted)]">{copy.agendaDescription}</p>{query.data.data.length ? <ul className={`grid grid-cols-1 gap-3 ${compact ? '' : 'md:grid-cols-2 xl:grid-cols-3'}`}>{query.data.data.map(item => <li key={item.id}><button type="button" data-upcoming-schedule={item.id} onClick={() => setSelected(item)}
            className="h-full w-full rounded-md border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] p-3 text-left hover:border-[var(--zyllen-highlight)]/40">
            <span className="block text-xs font-medium text-[var(--zyllen-highlight)]">{new Date(item.startDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {SCHEDULE_TYPE_LABELS[item.type as keyof typeof SCHEDULE_TYPE_LABELS] ?? item.type}</span>
            <span className="mt-2 block break-words text-sm font-semibold text-white">{item.projectName ?? item.title}</span><span className="mt-1 block break-words text-xs text-[var(--zyllen-muted)]">{item.companyName ?? item.title}</span>
            <span className="mt-2 block break-words text-xs text-[var(--zyllen-muted)]">{[...item.installers.map(person => person.name), ...(item.projectService?.contractors.map(person => person.user.name) ?? []), ...(item.trip?.contractors?.map(person => person.name) ?? [])].join(', ') || copy.noAssignees}</span>
        </button></li>)}</ul> : <p className="py-3 text-sm text-[var(--zyllen-muted)]">{copy.agendaEmpty}</p>}</>}
        {selected?.projectService ? <ProjectServiceDialog id={selected.projectService.id} onClose={() => setSelected(null)} /> : selected?.trip ? <TripDialog id={selected.trip.id} onClose={() => setSelected(null)} /> : selected && <ScheduleDetails record={selected} onClose={() => setSelected(null)} />}
    </DashboardSummaryCard>;
}
