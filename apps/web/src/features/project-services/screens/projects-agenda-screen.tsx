"use client";
import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ClipboardList, LayoutDashboard, MapPin, Users } from 'lucide-react';
import { useAuth } from '@web/features/auth/context/auth-context';
import { Skeleton } from '@web/components/ui/skeleton';
import { PageHeader } from '@web/components/ui/page-header';
import { WorkspaceBar, WorkspaceGroup } from '@web/components/ui/workspace';
import { PROJECTS_AGENDA_COPY as copy, PROJECT_SERVICE_COPY as projectCopy } from '@web/lib/brand-voice';
import { ScheduleWorkspace } from '@web/features/schedule/components/schedule-workspace';
import TripsScreen from '@web/features/trips/screens/trips-screen';
import ProjectServicesPanel from '../components/project-services-panel';
import { ProjectsOverview } from '../components/projects-overview';

const sections = [{ id: 'visao-geral', icon: LayoutDashboard }, { id: 'projetos', icon: ClipboardList }, { id: 'agenda', icon: CalendarDays }, { id: 'viagens', icon: MapPin }, { id: 'equipe', icon: Users }] as const;
const navigationGroups = [
    { label: 'Planejar', sections: ['visao-geral', 'projetos', 'agenda'] },
    { label: 'Executar', sections: ['viagens', 'equipe'] },
] as const;
type Section = typeof sections[number]['id'];
const legacySections: Record<string, Section> = {
    '/dashboard/agenda': 'agenda', '/dashboard/viagens': 'viagens', '/dashboard/operacoes': 'visao-geral',
    '/dashboard/projetos/painel': 'visao-geral', '/dashboard/projetos/estruturas': 'projetos',
};

function Workspace() {
    const { user, userType, isLoading, hasPermission } = useAuth();
    const pathname = usePathname();
    const params = useSearchParams();
    const router = useRouter();
    const requested = params.get('aba');
    const legacySection = legacySections[pathname];
    const section: Section = sections.some(item => item.id === requested) ? requested as Section : legacySection ?? 'visao-geral';
    const view = params.get('visao') === 'lista' || (!params.has('visao') && pathname === '/dashboard/agenda') ? 'agendamentos' : 'calendario';
    const history = params.get('historico') === '1' || pathname === '/dashboard/projetos/estruturas';
    useEffect(() => {
        if (!legacySection) return;
        const query = new URLSearchParams(params.toString());
        query.set('aba', section);
        if (section === 'agenda') query.set('visao', view === 'agendamentos' ? 'lista' : 'calendario');
        else query.delete('visao');
        if (history) query.set('historico', '1');
        router.replace(`/dashboard/projetos?${query}`, { scroll: false });
    }, [legacySection, section, view, history, params, router]);
    function navigate(next: Section, nextView = view) {
        const query = new URLSearchParams(params.toString());
        query.set('aba', next);
        query.delete('historico');
        if (next === 'agenda') query.set('visao', nextView === 'agendamentos' ? 'lista' : 'calendario');
        else query.delete('visao');
        router.push(`/dashboard/projetos?${query}`, { scroll: false });
    }
    if (isLoading) return <Skeleton className="h-48 rounded-xl" />;
    if (!user || userType !== 'internal' || !hasPermission('schedule.view')) return <p className="text-sm text-[var(--zyllen-muted)]">{projectCopy.noAccess}</p>;
    return <div className="min-w-0 space-y-5">
        <PageHeader eyebrow="Operação" title={copy.title} description={copy.description} />
        <div role="tablist" aria-label={copy.tabsLabel}>
            <WorkspaceBar className="items-start sm:items-start sm:justify-start sm:gap-16">
                {navigationGroups.map(group => <WorkspaceGroup key={group.label} label={group.label}>
                    <div className="flex max-w-full flex-wrap gap-x-5 gap-y-1">
                        {sections.filter(item => (group.sections as readonly string[]).includes(item.id)).map(({ id, icon: Icon }) => {
                            const index = sections.findIndex(item => item.id === id);
                            return <button key={id} type="button" role="tab" id={`workspace-tab-${id}`} aria-controls={`workspace-panel-${id}`}
                                aria-selected={section === id} tabIndex={section === id ? 0 : -1} onClick={() => navigate(id, 'calendario')}
                                onKeyDown={event => {
                                    const next = event.key === 'ArrowRight' ? (index + 1) % sections.length : event.key === 'ArrowLeft' ? (index + sections.length - 1) % sections.length
                                        : event.key === 'Home' ? 0 : event.key === 'End' ? sections.length - 1 : null;
                                    if (next !== null) { event.preventDefault(); document.getElementById(`workspace-tab-${sections[next].id}`)?.focus(); navigate(sections[next].id, 'calendario'); }
                                }} className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 py-1.5 text-sm font-medium transition-colors ${section === id ? 'border-[var(--zyllen-highlight)] text-white' : 'border-transparent text-[var(--zyllen-muted)] hover:border-white/20 hover:text-white'}`}>
                                <Icon className={`h-3.5 w-3.5 shrink-0 ${section === id ? 'text-[var(--zyllen-highlight)]' : 'text-white/35'}`} />{copy.sections[id]}</button>;
                        })}
                    </div>
                </WorkspaceGroup>)}
            </WorkspaceBar>
        </div>
        <section role="tabpanel" id={`workspace-panel-${section}`} aria-labelledby={`workspace-tab-${section}`} tabIndex={0} className="min-w-0">
            {section === 'visao-geral' ? <ProjectsOverview /> : section === 'projetos' ? <ProjectServicesPanel key={String(history)} showHistory={history} />
                : section === 'viagens' ? <TripsScreen /> : <ScheduleWorkspace key={section} section={section} view={view} onViewChange={next => navigate('agenda', next)} />}
        </section>
    </div>;
}

export default function ProjectsAgendaScreen() {
    return <Suspense fallback={<p role="status" className="text-sm text-[var(--zyllen-muted)]">{copy.loading}</p>}><Workspace /></Suspense>;
}
