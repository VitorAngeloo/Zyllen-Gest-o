"use client";
import { useEffect, useState } from 'react';
import type { ProjectStatisticsQuery } from '@zyllen/shared';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { Select, SelectOption } from '@web/components/ui/select';
import { ListSectionHeader, WorkspaceBar, WorkspaceGroup } from '@web/components/ui/workspace';
import { PROJECTS_AGENDA_COPY as copy, PROJECT_DASHBOARD_COPY as projectCopy, PROJECT_SERVICE_COPY as serviceCopy, OPERATIONS_DASHBOARD_COPY as operationsCopy } from '@web/lib/brand-voice';
import { datePeriod, localCalendarDate, type DatePeriodPreset } from '@web/lib/date-period';
import { OperationsDashboardView } from '@web/features/trips/components/operations-dashboard-view';
import { useOperationsStatistics } from '@web/features/trips/hooks/use-operations-statistics';
import { PanelErrorBoundary } from '@web/features/panels/components/panel-error-boundary';
import { useProjectStatistics } from '../hooks/use-project-statistics';
import { ProjectDashboardView } from './project-dashboard-view';

export function ProjectsOverview() {
    const [now, setNow] = useState(() => Date.now()), [preset, setPreset] = useState<DatePeriodPreset>('30_DAYS');
    const [from, setFrom] = useState(() => localCalendarDate(Date.now())), [to, setTo] = useState(() => localCalendarDate(Date.now()));
    const [type, setType] = useState<ProjectStatisticsQuery['type']>('ALL');
    useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
    const period = datePeriod(preset, localCalendarDate(now), from, to), projects = useProjectStatistics(type, period), operations = useOperationsStatistics(period);
    return <div className="space-y-6">
        <WorkspaceBar className="items-start sm:items-start">
            <WorkspaceGroup label="Escopo dos indicadores" className="w-full max-w-3xl">
                <div className="flex flex-wrap items-end gap-3">
                    <label className="min-w-52 flex-1 text-xs text-[var(--zyllen-muted)]">{copy.overviewPeriod}
                        <Select aria-label={copy.overviewPeriod} className="mt-1" value={preset} onValueChange={value => setPreset(value as DatePeriodPreset)}>{Object.entries(projectCopy.presets).map(([value, label]) => <SelectOption key={value} value={value}>{label}</SelectOption>)}</Select>
                    </label>
                    <Button size="sm" variant="outline" disabled={!period || projects.isFetching || operations.isFetching} onClick={() => { void projects.refetch(); void operations.refetch(); }}>{projects.isFetching || operations.isFetching ? projectCopy.refreshing : projectCopy.refresh}</Button>
                </div>
                {preset === 'CUSTOM' && <div className="grid max-w-md grid-cols-2 gap-3"><label className="min-w-0 text-xs text-[var(--zyllen-muted)]">{projectCopy.from}<Input type="date" aria-label={projectCopy.from} className="mt-1 [color-scheme:dark]" value={from} onChange={event => setFrom(event.target.value)} /></label><label className="min-w-0 text-xs text-[var(--zyllen-muted)]">{projectCopy.to}<Input type="date" aria-label={projectCopy.to} className="mt-1 [color-scheme:dark]" value={to} onChange={event => setTo(event.target.value)} /></label></div>}
                <p className="text-xs text-[var(--zyllen-muted)]">{copy.overviewScope}</p>
                {period ? <p className="font-mono text-xs tabular-nums text-white/55">{projectCopy.range(new Date(period.start).toLocaleDateString('pt-BR'), new Date(Date.parse(period.end) - 1).toLocaleDateString('pt-BR'))}</p> : <p role="alert" className="text-sm text-amber-200">{projectCopy.invalidPeriod}</p>}
            </WorkspaceGroup>
        </WorkspaceBar>
        {period && <>
            <section aria-label={copy.overviewProjects} className="space-y-5 rounded-lg border border-white/10 bg-white/[0.018] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:p-5"><ListSectionHeader title={copy.overviewProjects} description={projectCopy.scope} actions={<label className="min-w-52 text-xs text-[var(--zyllen-muted)]">{projectCopy.type}<Select aria-label={projectCopy.type} className="mt-1" value={type} onValueChange={value => setType(value as ProjectStatisticsQuery['type'])}><SelectOption value="ALL">{projectCopy.allTypes}</SelectOption>{Object.entries(serviceCopy.types).map(([value, label]) => <SelectOption key={value} value={value}>{label}</SelectOption>)}</Select></label>} />
                <PanelErrorBoundary onRetry={() => { void projects.refetch(); }}><ProjectDashboardView data={projects.data} loading={projects.isLoading} failed={projects.isError} fetching={projects.isFetching} onRetry={() => { void projects.refetch(); }} /></PanelErrorBoundary></section>
            <section aria-label={copy.overviewTrips} className="space-y-5 rounded-lg border border-white/10 bg-white/[0.018] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:p-5"><ListSectionHeader title={copy.overviewTrips} description={operationsCopy.scope} />
                <PanelErrorBoundary onRetry={() => { void operations.refetch(); }}><OperationsDashboardView data={operations.data} loading={operations.isLoading} failed={operations.isError} fetching={operations.isFetching} onRetry={() => { void operations.refetch(); }} /></PanelErrorBoundary></section>
        </>}
    </div>;
}
