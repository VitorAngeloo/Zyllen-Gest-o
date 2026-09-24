"use client";

import { useQuery } from '@tanstack/react-query';
import { Button } from '@web/components/ui/button';
import type { VehicleReservationRecord } from '@zyllen/shared';
import type { PanelReader } from '../api/panel-api';
import { mirrorPage, useMirrorPageSize } from './mirror-paging';
import styles from './panel-mirror.module.css';

function VehicleList({ title, items, slide, current = false, size }: { title: string; items: VehicleReservationRecord[]; slide: number; current?: boolean; size: number }) {
    const page = mirrorPage(items, slide, size >= 3 ? 4 : 3);
    return <section className={styles.panel} aria-label={title}><div className={styles.panelHead}><div><h3 className={styles.panelTitle}>{title}</h3><p className={styles.panelSubtitle}>{current ? 'Quem está com cada carro neste momento' : 'Reservas ativas e futuras em ordem de início'}</p></div><span className={styles.count}>{items.length}</span></div><div className={styles.panelContent}>{page.items.length ? <ul className={styles.compactList}>{page.items.map(item => <li key={item.id} data-vehicle-reservation={item.id} className={styles.vehicleItem}><div><strong className={styles.rowTitle}>{item.vehicle.name}</strong><span className={styles.rowMeta}>{item.title}</span></div><div className={styles.vehiclePerson}><strong>{current ? item.use?.driver.name ?? item.responsible.name : item.responsible.name}</strong><span>{current ? 'Em uso agora' : new Date(item.startDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span></div></li>)}</ul> : <p className={styles.empty}>{current ? 'Nenhum carro em uso neste momento.' : 'Nenhuma reserva atual ou futura.'}</p>}</div>{page.total > 1 && <p className={styles.pageMarker}>Página {page.page} de {page.total} · troca automática</p>}</section>;
}

export function MirrorVehicles({ reader, slide }: { reader: PanelReader; slide: number }) {
    const size = useMirrorPageSize();
    const query = useQuery({ queryKey: ['panel-vehicles', reader.key], queryFn: ({ signal }) => reader.vehicles!(signal), enabled: !!reader.vehicles, refetchInterval: 30_000 });
    return <div className={styles.viewState}>
        {query.isError && <div role="alert" className={styles.error}><span>Não foi possível atualizar os carros.</span><Button type="button" size="sm" variant="outline" onClick={() => { void query.refetch(); }}>Tentar novamente</Button></div>}
        {query.isLoading && !query.data && <div role="status" className={styles.loading}>Carregando situação dos carros…</div>}
        {query.data && <div className={styles.vehicleView}><div className={styles.metricsFour}>
            <div className={styles.metric} data-tone="green"><span className={styles.metricLabel}>Frota ativa</span><strong className={styles.metricValue}>{query.data.activeVehicles}</strong><span className={styles.metricContext}>carros cadastrados e ativos</span></div>
            <div className={styles.metric} data-tone="mint"><span className={styles.metricLabel}>Disponíveis</span><strong className={styles.metricValue}>{query.data.availableVehicles}</strong><span className={styles.metricContext}>sem retirada em aberto</span></div>
            <div className={styles.metric} data-tone="amber"><span className={styles.metricLabel}>Em uso</span><strong className={styles.metricValue}>{query.data.occupiedVehicles}</strong><span className={styles.metricContext}>com retirada registrada</span></div>
            <div className={styles.metric} data-tone="blue"><span className={styles.metricLabel}>Reservas</span><strong className={styles.metricValue}>{query.data.upcoming.length}</strong><span className={styles.metricContext}>atuais ou futuras</span></div>
        </div><div className={styles.vehicleGrid}><VehicleList title="Em uso agora" items={query.data.current} slide={slide} current size={size} /><VehicleList title="Reservas atuais e futuras" items={query.data.upcoming} slide={slide} size={size} /></div></div>}
    </div>;
}
