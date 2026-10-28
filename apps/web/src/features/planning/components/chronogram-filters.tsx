"use client";
import { useEffect, useRef, useState } from 'react';
import { CHRONOGRAM_PLANNING_STAGES, CHRONOGRAM_SERVICES, CHRONOGRAM_STAGES, MONTHS } from '../chronogram.constants';
import type { ChronogramFilters, ChronogramRecord } from '../types/chronogram.types';
import { agendaRecords } from '../utils/chronogram-selectors';
import styles from './chronogram.module.css';

interface Props { records: ChronogramRecord[]; filters: ChronogramFilters; now: Date; onChange: (patch: Partial<ChronogramFilters>) => void; onClear: () => void }
export function ChronogramFiltersBar({ records, filters, now, onChange, onClear }: Props) {
    const [search, setSearch] = useState(filters.search);
    const monthNavigation = useRef<HTMLElement>(null);
    useEffect(() => {
        monthNavigation.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }, [filters.year, filters.month]);
    useEffect(() => setSearch(filters.search), [filters.search]);
    useEffect(() => {
        if (search === filters.search) return;
        const timer = window.setTimeout(() => onChange({ search }), 250);
        return () => window.clearTimeout(timer);
    }, [search, filters.search, onChange]);
    const years = [...new Set([now.getFullYear(), filters.year, ...records.flatMap(record => [record.start, record.end, record.forecast].filter(Boolean).map(value => Number(value.slice(0, 4))))])].sort((a, b) => a - b);
    const states = [...new Set([...records.map(record => record.state).filter(Boolean), ...(filters.state !== 'all' ? [filters.state] : [])])].sort();
    return <>
        <div className={styles.period}>
            <select className={styles.year} aria-label="Ano do cronograma" value={filters.year} onChange={event => onChange({ year: Number(event.target.value) })}>{years.map(year => <option key={year}>{year}</option>)}</select>
            <nav ref={monthNavigation} className={styles.months} aria-label="Meses do cronograma">
                {MONTHS.map((name, index) => <button key={name} className={styles.month} type="button" aria-label={`${name} de ${filters.year}`} aria-pressed={filters.month === index}
                    aria-current={now.getFullYear() === filters.year && now.getMonth() === index ? 'date' : undefined} onClick={() => onChange({ month: index })}>
                    {name.slice(0, 3)}<small>{agendaRecords(records, { ...filters, month: index }).length || '–'}</small></button>)}
                <button type="button" className={styles.month} aria-pressed={filters.month === 'all'} onClick={() => onChange({ month: 'all' })}>Ano inteiro<small>{agendaRecords(records, { ...filters, month: 'all' }).length}</small></button>
            </nav>
        </div>
        <div className={styles.filters}>
            <label className={styles.field}>Categoria<select aria-label="Categoria" value={filters.category} onChange={event => onChange({ category: event.target.value as ChronogramFilters['category'] })}>
                <option value="all">Todas as categorias</option><option value="sala">Salas</option><option value="tela">Telas e totens</option><option value="unknown">Sem classificação</option></select></label>
            <label className={styles.field}>Serviço<select aria-label="Serviço" value={filters.service} onChange={event => onChange({ service: event.target.value as ChronogramFilters['service'] })}>
                <option value="all">Todos os serviços</option>{Object.entries(CHRONOGRAM_SERVICES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className={styles.field}>Status<select aria-label="Status" value={filters.stage} onChange={event => onChange({ stage: event.target.value as ChronogramFilters['stage'] })}>
                <option value="all">Todos os status</option>
                <optgroup label="Etapas do cronograma">{CHRONOGRAM_PLANNING_STAGES.map(value => <option key={value} value={value}>{CHRONOGRAM_STAGES[value].label}</option>)}</optgroup>
                <optgroup label="Situação da execução">{Object.entries(CHRONOGRAM_STAGES).filter(([value]) => !CHRONOGRAM_PLANNING_STAGES.includes(value as ChronogramRecord['stage'])).map(([value, stage]) => <option key={value} value={value}>{stage.label}</option>)}</optgroup>
            </select></label>
            <label className={styles.field}>Estado<select aria-label="Estado" value={filters.state} onChange={event => onChange({ state: event.target.value })}><option value="all">Todos os estados</option>{states.map(state => <option key={state}>{state}</option>)}</select></label>
            <label className={styles.field}>Buscar no cronograma<input type="search" placeholder="Cliente, cidade ou equipamento" maxLength={200} value={search} onChange={event => setSearch(event.target.value)} /></label>
        </div>
        {(filters.category !== 'all' || filters.service !== 'all' || filters.stage !== 'all' || filters.state !== 'all' || search || filters.year !== now.getFullYear() || filters.month !== now.getMonth()) &&
            <div><button type="button" className={styles.button} onClick={() => { setSearch(''); onClear(); }}>Limpar filtros</button></div>}
    </>;
}
