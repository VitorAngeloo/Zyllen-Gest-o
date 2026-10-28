import { CHRONOGRAM_STAGES } from '../chronogram.constants';
import type { ChronogramFilters, ChronogramRecord } from '../types/chronogram.types';
import { compareByDate } from '../utils/chronogram-dates';
import { matchesFilters, needsConfirmation } from '../utils/chronogram-selectors';
import { ChronogramRecordButton } from './chronogram-record-button';
import styles from './chronogram.module.css';

export function ChronogramSidebar({ records, filters, today, onOpen }: { records: ChronogramRecord[]; filters: ChronogramFilters; today: string; onOpen: (record: ChronogramRecord) => void }) {
    const base = records.filter(record => matchesFilters(record, filters));
    const overdue = base.filter(record => needsConfirmation(record, today)).sort(compareByDate).slice(0, 3);
    const next = base.filter(record => record.operationalStatus === 'SCHEDULED' && record.start >= today).sort(compareByDate).slice(0, 8);
    const stages = [...new Set(base.map(record => record.stage))];
    return <aside className={styles.rail} aria-label="Informações do cronograma"><section className={styles.panel}>
        <header className={styles.panelHead}><h2>Próximos compromissos</h2></header>
        {overdue.length + next.length > 0 ? [...overdue, ...next].map(record => <ChronogramRecordButton key={record.id} record={record} today={today} onOpen={onOpen} />) : <p className={styles.empty}>Nada agendado com esses filtros.</p>}
    </section><section className={styles.panel}><header className={styles.panelHead}><h2>Legenda</h2></header><div className={styles.legend}>
        <div><h3>Status dos registros</h3><div className={styles.tags}>{(stages.length ? stages : ['PENDING', 'SCHEDULED', 'IN_PROGRESS'] as const).map(stage => <span key={stage} className={styles.badge} data-tone={CHRONOGRAM_STAGES[stage].tone}>{CHRONOGRAM_STAGES[stage].label}</span>)}</div></div>
        <div><h3>Equipamento</h3><p className={styles.muted}>Sala imersiva · Sala interativa · Totem · Tela</p></div>
        <p className={styles.muted}>Uma data vencida pede conferência. A realização é confirmada pelo status e pelas datas reais do registro.</p>
    </div></section></aside>;
}
