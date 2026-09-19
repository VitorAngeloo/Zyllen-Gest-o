"use client";
import { useAuth } from '@web/features/auth/context/auth-context';
import { useQueryClient } from '@tanstack/react-query';
import { DASHBOARD_OPERATIONAL_COPY as copy } from '@web/lib/brand-voice';
import { PanelErrorBoundary } from '@web/features/panels/components/panel-error-boundary';
import { DashboardStockSummary } from './dashboard-stock-summary';
import { DashboardProjectSummary } from './dashboard-project-summary';
import { DashboardTripsSummary } from './dashboard-trips-summary';
import { DashboardAgendaSummary } from './dashboard-agenda-summary';
import { DashboardVehiclesSummary } from './dashboard-vehicles-summary';

export function DashboardOperationalOverview() {
    const { user, userType, hasPermission } = useAuth();
    const client = useQueryClient();
    const retry = () => { void client.invalidateQueries({ queryKey: ['panel-statistics', `account:${user?.id}`] }); };
    const stock = hasPermission('inventory.view'), schedule = hasPermission('schedule.view');
    if (!user || userType !== 'internal' || (!stock && !schedule)) return null;
    return <section aria-label={copy.title} className="space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4"><div><h2 className="text-xl font-semibold tracking-tight text-white">{copy.title}</h2><p className="mt-1 text-sm leading-relaxed text-[var(--zyllen-muted)]">{copy.description}</p></div><span className="text-[11px] text-white/40">{copy.refresh}</span></header>
        <div data-dashboard-overview className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            {stock && <PanelErrorBoundary onRetry={retry}><DashboardStockSummary /></PanelErrorBoundary>}
            {schedule && <><PanelErrorBoundary onRetry={retry}><DashboardProjectSummary /></PanelErrorBoundary><PanelErrorBoundary onRetry={retry}><DashboardTripsSummary /></PanelErrorBoundary>
                <PanelErrorBoundary onRetry={() => { void client.invalidateQueries({ queryKey: ['vehicles'] }); }}><DashboardVehiclesSummary /></PanelErrorBoundary></>}
        </div>
        {schedule && <PanelErrorBoundary onRetry={() => { void client.invalidateQueries({ queryKey: ['schedules', 'dashboard-upcoming'] }); }}><DashboardAgendaSummary /></PanelErrorBoundary>}
    </section>;
}
