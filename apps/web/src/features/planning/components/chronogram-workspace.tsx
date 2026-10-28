"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Moon, RefreshCw, Sun } from 'lucide-react';
import { PROJECT_PLANNING_ACCESS } from '@zyllen/shared';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { ProjectServiceDialog } from '@web/features/project-services/components/project-service-dialog';
import { scheduleApi } from '@web/features/schedule/api/schedule-api';
import { ScheduleFormDialog } from '@web/features/schedule/components/schedule-form-dialog';
import type { Schedule } from '@web/features/schedule/types/schedule.types';
import { CHRONOGRAM_VIEWS } from '../chronogram.constants';
import type { ChronogramFilters, ChronogramRecord, ChronogramSelection, ChronogramView } from '../types/chronogram.types';
import { useChronogram } from '../hooks/use-chronogram';
import { defaultFilters } from '../utils/chronogram-dates';
import { agendaRecords, isActiveProject, matchesFilters, pendingRows } from '../utils/chronogram-selectors';
import { ChronogramFiltersBar } from './chronogram-filters';
import { ChronogramSummary } from './chronogram-summary';
import { ChronogramAgenda, ChronogramCalendar, ChronogramPending, ChronogramProjects } from './chronogram-views';
import { ChronogramSidebar } from './chronogram-sidebar';
import { ChronogramRecordDialog } from './chronogram-record-dialog';
import { ChronogramTools } from './chronogram-tools';
import styles from './chronogram.module.css';

