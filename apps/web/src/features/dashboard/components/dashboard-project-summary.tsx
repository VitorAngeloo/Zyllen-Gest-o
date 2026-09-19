"use client";
import { useState } from 'react';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { DASHBOARD_OPERATIONAL_COPY as copy, PROJECT_SERVICE_COPY as projects } from '@web/lib/brand-voice';
import { ProjectServiceDialog } from '@web/features/project-services/components/project-service-dialog';
import { useDashboardStatistics } from '../hooks/use-dashboard-statistics';
import { DashboardSummaryCard, DashboardMetric } from './dashboard-summary-card';

export function DashboardProjectSummary() {
    const query = useDashboardStatistics('projetos'), data = query.data?.view === 'projetos' ? query.data.data : undefined;
    const [selected, setSelected] = useState<string | null>(null);
    return <DashboardSummaryCard id="projetos" title={copy.projects} icon={ClipboardList} href="/dashboard/projetos?aba=projetos" linkLabel={copy.openProjects}
        loading={query.isLoading} failed={query.isError} hasData={!!data} onRetry={() => { void query.refetch(); }}>
        {data && <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">{(['active', 'pending', 'scheduled', 'inProgress'] as const).map(id => <DashboardMetric key={id} domain="project" id={id} label={copy[id]} value={data.current[id]} />)}</div>
            {data.highlights.length > 0 ? <div><h4 className="mb-2 text-xs font-medium text-[var(--zyllen-muted)]">{copy.priorities}</h4><ul className="space-y-2">{data.highlights.slice(0, 3).map(item => <li key={item.id}>
                <button type="button" onClick={() => setSelected(item.id)} className="w-full min-w-0 rounded-lg border border-[var(--zyllen-border)] p-2 text-left hover:border-[var(--zyllen-highlight)]/40">
                    <span className="block break-words text-sm font-medium text-white">{item.name}</span><span className="mt-1 block break-words text-xs text-[var(--zyllen-muted)]">{item.companyName} · {projects.types[item.type]} · {projects.statuses[item.status]}</span>
                </button></li>)}</ul></div> : <p className="text-sm text-[var(--zyllen-muted)]">{data.current.total === 0 ? copy.projectsEmpty : data.current.active === 0 ? copy.projectsInactive : copy.projectsNoHighlights}</p>}
            <Link href="/dashboard/projetos?aba=visao-geral" className="inline-block text-xs text-[var(--zyllen-highlight)]">{copy.projectDashboard}</Link>
        </div>}
        {selected && <ProjectServiceDialog id={selected} onClose={() => setSelected(null)} />}
    </DashboardSummaryCard>;
}
