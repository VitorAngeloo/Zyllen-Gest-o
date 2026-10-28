"use client";
import { Fragment, useState, type CSSProperties } from 'react';
import { ACTIVE_STAGES, CHRONOGRAM_PLANNING_STAGES, CHRONOGRAM_STAGES, MONTHS, WEEKDAYS } from '../chronogram.constants';
import type { ChronogramFilters, ChronogramRecord } from '../types/chronogram.types';
import { calendarDays, compareByDate, dayKey, displayDay, forecastInPeriod } from '../utils/chronogram-dates';
import { agendaRecords, isActiveProject, matchesFilters, pendingRows } from '../utils/chronogram-selectors';
import { ChronogramRecordButton } from './chronogram-record-button';
import styles from './chronogram.module.css';

interface Props { records: ChronogramRecord[]; filters: ChronogramFilters; today: string; onOpen: (record: ChronogramRecord) => void }
export function ChronogramAgenda({ records, filters, today, onOpen }: Props) {
    const entries = agendaRecords(records, filters);
    if (!entries.length) return <div className={styles.empty}>Nenhum compromisso neste período.<br />Escolha outro mês ou ajuste os filtros. Projetos sem data continuam no quadro Projetos.</div>;
    let group = '';
    return <div className={styles.list}>{entries.map(record => {
        const label = !record.start ? 'Previstos, sem data confirmada' : filters.month === 'all' ? MONTHS[Number(record.start.slice(5, 7)) - 1] : '';
        const showGroup = label && label !== group;
        group = label;
        return <Fragment key={record.id}>{showGroup && <h3 className={styles.group}>{label}</h3>}<ChronogramRecordButton record={record} today={today} onOpen={onOpen} /></Fragment>;
    })}</div>;
}
export function ChronogramCalendar({ records, filters, today, onOpen, onChange }: Props & { onChange: (patch: Partial<ChronogramFilters>) => void }) {
    const [expanded, setExpanded] = useState('');
    const month = filters.month === 'all' ? Number(today.slice(0, 4)) === filters.year ? Number(today.slice(5, 7)) - 1 : 0 : filters.month;
    const base = records.filter(record => matchesFilters(record, filters));
    const navigate = (offset: number) => {
        const date = new Date(filters.year, month + offset, 1);
        onChange({ year: date.getFullYear(), month: date.getMonth() });
    };
    const monthlyForecasts = base.filter(record => !record.start && record.forecast.length === 7 && forecastInPeriod(record, filters.year, month));
    return <>
        <header className={styles.calendarHead}><h3>{MONTHS[month]} de {filters.year}</h3><div className={styles.row}>
            <button type="button" className={styles.button} aria-label="Mês anterior" onClick={() => navigate(-1)}>‹</button>
            <button type="button" className={styles.button} onClick={() => onChange({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 })}>Hoje</button>
            <button type="button" className={styles.button} aria-label="Próximo mês" onClick={() => navigate(1)}>›</button></div></header>
        <div className={styles.calendar} aria-label={`Calendário de ${MONTHS[month]} de ${filters.year}`}>
            {WEEKDAYS.map(day => <div key={day} className={styles.weekday}>{day}</div>)}
            {calendarDays(filters.year, month).map(date => {
                const key = dayKey(date);
                const entries = base.filter(record => record.start ? record.start <= key && (record.end || record.start) >= key : record.forecast.length === 10 && record.forecast === key).sort(compareByDate);
                return <div key={key} data-calendar-day={key} data-today={key === today} className={`${styles.day} ${date.getMonth() !== month ? styles.outside : ''}`}>
                    <span className={styles.dayNumber}>{date.getDate()}</span>
                    {(expanded === key ? entries : entries.slice(0, 4)).map(record => <button key={record.id} type="button" data-calendar-record={record.id}
                        title={`${record.title} · ${CHRONOGRAM_STAGES[record.stage].label}`} aria-label={`Abrir card: ${record.title}`}
                        className={`${styles.event} ${!record.start || record.kind === 'legacy' ? styles.tentative : ''}`} style={{ '--event-color': record.color } as CSSProperties} onClick={() => onOpen(record)}><i /><span>{record.kind === 'legacy' ? 'Legado · ' : ''}{record.title}</span></button>)}
                    {entries.length > 4 && <button type="button" className={styles.more} aria-expanded={expanded === key} onClick={() => setExpanded(expanded === key ? '' : key)}>{expanded === key ? 'Recolher' : `+${entries.length - 4} · Ver mais`}</button>}
                </div>;
            })}
        </div>
        <p className={`${styles.muted} ${styles.group}`}>Clique em um compromisso para abrir o card. Contorno tracejado indica previsão ou data informada no legado, sem confirmação de agendamento.</p>
        {monthlyForecasts.length > 0 && <div className={styles.pending}><h3>Previstos para {MONTHS[month].toLowerCase()}, sem dia definido</h3><div className={styles.row}>{monthlyForecasts.map(record => <button type="button" key={record.id} className={styles.button} onClick={() => onOpen(record)}>{record.title}</button>)}</div></div>}
    </>;
}
export function ChronogramProjects({ records, filters, today, onOpen }: Props) {
    const projects = records.filter(record => isActiveProject(record) && matchesFilters(record, filters));
    const hasPlanning = records.some(record => record.kind === 'project' && CHRONOGRAM_PLANNING_STAGES.includes(record.stage));
    const stages = ACTIVE_STAGES.filter(stage => CHRONOGRAM_PLANNING_STAGES.includes(stage) ? hasPlanning : !hasPlanning || projects.some(record => record.stage === stage));
    return <div className={styles.board} aria-label="Quadro de projetos">{stages.map(stage => {
        const entries = projects.filter(record => record.stage === stage).sort(compareByDate);
        return <section key={stage} className={styles.column}><header className={styles.panelHead}><span className={styles.badge} data-tone={CHRONOGRAM_STAGES[stage].tone}>{CHRONOGRAM_STAGES[stage].label}</span><span className={styles.muted}>{entries.length}</span></header>
            {entries.length ? entries.map(record => <ChronogramRecordButton key={record.id} record={record} today={today} compact onOpen={onOpen} />) : <p className={styles.empty}>Nenhum projeto</p>}</section>;
    })}</div>;
}
export function ChronogramPending({ records, filters, today, onOpen }: Props) {
    const rows = pendingRows(records.filter(record => matchesFilters(record, filters)), today);
    if (!rows.length) return <div className={styles.empty}>Nenhuma ação pendente nos registros consultados.</div>;
    return <div>{rows.map(row => <article key={row.id} className={styles.pending}><h3>{row.type}</h3><p className={styles.recordMeta}>{row.record.title} · {row.record.company}</p>
        <p className={styles.muted}>{row.responsible || 'Sem responsável'} · {row.deadline ? `${row.automatic ? 'Data' : 'Prazo'}: ${displayDay(row.deadline)}` : 'Sem prazo'}</p>
        {row.detail && <p className={styles.muted}>{row.detail}</p>}<div><button type="button" className={styles.button} onClick={() => onOpen(row.record)}>Abrir card</button></div></article>)}</div>;
}
