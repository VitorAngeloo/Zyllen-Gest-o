import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Button } from '@web/components/ui/button';
import { Skeleton } from '@web/components/ui/skeleton';
import { DASHBOARD_OPERATIONAL_COPY as copy } from '@web/lib/brand-voice';

interface Props {
    id: string; title: string; icon: LucideIcon; href: string; linkLabel: string;
    loading: boolean; failed: boolean; hasData: boolean; notice?: string; onRetry: () => void; children: ReactNode;
}
export function DashboardSummaryCard({ id, title, icon: Icon, href, linkLabel, loading, failed, hasData, notice, onRetry, children }: Props) {
    return <section aria-label={title} data-dashboard-summary={id} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.025] p-4 sm:p-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h4 className="flex items-center gap-2 text-base font-semibold text-white"><Icon className="h-4 w-4 text-[var(--zyllen-highlight)]" />{title}</h4>
            <Link href={href} className="inline-flex items-center gap-1 text-xs text-white/60 transition-colors hover:text-[var(--zyllen-highlight)]">{linkLabel}<ArrowUpRight className="h-3 w-3" /></Link>
        </header>
        {failed && <div role="alert" className="mb-3 rounded-md border border-red-400/40 bg-red-500/5 p-3 text-xs text-red-200"><p>{hasData ? copy.stale : copy.failed}</p><Button variant="ghost" size="sm" onClick={onRetry}>{copy.retry}</Button></div>}
        {notice && <div role="status" className="mb-3 rounded-md border border-amber-400/40 bg-amber-500/5 p-3 text-xs text-amber-200"><p>{notice}</p><Button variant="ghost" size="sm" onClick={onRetry}>{copy.retry}</Button></div>}
        {loading ? <div role="status" aria-label={copy.loading}><Skeleton className="h-24 w-full" /></div> : children}
    </section>;
}
export function DashboardMetric({ id, label, value, domain, warning = false }: { id: string; label: string; value: number | null; domain: 'inventory' | 'project' | 'operation'; warning?: boolean }) {
    return <div {...{ [`data-${domain}-metric`]: id }} className={`min-w-0 border-l-2 py-1 pl-3 pr-2 ${warning ? 'border-amber-400/70' : 'border-white/15'}`}>
        <p data-metric-value className={`text-2xl font-semibold tabular-nums ${warning ? 'text-amber-300' : 'text-white'}`}>{value === null ? '—' : value.toLocaleString('pt-BR')}</p>
        <p className="mt-1 text-xs text-[var(--zyllen-muted)]">{label}</p>
    </div>;
}
