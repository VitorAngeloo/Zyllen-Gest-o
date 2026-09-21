"use client";
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PanelId } from '@zyllen/shared';
import { datePeriod, localCalendarDate } from '@web/lib/date-period';
import { MONITORING_PANEL_COPY as copy } from '@web/lib/brand-voice';
import { Button } from '@web/components/ui/button';
import { ProjectDashboardView } from '@web/features/project-services/components/project-dashboard-view';
import { OperationsDashboardView } from '@web/features/trips/components/operations-dashboard-view';
import { InventoryDashboardView } from '@web/features/inventory/components/inventory-dashboard-view';
import type { PanelReader } from '../api/panel-api';
import { MirrorStatistics } from './mirror-statistics';
export function PanelStatisticsView({ view, reader, mirror = false, slide = 0 }: { view: Exclude<PanelId, 'atendimentos'>; reader: PanelReader; mirror?: boolean; slide?: number }) {
    const [now, setNow] = useState(Date.now);
    useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
    const period = view === 'estoque' ? null : datePeriod('30_DAYS', localCalendarDate(now), '', '');
    const query = useQuery({ queryKey: ['panel-statistics', reader.key, view, period?.start, period?.end], queryFn: ({ signal }) => reader.statistics({ view, source: 'ALL', ...(period ?? {}) }, signal), refetchInterval: 30_000 });
    const retry = () => { void query.refetch(); }, props = { loading: query.isLoading, failed: query.isError, fetching: query.isFetching, onRetry: retry };
    if (mirror) return <MirrorStatistics {...props} result={query.data?.view === view ? query.data : undefined} slide={slide} />;
    if (view === 'projetos') return <ProjectDashboardView {...props} data={query.data?.view === view ? query.data.data : undefined} />;
    if (view === 'operacoes') return <OperationsDashboardView {...props} data={query.data?.view === view ? query.data.data : undefined} />;
    return <>{query.isError && <div role="alert" className="space-y-2 text-sm text-red-200"><p>{query.data ? copy.stale : copy.failure}</p><Button variant="outline" size="sm" onClick={retry}>{copy.retry}</Button></div>}{query.data?.view === 'estoque' ? <InventoryDashboardView data={query.data.data} /> : query.isLoading ? <p role="status">{copy.loading}</p> : null}</>;
}
