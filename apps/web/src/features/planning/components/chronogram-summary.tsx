import type { ChronogramFilters, ChronogramRecord } from '../types/chronogram.types';
import { chronogramSummary } from '../utils/chronogram-selectors';
import styles from './chronogram.module.css';

function CategorySplit({ records }: { records: ChronogramRecord[] }) {
    const rooms = records.filter(record => record.category === 'sala').length;
    const screens = records.filter(record => record.category === 'tela').length;
    const unknown = records.length - rooms - screens;
    return <small>Salas {rooms} · Telas {screens}{unknown > 0 && <> · Sem classificação {unknown}</>}</small>;
}
export function ChronogramSummary({ records, filters, today, onPending }: { records: ChronogramRecord[]; filters: ChronogramFilters; today: string; onPending: () => void }) {
    const summary = chronogramSummary(records, filters, today);
    return <section aria-label="Resumo do cronograma">
        <header className={styles.summaryHead}><h2>Resumo de {filters.year}</h2><p>{summary.installationsInYear} instalações e {summary.removalsInYear} desinstalações previstas no ano. Conclusões pela data real de realização.</p><p>O resumo considera o ano inteiro; o mês selecionado organiza a agenda. Próximas instalações e ações pendentes mostram a situação atual dos filtros.</p></header>
        <div className={styles.metrics}>
            <div className={styles.metric} data-chronogram-metric="installations"><strong>{summary.installations.length}</strong><p>Instalações concluídas em {filters.year}</p><CategorySplit records={summary.installations} /></div>
            <div className={styles.metric} data-chronogram-metric="removals"><strong>{summary.removals.length}</strong><p>Desinstalações concluídas em {filters.year}</p><CategorySplit records={summary.removals} /></div>
            <div className={styles.metric} data-chronogram-metric="upcoming"><strong>{summary.upcoming.length}</strong><p>Próximas instalações agendadas</p><CategorySplit records={summary.upcoming} /></div>
            <div className={styles.metric} data-chronogram-metric="active"><strong>{summary.active.length}</strong><p>Projetos em andamento</p><small>{summary.active.filter(record => !!record.start).length} com data · {summary.active.filter(record => !record.start).length} sem data</small></div>
            <button type="button" className={`${styles.metric} ${styles.metricAction}`} data-chronogram-metric="pending" onClick={onPending}><strong>{summary.pending.length}</strong><p>Ações pendentes</p><small>em {new Set(summary.pending.map(pending => pending.record.id)).size} registros · Abrir pendências</small></button>
        </div>
        {summary.incompleteHistory > 0 && <p className={styles.notice}>{summary.incompleteHistory} {summary.incompleteHistory === 1 ? 'projeto com conclusão indicada sem data real de conclusão' : 'projetos com conclusão indicada sem data real de conclusão'}. Esses registros permanecem fora das conclusões anuais.</p>}
    </section>;
}
