"use client";
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Pause, Play } from 'lucide-react';
import type { PanelId } from '@zyllen/shared';
import { MONITORING_PANEL_COPY as copy } from '@web/lib/brand-voice';
import { usePanelRotation } from '../hooks/use-panel-rotation';
import { PanelErrorBoundary } from './panel-error-boundary';
import { PanelStatisticsView } from './panel-statistics';
import { MirrorTickets } from './mirror-tickets';
import { MirrorAttentionClients } from './mirror-attention-clients';
import { MirrorVehicles } from './mirror-vehicles';
import styles from './panel-mirror.module.css';
import type { PanelReader } from '../api/panel-api';
export function PanelWorkspace({ views, reader }: { views: PanelId[]; reader: PanelReader }) {
    const search = useSearchParams(), pathname = usePathname(), client = useQueryClient();
    const [detailsOpen, setDetailsOpen] = useState(false);
    const rotation = usePanelRotation(reader.key, views, search.toString(), detailsOpen, pathname);
    const [slides, setSlides] = useState<Record<PanelId, number>>({ atendimentos: 0, 'atendimentos-clientes': 0, 'clientes-atencao': 0, projetos: 0, operacoes: 0, estoque: 0, carros: 0 });
    useEffect(() => {
        if (!rotation.ready || detailsOpen) return;
        const timer = window.setInterval(() => setSlides(current => ({ ...current, [rotation.selected]: current[rotation.selected] + 1 })), 10_000);
        return () => window.clearInterval(timer);
    }, [rotation.ready, rotation.selected, detailsOpen]);
    if (!rotation.ready || !views.includes(rotation.selected)) return <p role="status">{copy.loading}</p>;
    const { selected, paused } = rotation;
    const refresh = () => { void client.invalidateQueries({ queryKey: ['panel-statistics', reader.key] }); void client.invalidateQueries({ queryKey: ['panel-attention-clients', reader.key] }); void client.invalidateQueries({ queryKey: ['panel-vehicles', reader.key] }); if (selected === 'atendimentos' || selected === 'atendimentos-clientes') void client.invalidateQueries({ queryKey: ['tickets'] }); };
    const listStatus = selected === 'clientes-atencao' ? 'Atualização dos contatos a cada 30 segundos' : selected === 'carros' ? 'Atualização da frota a cada 30 segundos' : 'Leitura automática de listas a cada 10 segundos';
    return <div className={styles.shell} data-mirror-shell><header className={styles.header}><div className={styles.heading}><h1 className={styles.eyebrow}>{copy.title}</h1><p className={styles.viewTitle}>{copy.panels[selected]}</p></div>
        <nav aria-label={copy.navigation} className={styles.nav}>{views.map(id => <button type="button" key={id} className={styles.navButton} disabled={detailsOpen} aria-pressed={selected === id} onClick={() => rotation.select(id)}>{copy.panels[id]}</button>)}</nav>
        <div className={styles.headerState}><span className={styles.stateDot} data-paused={paused} aria-hidden="true" /><span>{paused ? copy.paused : 'Troca de visão a cada minuto'}</span></div></header>
        <section aria-label={copy.panels[selected]} data-monitoring-panel={selected} data-panel-view={selected} className={styles.body}>
            <PanelErrorBoundary key={selected} onRetry={refresh}>{selected === 'atendimentos' && reader.tickets ? <MirrorTickets reader={reader.tickets} source="INTERNAL" slide={slides[selected]} onDetailsOpenChange={setDetailsOpen} /> : selected === 'atendimentos-clientes' && reader.tickets ? <MirrorTickets reader={reader.tickets} source="CLIENT" slide={slides[selected]} onDetailsOpenChange={setDetailsOpen} /> : selected === 'clientes-atencao' && reader.attentionClients ? <MirrorAttentionClients reader={reader} /> : selected === 'carros' && reader.vehicles ? <MirrorVehicles reader={reader} slide={slides[selected]} /> : (selected === 'projetos' || selected === 'operacoes' || selected === 'estoque') ? <PanelStatisticsView view={selected} reader={reader} mirror slide={slides[selected]} /> : <p role="alert">{copy.failure}</p>}</PanelErrorBoundary>
        </section>
        <footer className={styles.footer}><div className={styles.footerText}><strong>{copy.panels[selected]}</strong><span>{listStatus}</span><span>·</span><span>{paused ? copy.paused : copy.rotating}</span></div><button type="button" className={styles.player} aria-label={paused ? copy.resume : copy.pause} title={paused ? copy.resume : copy.pause} aria-pressed={!paused} onClick={() => rotation.setPaused(!paused)}>{paused ? <Play size={19} /> : <Pause size={19} />}</button></footer>
        <p role="status" data-panel-rotation className="sr-only">{detailsOpen ? copy.held : paused ? copy.paused : copy.rotating}</p>
    </div>;
}