interface Props { filters: ChronogramFilters; view: ChronogramView; history: boolean; onNavigate: (view: ChronogramView, patch?: Partial<ChronogramFilters>) => void }
export function ChronogramWorkspace({ filters, view, history, onNavigate }: Props) {
    const data = useChronogram();
    const { hasPermission } = useAuth(), options = useAuthedFetch(), client = useQueryClient();
    const [selected, setSelected] = useState<ChronogramSelection | null>(null);
    const focusOrigin = useRef<HTMLElement | null>(null);
    const [projectEditor, setProjectEditor] = useState<{ id?: string } | null>(null);
    const [scheduleEditor, setScheduleEditor] = useState<Schedule | null>(null);
    const [actionError, setActionError] = useState('');
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    useEffect(() => { try { if (localStorage.getItem('zyllen:chronogram-theme') === 'light') setTheme('light'); } catch { /* Preference is optional. */ } }, []);
    const toggleTheme = () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        try { localStorage.setItem('zyllen:chronogram-theme', next); } catch { /* Keep this session's preference. */ }
    };
    const updateFilters = useCallback((patch: Partial<ChronogramFilters>) => onNavigate(view, patch), [onNavigate, view]);
    const open = (record: ChronogramRecord) => { focusOrigin.current = document.activeElement as HTMLElement | null; setSelected({ id: record.sourceId, kind: record.kind }); };
    const closeRecord = useCallback(() => {
        setSelected(null);
        window.requestAnimationFrame(() => focusOrigin.current?.focus({ preventScroll: true }));
    }, []);
    const edit = async (record: ChronogramRecord) => {
        if (record.kind === 'legacy' || !hasPermission(PROJECT_PLANNING_ACCESS.editProject)) return;
        setActionError('');
        if (record.kind === 'project') { setSelected(null); setProjectEditor({ id: record.sourceId }); return; }
        try { const current = await scheduleApi.detail(record.sourceId, options); setSelected(null); setScheduleEditor(current); }
        catch { setActionError('Não foi possível abrir o agendamento para edição. Tente novamente pelo card.'); }
    };
    const counts: Partial<Record<ChronogramView, number>> = data.ready ? {
        agenda: agendaRecords(data.records, filters).length,
        projetos: data.records.filter(record => isActiveProject(record) && matchesFilters(record, filters)).length,
        pendencias: pendingRows(data.records.filter(record => matchesFilters(record, filters)), data.today).length,
    } : {};
    const viewProps = { records: data.records, filters, today: data.today, onOpen: open };
    return <div className={styles.workspace} data-theme={theme}>
        <div className={styles.toolbar}><p>{data.updatedAt ? `Atualizado às ${new Date(data.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Cronograma de instalações e compromissos'}</p>
            <div className={styles.row}><button type="button" className={styles.button} disabled={data.fetching} onClick={() => { void data.refresh(); }}><span className={styles.row}><RefreshCw size={14} />{data.fetching ? 'Atualizando…' : 'Atualizar'}</span></button>
                <button type="button" className={styles.button} aria-label={theme === 'dark' ? 'Usar tema claro no cronograma' : 'Usar tema escuro no cronograma'} onClick={toggleTheme}><span className={styles.row}>{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}Tema</span></button></div>
        </div>
        <ChronogramFiltersBar records={data.ready ? data.records : []} filters={filters} now={data.now} onChange={updateFilters} onClear={() => updateFilters(defaultFilters(data.now))} />
        {data.failed && <div role="alert" className={styles.notice}><p>{data.ready ? 'Não foi possível atualizar. Exibindo os últimos dados carregados.' : 'Não foi possível carregar o cronograma completo.'}</p><button type="button" className={styles.button} onClick={() => { void data.refresh(); }}>Tentar novamente</button></div>}
        {actionError && <p role="alert" className={styles.notice}>{actionError}</p>}
        {data.loading && !data.ready && <p role="status" className={styles.empty}>Carregando projetos e compromissos…</p>}
        {data.ready && <ChronogramSummary records={data.records} filters={filters} today={data.today} onPending={() => onNavigate('pendencias')} />}
        {!!data.legacy.data?.length && <p className={styles.notice}>{data.legacy.data.length} registros do ZIP disponíveis como histórico legado de consulta. Datas e etapas da origem não geram agendamentos ou conclusões reais; ficam fora dos indicadores operacionais. Registros sem data informada aparecem abaixo.</p>}
        {!!data.legacy.data?.some(item => !item.start && !item.planning.forecast) && <details className={styles.panel}><summary className={styles.group}>Histórico legado sem data informada</summary><div className={styles.list}>{data.records.filter(item => item.kind === 'legacy' && !item.start && !item.forecast && matchesFilters(item, filters)).map(item => <button key={item.id} type="button" className={styles.button} onClick={() => open(item)}>{item.title} · {item.city || 'Local não informado'}</button>)}</div></details>}
        <div className={styles.main}>
            <section className={styles.panel} aria-label="Visualizações do cronograma"><header className={styles.panelHead}>
                <div role="tablist" aria-label="Visualizações do cronograma" className={styles.tabs}>{CHRONOGRAM_VIEWS.map((item, index) => <button type="button" role="tab" key={item.id} aria-label={item.label} id={`chronogram-tab-${item.id}`} aria-controls={`chronogram-panel-${item.id}`}
                    className={styles.tab} aria-selected={item.id === view} tabIndex={item.id === view ? 0 : -1} onClick={() => onNavigate(item.id)} onKeyDown={event => {
                        const next = event.key === 'ArrowRight' ? (index + 1) % CHRONOGRAM_VIEWS.length : event.key === 'ArrowLeft' ? (index + CHRONOGRAM_VIEWS.length - 1) % CHRONOGRAM_VIEWS.length : event.key === 'Home' ? 0 : event.key === 'End' ? CHRONOGRAM_VIEWS.length - 1 : null;
                        if (next === null) return;
                        event.preventDefault(); document.getElementById(`chronogram-tab-${CHRONOGRAM_VIEWS[next].id}`)?.focus(); onNavigate(CHRONOGRAM_VIEWS[next].id);
                    }}>{item.label}{counts[item.id] !== undefined && <span className={styles.count}>{counts[item.id]}</span>}</button>)}</div>
                {hasPermission(PROJECT_PLANNING_ACCESS.createProject) && <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => setProjectEditor({})}>Novo registro</button>}
            </header>
                <div role="tabpanel" id={`chronogram-panel-${view}`} aria-labelledby={`chronogram-tab-${view}`} tabIndex={0}>
                    {!data.ready ? !data.loading && !data.failed ? <p className={styles.empty}>Aguardando consulta do cronograma.</p> : null
                        : view === 'agenda' ? <ChronogramAgenda {...viewProps} /> : view === 'calendario' ? <ChronogramCalendar {...viewProps} onChange={updateFilters} />
                            : view === 'projetos' ? <ChronogramProjects {...viewProps} /> : <ChronogramPending {...viewProps} />}
                </div>
            </section>
            {data.ready && <ChronogramSidebar {...viewProps} />}
        </div>
        <ChronogramTools key={String(history)} historyInitiallyOpen={history} />
        {selected && <ChronogramRecordDialog selection={selected} today={data.today} onClose={closeRecord} onEdit={record => { void edit(record); }} />}
        {projectEditor && <ProjectServiceDialog id={projectEditor.id} onClose={() => setProjectEditor(null)} />}
        {scheduleEditor && <ScheduleFormDialog open editingSchedule={scheduleEditor} onOpenChange={open => { if (!open) setScheduleEditor(null); }} fetchOpts={options} onSuccess={() => { void client.invalidateQueries({ queryKey: ['schedules'] }); setScheduleEditor(null); }} />}
    </div>;
}
