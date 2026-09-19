"use client";
import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Pause, Play } from 'lucide-react';
import type { PanelId } from '@zyllen/shared';
import { MONITORING_PANEL_COPY as copy } from '@web/lib/brand-voice';
import { Button } from '@web/components/ui/button';
import { TicketDashboardBoard } from '@web/features/tickets/components/ticket-dashboard-board';
import { usePanelRotation } from '../hooks/use-panel-rotation';
import { PanelErrorBoundary } from './panel-error-boundary';
import { PanelStatisticsView } from './panel-statistics';
import type { PanelReader } from '../api/panel-api';
const noAction = () => {};
export function PanelWorkspace({ views, reader }: { views: PanelId[]; reader: PanelReader }) {
    const search = useSearchParams(), pathname = usePathname(), client = useQueryClient();
    const [detailsOpen, setDetailsOpen] = useState(false);
    const rotation = usePanelRotation(reader.key, views, search.toString(), detailsOpen, pathname);
    if (!rotation.ready || !views.includes(rotation.selected)) return <p role="status">{copy.loading}</p>;
    const { selected, paused } = rotation;
    const refresh = () => { void client.invalidateQueries({ queryKey: ['panel-statistics', reader.key] }); if (selected === 'atendimentos') void client.invalidateQueries({ queryKey: ['tickets'] }); };
    return <div className="space-y-5 pb-16 text-white"><header><h1 className="text-2xl font-semibold">{copy.title}</h1><p className="mt-1 text-xs text-[var(--zyllen-muted)]">{copy.mirrorDescription}</p></header>
        <nav aria-label={copy.navigation} className="flex flex-wrap gap-2 rounded-xl border border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] p-3">{views.map(id => <Button key={id} variant={selected === id ? 'default' : 'outline'} disabled={detailsOpen} aria-pressed={selected === id} onClick={() => rotation.select(id)}>{copy.panels[id]}</Button>)}</nav>
        <section aria-label={copy.panels[selected]} data-monitoring-panel={selected} data-panel-view={selected} className="space-y-4"><h2 className="text-xl font-semibold">{copy.panels[selected]}</h2>
            <PanelErrorBoundary key={selected} onRetry={refresh}>{selected === 'atendimentos' ? <TicketDashboardBoard readOnly reader={reader.tickets} isManagerOrAdmin onDetailsOpenChange={setDetailsOpen} onAssign={noAction} onClose={noAction} onReassign={noAction} /> : <PanelStatisticsView view={selected} reader={reader} />}</PanelErrorBoundary>
        </section><p className="text-xs text-[var(--zyllen-muted)]">{copy.period}</p>
        <div className="fixed bottom-4 right-4 z-40"><Button type="button" size="icon" variant="outline" aria-label={paused ? copy.resume : copy.pause} title={paused ? copy.resume : copy.pause} aria-pressed={!paused} className="h-10 w-10 rounded-full border-[var(--zyllen-highlight)]/50 bg-[var(--zyllen-bg)] shadow-lg" onClick={() => rotation.setPaused(!paused)}>{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</Button></div>
        <p role="status" data-panel-rotation className="sr-only">{detailsOpen ? copy.held : paused ? copy.paused : copy.rotating}</p>
    </div>;
}
