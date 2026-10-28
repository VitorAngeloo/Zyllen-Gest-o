"use client";
import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PROJECT_PLANNING_ACCESS } from '@zyllen/shared';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { projectServiceApi } from '@web/features/project-services/api/project-service-api';
import { projectLegacyApi } from '@web/features/project-services/api/project-legacy-api';
import { scheduleApi } from '@web/features/schedule/api/schedule-api';
import { TripDialog } from '@web/features/trips/components/trip-dialog';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@web/components/ui/dialog';
import { useDialogFocus } from '@web/lib/use-dialog-focus';
import type { ChronogramRecord, ChronogramSelection } from '../types/chronogram.types';
import { legacyToChronogram, projectToChronogram, scheduleToChronogram } from '../utils/chronogram-records';
import { displayDay } from '../utils/chronogram-dates';
import { ChronogramCollaboration } from './chronogram-collaboration';
import { ChronogramProjectActions } from './chronogram-project-actions';
import { ChronogramBadges } from './chronogram-record-button';
import styles from './chronogram.module.css';
import { CHRONOGRAM_PLANNING_STAGES, CHRONOGRAM_STAGES } from '../chronogram.constants';

interface Props { selection: ChronogramSelection; today: string; onClose: () => void; onEdit: (record: ChronogramRecord) => void }
function RecordDialog({ selection, today, onClose, onEdit }: Props) {
    const { user, userType, hasPermission } = useAuth();
    const options = useAuthedFetch();
    const ref = useRef<HTMLDivElement>(null), titleId = useId();
    const [busy, setBusy] = useState(false);
    useDialogFocus(ref, onClose, busy);
    const canView = !!user && userType === 'internal' && hasPermission(PROJECT_PLANNING_ACCESS.view);
    const query = useQuery({ queryKey: [selection.kind === 'project' ? 'project-services' : 'schedules', 'chronogram-detail', user?.id, selection.id], enabled: canView,
        queryFn: async ({ signal }) => selection.kind === 'project' ? projectToChronogram(await projectServiceApi.detail(selection.id, { ...options, signal }))
            : selection.kind === 'legacy' ? legacyToChronogram(await projectLegacyApi.detail(selection.id, { ...options, signal }))
                : scheduleToChronogram(await scheduleApi.detail(selection.id, { ...options, signal })), staleTime: 0 });
    const record = query.data;
    if (!canView) return null;
    return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent ref={ref} onClose={busy ? undefined : onClose} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <DialogHeader><DialogTitle id={titleId} className="pr-8" style={{ color: 'var(--plan-text)' }}>{record && query.isFetchedAfterMount && !query.isError ? record.title : 'Card do cronograma'}</DialogTitle></DialogHeader>
        <DialogBody>{query.isError ? <div role="alert" className={styles.details}><p>Não foi possível carregar o card. Tente novamente.</p><button type="button" className={styles.button} onClick={() => { ref.current?.focus({ preventScroll: true }); void query.refetch(); }}>Tentar novamente</button></div>
            : !record || !query.isFetchedAfterMount ? <p role="status" className={styles.muted}>Carregando informações do registro…</p>
                : <div className={styles.details}>
                    {record.legacySource && <section className={styles.notice}><h3>Histórico legado · somente consulta</h3><p>Fonte: {record.legacySource.name} · Registro {record.legacySource.sourceId}</p><p>Importado em {new Date(record.legacySource.importedAt).toLocaleString('pt-BR')}. Autoria histórica não verificada.</p><p>Datas e etapa foram informadas na origem. Não representam agendamento confirmado ou conclusão real no Zyllen.</p></section>}
                    <div><p>{record.company}</p><p className={styles.muted}>{[record.address, record.city, record.state].filter(Boolean).join(' · ') || 'Local não informado'}</p><ChronogramBadges record={record} /></div>
                    {(CHRONOGRAM_PLANNING_STAGES.includes(record.stage) || record.forecast) && <section><h3>Planejamento do cronograma</h3>
                        <p>Etapa: {CHRONOGRAM_PLANNING_STAGES.includes(record.stage) ? CHRONOGRAM_STAGES[record.stage].label : 'Não informada'}</p>
                        <p>Previsão informada: {record.forecast ? displayDay(record.forecast) : 'Não informada'}</p>
                        <p className={styles.muted}>Execução: {CHRONOGRAM_STAGES[record.operationalStatus].label}. A etapa e a previsão não confirmam realização.</p>
                    </section>}
                    <section><h3>{record.kind === 'legacy' ? 'Período informado na origem' : 'Período'}</h3><p>{record.start ? `${displayDay(record.start)}${record.end && record.end !== record.start ? ` a ${displayDay(record.end)}` : ''}` : record.forecast ? `Previsão: ${displayDay(record.forecast)}` : 'Sem data definida'}</p>
                        {record.originalDate && <p className={styles.muted}>Data original: {displayDay(record.originalDate)}</p>}{record.completedDate && <p className={styles.muted}>Concluído em {displayDay(record.completedDate)}</p>}</section>
                    <section><h3>{record.kind === 'legacy' ? 'Técnico informado na origem, sem vínculo automático' : 'Responsáveis'}</h3><p>{record.people.join(', ') || 'Sem responsável definido'}</p></section>
                    <section><h3>Equipamentos e características técnicas</h3>{record.equipment.length > 0 && <p>{record.equipment.join(' · ')}</p>}
                        {record.technical ? <dl className={styles.technical}>{[
                            ['Tipo de sala', record.technical.roomType], ['Formato', record.technical.format], ['Projeções', record.technical.projections],
                            ['Proporção', record.technical.proportion], ['Resolução', record.technical.resolution], ['Totem ou tablet', record.technical.control], ['Som', record.technical.sound],
                        ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Não informado'}</dd></div>)}</dl> : <p className={styles.muted}>Características técnicas não informadas neste registro.</p>}</section>
                    <ChronogramCollaboration record={record} today={today} busy={busy} onBusyChange={setBusy} />
                    <ChronogramProjectActions record={record} busy={busy} onBusyChange={setBusy} onReschedule={() => onEdit(record)} />
                    <div className={styles.row}>{record.kind !== 'legacy' && hasPermission(PROJECT_PLANNING_ACCESS.editProject) && <button type="button" disabled={busy} className={`${styles.button} ${styles.primary}`} onClick={() => onEdit(record)}>{record.kind === 'project' ? 'Editar projeto' : 'Editar agendamento'}</button>}
                        {record.mapsUrl.startsWith('https://') && <a className={styles.button} href={record.mapsUrl} target="_blank" rel="noreferrer">Abrir localização</a>}
                        <button type="button" disabled={busy} className={styles.button} onClick={onClose}>Fechar card</button></div>
                </div>}</DialogBody>
    </DialogContent></Dialog>;
}
export function ChronogramRecordDialog(props: Props) {
    return props.selection.kind === 'trip' ? <TripDialog id={props.selection.id} onClose={props.onClose} /> : <RecordDialog {...props} />;
}
