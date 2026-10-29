"use client";
import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, MapPin } from 'lucide-react';
import { canEnterProjectPlanning, PROJECT_PLANNING_ACCESS } from '@zyllen/shared';
import { useAuth } from '@web/features/auth/context/auth-context';
import { PageHeader } from '@web/components/ui/page-header';
import { Skeleton } from '@web/components/ui/skeleton';
import { PROJECTS_AGENDA_COPY as copy, PROJECT_SERVICE_COPY } from '@web/lib/brand-voice';
import TripsScreen from '@web/features/trips/screens/trips-screen';
import { ChronogramWorkspace } from '../components/chronogram-workspace';
import { ChronogramOverlay } from '../components/chronogram-overlay';
import { TripDialog } from '@web/features/trips/components/trip-dialog';
import styles from '../components/chronogram.module.css';
import type { ChronogramFilters, ChronogramView } from '../types/chronogram.types';
import { chronogramUrl, readChronogramLocation } from '../utils/chronogram-navigation';

function PlanningWorkspace() {
    const { user, userType, isLoading, hasPermission } = useAuth();
    const pathname = usePathname(), params = useSearchParams(), router = useRouter();
    const serialized = params.toString();
    const location = useMemo(() => readChronogramLocation(pathname, new URLSearchParams(serialized), new Date()), [pathname, serialized]);
    const canonical = chronogramUrl(location.section, location.view, location.filters, location.history);
    useEffect(() => { if (`${pathname}?${serialized}` !== canonical) router.replace(canonical, { scroll: false }); }, [pathname, serialized, canonical, router]);
    const navigate = useCallback((view: ChronogramView, patch?: Partial<ChronogramFilters>) => {
        const url = chronogramUrl('cronograma', view, { ...location.filters, ...patch }, location.history);
        if (patch) router.replace(url, { scroll: false }); else router.push(url, { scroll: false });
    }, [location.filters, location.history, router]);
    if (isLoading) return <Skeleton className="h-48 rounded-lg" />;
    if (!user || !canEnterProjectPlanning(user) || userType !== 'internal' || !hasPermission(PROJECT_PLANNING_ACCESS.view)) return <p className="text-sm text-[var(--zyllen-muted)]">{PROJECT_SERVICE_COPY.noAccess}</p>;
    const sections = [{ id: 'cronograma', label: 'Cronograma', icon: CalendarDays }, { id: 'viagens', label: 'Viagens', icon: MapPin }];
    return <div className="min-w-0 space-y-5">
        <PageHeader eyebrow="Operação" title={copy.title} description={copy.description} />
        <div role="tablist" aria-label="Seções de cronograma e planejamento" className={styles.sections}>
            {sections.map((section, index) => <button type="button" role="tab" key={section.id} id={`planning-tab-${section.id}`} aria-controls={`planning-panel-${section.id}`} aria-selected={location.section === section.id}
                tabIndex={location.section === section.id ? 0 : -1} className={styles.sectionTab}
                onClick={() => router.push(chronogramUrl(section.id, location.view, location.filters, location.history), { scroll: false })} onKeyDown={event => {
                    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : ['ArrowLeft', 'ArrowRight'].includes(event.key) ? (index + 1) % 2 : null;
                    if (next === null) return;
                    event.preventDefault(); document.getElementById(`planning-tab-${sections[next].id}`)?.focus(); router.push(chronogramUrl(sections[next].id, location.view, location.filters, location.history), { scroll: false });
                }}><section.icon size={16} />{section.label}</button>)}
        </div>
        <section role="tabpanel" id={`planning-panel-${location.section}`} aria-labelledby={`planning-tab-${location.section}`} tabIndex={0}>
            {location.section === 'viagens' ? <TripsScreen renderDialog={props => <ChronogramOverlay onClose={props.onClose}>{close => <TripDialog {...props} onClose={close} />}</ChronogramOverlay>} /> : <ChronogramWorkspace key={user.id} filters={location.filters} view={location.view} history={location.history} onNavigate={navigate} />}
        </section>
    </div>;
}
export default function PlanningScreen() {
    return <Suspense fallback={<p role="status">{copy.loading}</p>}><PlanningWorkspace /></Suspense>;
}
