"use client";

import type { ReactNode } from 'react';
import type { InventoryStatistics, OperationServiceHighlight, OperationTripHighlight, OperationsStatistics, PanelStatistics, ProjectStatistics, StockRanking } from '@zyllen/shared';
import { Button } from '@web/components/ui/button';
import { INVENTORY_DASHBOARD_COPY as inventoryCopy, MONITORING_PANEL_COPY as panelCopy, OPERATIONS_DASHBOARD_COPY as operationsCopy, PROJECT_DASHBOARD_COPY as projectCopy, PROJECT_SERVICE_COPY as serviceCopy, TRIP_COPY as tripCopy } from '@web/lib/brand-voice';
import { mirrorPage, useMirrorPageSize } from './mirror-paging';
import styles from './panel-mirror.module.css';

interface Props {
    result?: PanelStatistics;
    loading: boolean;
    failed: boolean;
    fetching: boolean;
    onRetry: () => void;
    slide: number;
}

function Metric({ label, value, tone = 'green', context, metricType, metricKey }: { label: string; value: string | number; tone?: string; context?: string; metricType: 'project' | 'operation' | 'inventory'; metricKey: string }) {
    const attrs = metricType === 'project' ? { 'data-project-metric': metricKey } : metricType === 'operation' ? { 'data-operation-metric': metricKey } : { 'data-inventory-metric': metricKey };
    return <div className={styles.metric} data-tone={tone} {...attrs}><span className={styles.metricLabel}>{label}</span><strong className={styles.metricValue} data-metric-value>{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</strong>{context && <span className={styles.metricContext}>{context}</span>}</div>;
}

function Panel({ title, subtitle, count, page, total, children }: { title: string; subtitle?: string; count?: number; page?: number; total?: number; children: ReactNode }) {
    return <section className={styles.panel} data-mirror-panel aria-label={title}><div className={styles.panelHead}><div><h3 className={styles.panelTitle}>{title}</h3>{subtitle && <p className={styles.panelSubtitle}>{subtitle}</p>}</div>{count !== undefined && <span className={styles.count}>{count}</span>}</div><div className={styles.panelContent}>{children}</div>{total !== undefined && total > 1 && <p className={styles.pageMarker}>Página {page} de {total} · troca automática</p>}</section>;
}

function ProjectView({ data, slide, size }: { data: ProjectStatistics; slide: number; size: number }) {
    const highlights = mirrorPage(data.highlights, slide, size >= 3 ? 6 : 3);
    const missing = data.dataQuality.completedWithoutDate + data.dataQuality.cancelledWithoutDate;
    return <div className={styles.view}>
        <div className={styles.metricsSix}>
            <Metric metricType="project" metricKey="active" label={projectCopy.active} value={data.current.active} context={projectCopy.activeContext} tone="green" />
            <Metric metricType="project" metricKey="in-progress" label={projectCopy.inProgress} value={data.current.inProgress} tone="blue" />
            <Metric metricType="project" metricKey="pending" label={projectCopy.pending} value={data.current.pending} tone="amber" />
            <Metric metricType="project" metricKey="scheduled" label={projectCopy.scheduled} value={data.current.scheduled} tone="green" />
            <Metric metricType="project" metricKey="completed" label={projectCopy.completed} value={data.completedInPeriod} tone="mint" />
            <Metric metricType="project" metricKey="cancelled" label={projectCopy.cancelled} value={data.cancelledInPeriod} tone="muted" />
        </div>
        <div className={styles.contextBar}><span>Projetos cadastrados: <strong>{data.current.total}</strong> · concluídos atualmente: <strong>{data.current.done}</strong></span>{(missing || data.dataQuality.unclassified) > 0 && <span className={styles.warning}>Dados a conferir: {missing + data.dataQuality.unclassified}</span>}<span className={styles.updated}>{projectCopy.updated(new Date(data.generatedAt).toLocaleString('pt-BR'))}</span></div>
        <Panel title={projectCopy.highlights} subtitle="Prioridade e acompanhamento dos projetos ativos" count={data.highlights.length} page={highlights.page} total={highlights.total}>
            {highlights.items.length ? <ul className={styles.projectGrid}>{highlights.items.map(project => <li key={project.id} data-project-highlight={project.id} className={styles.projectCard} style={{ borderLeftColor: /^#[0-9a-fA-F]{6}$/.test(project.color) ? project.color : '#ABFF10' }}>
                <span className={styles.kicker}>{project.markerName || serviceCopy.types[project.type]}</span>
                <h4 className={styles.cardTitle}>{project.name}</h4><p className={styles.cardMeta}>{project.companyName}</p>
                <div className={styles.cardBottom}><span>{serviceCopy.statuses[project.status]}</span>{project.urgency === 2 && <span className={styles.warning}>{serviceCopy.urgencies[project.urgency]}</span>}{project.relevant && <span className={styles.greenText}>{projectCopy.relevant}</span>}</div>
                <p className={styles.cardDate}>{project.startDate ? `${projectCopy.planned}: ${new Date(project.startDate).toLocaleString('pt-BR')}` : projectCopy.noDate}</p>
            </li>)}</ul> : <p className={styles.empty}>{data.current.total ? projectCopy.noActive : projectCopy.empty}</p>}
        </Panel>
    </div>;
}

function ServicePanel({ title, items, slide }: { title: string; items: OperationServiceHighlight[]; slide: number }) {
    const page = mirrorPage(items, slide, 2);
    return <Panel title={title} count={items.length} page={page.page} total={page.total}>{page.items.length ? <ul className={styles.compactList}>{page.items.map(item => <li key={item.id} className={styles.compactItem} data-operation-service={item.id}>
        <strong className={styles.rowTitle}>{item.name}</strong><span className={styles.rowMeta}>{item.companyName} · {serviceCopy.statuses[item.status]}</span><span className={styles.rowMinor}>{item.completedAt ? `${operationsCopy.completed}: ${new Date(item.completedAt).toLocaleString('pt-BR')}` : item.startDate ? new Date(item.startDate).toLocaleString('pt-BR') : operationsCopy.noDate}</span>
    </li>)}</ul> : <p className={styles.empty}>Nenhum registro neste grupo.</p>}</Panel>;
}

function TripPanel({ items, slide }: { items: OperationTripHighlight[]; slide: number }) {
    const page = mirrorPage(items, slide, 2);
    return <Panel title={operationsCopy.nextTrips} count={items.length} page={page.page} total={page.total}>{page.items.length ? <ul className={styles.compactList}>{page.items.map(item => <li key={item.id} className={styles.compactItem} data-operation-trip={item.id}>
        <strong className={styles.rowTitle}>{item.title}</strong><span className={styles.rowMeta}>{item.originCity}/{item.originState} → {item.destinationCity}/{item.destinationState}</span><span className={styles.rowMinor}>{tripCopy.departure}: {new Date(item.startDate).toLocaleString('pt-BR')}</span>
    </li>)}</ul> : <p className={styles.empty}>Nenhuma viagem interestadual futura.</p>}</Panel>;
}

function OperationsView({ data, slide }: { data: OperationsStatistics; slide: number }) {
    const issues = Object.values(data.dataQuality).reduce((sum, count) => sum + count, 0);
    return <div className={styles.view}>
        <div className={styles.metricsFour}>
            <Metric metricType="operation" metricKey="installations" label={operationsCopy.installations} value={data.installationsCompleted} context={operationsCopy.actualContext} tone="green" />
            <Metric metricType="operation" metricKey="removals" label={operationsCopy.removals} value={data.removalsCompleted} context={operationsCopy.actualContext} tone="mint" />
            <Metric metricType="operation" metricKey="planned-trips" label={operationsCopy.plannedTrips} value={data.tripsPlanned} context={operationsCopy.plannedContext} tone="blue" />
            <Metric metricType="operation" metricKey="completed-trips" label={operationsCopy.completedTrips} value={data.tripsCompleted} context={operationsCopy.actualContext} tone="green" />
        </div>
        <div className={styles.contextBar}><span>Viagens previstas agora: <strong>{data.current.plannedTrips}</strong> · em andamento: <strong>{data.current.tripsInProgress}</strong></span>{issues > 0 && <span className={styles.warning}>{issues} informação(ões) a conferir na gestão</span>}<span className={styles.updated}>{operationsCopy.updated(new Date(data.generatedAt).toLocaleString('pt-BR'))}</span></div>
        <div className={styles.operationsGrid}>
            <ServicePanel title={operationsCopy.nextInstallations} items={data.nextInstallations} slide={slide} />
            <ServicePanel title={operationsCopy.relevantInstallations} items={data.relevantInstallations} slide={slide} />
            <ServicePanel title={operationsCopy.latestInstallations} items={data.latestInstallations} slide={slide} />
            <ServicePanel title={operationsCopy.latestRemovals} items={data.latestRemovals} slide={slide} />
            <TripPanel items={data.nextInterstateTrips} slide={slide} />
            <div className={styles.notePanel}><p className={styles.kicker}>LEITURA DO PAINEL</p><strong>Operação em movimento</strong><p>Instalações, retiradas e viagens aparecem em grupos separados. Mais registros avançam automaticamente.</p></div>
        </div>
    </div>;
}

function InventoryRanking({ title, rows, slide, size, keyName }: { title: string; rows: StockRanking[]; slide: number; size: number; keyName: string }) {
    const page = mirrorPage(rows, slide, size + 1);
    return <div className={styles.inventoryRanking} data-inventory-ranking={keyName}><Panel title={title} count={rows.length} page={page.page} total={page.total}>{page.items.length ? <ol className={styles.compactList}>{page.items.map(row => <li key={row.skuId} className={styles.rankingRow}><span className={styles.rowTitle}>{row.name}<small className={styles.rowMinor}>{row.skuCode}</small></span><strong className={styles.quantity}>{row.quantity.toLocaleString('pt-BR')}</strong></li>)}</ol> : <p className={styles.empty}>{inventoryCopy.emptyRanking}</p>}</Panel></div>;
}

function InventoryView({ data, slide, size }: { data: InventoryStatistics; slide: number; size: number }) {
    const scope = data.scope ?? { assets: 0, available: 0, maintenance: 0 };
    const movements = mirrorPage(data.movements, slide, size + 1);
    return <div className={styles.view}>
        <div className={styles.metricsFour}>
            <Metric metricType="inventory" metricKey="scoped" label="Patrimônios no contexto" value={scope.assets} tone="green" />
            <Metric metricType="inventory" metricKey="available" label="Disponíveis nos estoques internos" value={scope.available} tone="mint" />
            <Metric metricType="inventory" metricKey="maintenance" label="Em manutenção" value={scope.maintenance} tone="amber" />
            <Metric metricType="inventory" metricKey="total" label="Total cadastrado" value={data.totals.assets} tone="blue" />
        </div>
        <div className={styles.contextBar}><span>{data.location?.name ?? 'Todo o patrimônio'} · {new Date(data.period.start).toLocaleDateString('pt-BR')} a {new Date(data.period.end).toLocaleDateString('pt-BR')}</span>{(data.totals.unlocated || data.totals.unclassified) > 0 && <span className={styles.warning}>Sem local: {data.totals.unlocated} · local não classificado: {data.totals.unclassified}</span>}<span className={styles.updated}>SKUs: {data.totals.skus} · {new Date(data.generatedAt).toLocaleTimeString('pt-BR')}</span></div>
        <div className={styles.inventoryGrid}>
            <InventoryRanking title={inventoryCopy.entries} rows={data.topEntries} slide={slide} size={size} keyName="entries" />
            <InventoryRanking title={inventoryCopy.exits} rows={data.topExits} slide={slide} size={size} keyName="exits" />
            <Panel title={inventoryCopy.quantities} count={data.movements.length} page={movements.page} total={movements.total}>{movements.items.length ? <ul className={styles.compactList}>{movements.items.map(movement => <li key={movement.nature} className={styles.rankingRow}><span className={styles.rowTitle}>{inventoryCopy.nature[movement.nature]}<small className={styles.rowMinor}>{movement.records} registro(s)</small></span><strong className={styles.quantity}>{movement.quantity.toLocaleString('pt-BR')}</strong></li>)}</ul> : <p className={styles.empty}>Nenhuma movimentação no período.</p>}</Panel>
        </div>
    </div>;
}

export function MirrorStatistics({ result, loading, failed, fetching, onRetry, slide }: Props) {
    const size = useMirrorPageSize();
    return <div className={styles.viewState}>
        {failed && <div role="alert" className={styles.error}><span>{result ? panelCopy.stale : panelCopy.failure}</span><Button type="button" size="sm" variant="outline" disabled={fetching} onClick={onRetry}>{panelCopy.retry}</Button></div>}
        {loading && !result && <div role="status" className={styles.loading}>{panelCopy.loading}</div>}
        {result?.view === 'projetos' && <ProjectView data={result.data} slide={slide} size={size} />}
        {result?.view === 'operacoes' && <OperationsView data={result.data} slide={slide} />}
        {result?.view === 'estoque' && <InventoryView data={result.data} slide={slide} size={size} />}
    </div>;
}
