"use client";
import Link from 'next/link';
import { Package } from 'lucide-react';
import { DASHBOARD_OPERATIONAL_COPY as copy, INVENTORY_DASHBOARD_COPY as stockCopy } from '@web/lib/brand-voice';
import { useDashboardStatistics } from '../hooks/use-dashboard-statistics';
import { DashboardSummaryCard, DashboardMetric } from './dashboard-summary-card';

export function DashboardStockSummary() {
    const query = useDashboardStatistics('estoque'), data = query.data?.view === 'estoque' ? query.data.data : undefined;
    return <DashboardSummaryCard id="estoque" title={copy.stock} icon={Package} href="/dashboard/estoque" linkLabel={copy.openStock}
        loading={query.isLoading} failed={query.isError} hasData={!!data} onRetry={() => { void query.refetch(); }}>
        {data && <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2"><DashboardMetric domain="inventory" id="total" label={copy.totalAssets} value={data.totals.assets} />
                <DashboardMetric domain="inventory" id="skus" label={copy.products} value={data.totals.skus} />
                <DashboardMetric domain="inventory" id="available" label={copy.available} value={data.scope?.available ?? null} />
                <DashboardMetric domain="inventory" id="maintenance" label={copy.maintenance} value={data.scope?.maintenance ?? null} /></div>
            <p className="text-xs text-[var(--zyllen-muted)]">{copy.availabilityContext}</p>
            {(data.totals.unclassified > 0 || data.totals.unlocated > 0) && <div data-stock-classification className="rounded-lg border border-amber-400/25 bg-amber-500/5 p-3 text-xs text-amber-200">
                {data.totals.unclassified > 0 && <p>{copy.unclassified(data.totals.unclassified)}</p>}{data.totals.unlocated > 0 && <p>{copy.unlocated(data.totals.unlocated)}</p>}<Link href="/dashboard/estoque?aba=locations" className="mt-2 inline-block underline">{stockCopy.identifyLocations}</Link></div>}
            {data.totals.assets === 0 && <p className="text-sm text-[var(--zyllen-muted)]">{copy.stockEmpty}</p>}
            {data.replenishmentConfigured && <p className={data.criticalCount ? 'text-sm text-amber-300' : 'text-sm text-[var(--zyllen-muted)]'}>{copy.critical}: <strong>{data.criticalCount}</strong></p>}
            <Link href="/dashboard/estoque?aba=dashboard" className="inline-block text-xs text-[var(--zyllen-highlight)]">{copy.stockDashboard}</Link>
        </div>}
    </DashboardSummaryCard>;
}
