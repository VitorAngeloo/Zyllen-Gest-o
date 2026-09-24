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
import { DashboardSectionHeader } from './dashboard-section-header';

export function DashboardOperationalOverview({ compact = false }: { compact?: boolean }) {
    const { user, userType, hasPermission } = useAuth();
    const client = useQueryClient();
    const retry = () => { void client.invalidateQueries({ queryKey: ['panel-statistics', `account:${user?.id}`] }); };
    const stock = hasPermission('inventory.view'), schedule = hasPermission('schedule.view'), vehicles = hasPermission('vehicles.view') || schedule;
    if (!user || userType !== 'internal' || (!stock && !schedule && !vehicles)) return null;
    return <section data-dashboard-zone="operation" aria-label={copy.title} data-compact={compact} className="min-w-0 space-y-5">
        <DashboardSectionHeader index="02" eyebrow={copy.operationEyebrow} title={copy.title} description={copy.description} meta={copy.refresh} />
        <div data-dashboard-overview className={compact ? "space-y-6" : "space-y-8"}>
            {schedule && <section aria-label={copy.planningTitle} className="space-y-4">
                <header className="grid gap-1 border-l-2 border-[var(--zyllen-highlight)]/70 pl-3">
                    <h3 className="text-sm font-semibold text-white">{copy.planningTitle}</h3>
                    <p className="text-xs leading-relaxed text-[var(--zyllen-muted)]">{copy.planningDescription}</p>
                </header>
                <div className={`grid grid-cols-1 items-start gap-4 ${compact ? '' : 'xl:grid-cols-2'}`}>
                    <PanelErrorBoundary onRetry={retry}><DashboardProjectSummary /></PanelErrorBoundary>
                    <PanelErrorBoundary onRetry={retry}><DashboardTripsSummary /></PanelErrorBoundary>
                </div>
                <PanelErrorBoundary onRetry={() => { void client.invalidateQueries({ queryKey: ['schedules', 'dashboard-upcoming'] }); }}><DashboardAgendaSummary compact={compact} /></PanelErrorBoundary>
            </section>}
            {(stock || vehicles) && <section aria-label={copy.resourcesTitle} className="space-y-4">
                <header className="grid gap-1 border-l-2 border-white/20 pl-3">
                    <h3 className="text-sm font-semibold text-white">{copy.resourcesTitle}</h3>
                    <p className="text-xs leading-relaxed text-[var(--zyllen-muted)]">{copy.resourcesDescription}</p>
                </header>
                <div className={`grid grid-cols-1 items-start gap-4 ${compact ? '' : 'xl:grid-cols-2'}`}>
                    {stock && <PanelErrorBoundary onRetry={retry}><DashboardStockSummary /></PanelErrorBoundary>}
                    {vehicles && <PanelErrorBoundary onRetry={() => { void client.invalidateQueries({ queryKey: ['vehicles'] }); }}><DashboardVehiclesSummary /></PanelErrorBoundary>}
                </div>
            </section>}
        </div>
    </section>;
}
