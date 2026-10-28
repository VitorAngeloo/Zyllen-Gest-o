import { CHRONOGRAM_PLANNING_STAGES, CHRONOGRAM_SERVICES, CHRONOGRAM_STAGES, MONTHS } from '../chronogram.constants';
import type { ChronogramRecord } from '../types/chronogram.types';
import { displayDay, parseLocalDay } from '../utils/chronogram-dates';
import { needsConfirmation } from '../utils/chronogram-selectors';
import styles from './chronogram.module.css';

export function ChronogramBadges({ record }: { record: ChronogramRecord }) {
    return <span className={styles.tags}><span className={styles.badge}>{CHRONOGRAM_SERVICES[record.service]}</span>
        {record.kind === 'legacy' && <span className={styles.badge}>Legado · somente consulta</span>}
        <span className={styles.badge} data-tone={CHRONOGRAM_STAGES[record.stage].tone}>{CHRONOGRAM_PLANNING_STAGES.includes(record.stage) && 'Cronograma: '}{CHRONOGRAM_STAGES[record.stage].label}</span>
        {CHRONOGRAM_PLANNING_STAGES.includes(record.stage) && record.kind !== 'legacy' && <span className={styles.badge} data-tone={CHRONOGRAM_STAGES[record.operationalStatus].tone}>Execução: {CHRONOGRAM_STAGES[record.operationalStatus].label}</span>}
        {record.category && <span className={styles.badge}>{record.category === 'sala' ? record.technical?.roomType || 'Sala' : 'Tela / totem'}</span>}
        {record.equipment.slice(0, 2).map((equipment, index) => <span key={`${equipment}-${index}`} className={styles.badge}>{equipment}</span>)}
    </span>;
}
export function ChronogramRecordButton({ record, today, compact = false, onOpen }: { record: ChronogramRecord; today: string; compact?: boolean; onOpen: (record: ChronogramRecord) => void }) {
    const date = record.start || record.forecast;
    return <button type="button" className={styles.record} data-chronogram-record={record.id} onClick={() => onOpen(record)}>
        {!compact && <span className={styles.date}><strong>{date.length === 10 ? date.slice(8, 10) : '–'}</strong><small>{date ? MONTHS[parseLocalDay(date).getMonth()].slice(0, 3) : 'sem data'}</small></span>}
        <span><span className={styles.recordTitle}>{record.marker && <span className={styles.muted}>{record.marker}<br /></span>}{record.title}</span>
            <span className={styles.recordMeta}>{[record.company, [record.city, record.state].filter(Boolean).join('/')].filter(Boolean).join(' · ') || record.address || 'Local não informado'}</span>
            <ChronogramBadges record={record} />
            <span className={styles.recordMeta}>{record.start ? `${displayDay(record.start)}${record.end && record.end !== record.start ? ` a ${displayDay(record.end)}` : ''}` : record.forecast ? `Previsão: ${displayDay(record.forecast)}` : 'Sem data definida'}
                {needsConfirmation(record, today) && <> · Confirmar realização</>}{record.pending.some(pending => pending.open) && <> · Há ações pendentes</>}</span>
        </span>
    </button>;
}
