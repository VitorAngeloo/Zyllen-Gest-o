"use client";
import { useId, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PROJECT_PLANNING_ACCESS, PROJECT_PLANNING_STAGES, PROJECT_PLANNING_STAGE_LABELS, projectPlanningChangeSchema, projectCancellationSchema, type ProjectPlanningStage, type ProjectPlanningAction } from '@zyllen/shared';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { projectActionsApi } from '@web/features/project-services/api/project-actions-api';
import type { ChronogramRecord } from '../types/chronogram.types';
import { ChronogramHistory } from './chronogram-history';
import styles from './chronogram.module.css';

export function ChronogramProjectActions({ record, busy, onBusyChange, onReschedule }: { record: ChronogramRecord; busy: boolean; onBusyChange: (busy: boolean) => void; onReschedule: () => void }) {
    const { hasPermission } = useAuth(), options = useAuthedFetch(), client = useQueryClient(), fieldId = useId();
    const [mode, setMode] = useState(''), [stage, setStage] = useState(record.planning?.stage ?? ''), [notes, setNotes] = useState(record.notes), [reason, setReason] = useState('');
    const [working, setWorking] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const [baseline, setBaseline] = useState({ planning: record.planning, notes: record.notes, status: record.operationalStatus });
    function begin(nextMode: string) { setBaseline({ planning: record.planning, notes: record.notes, status: record.operationalStatus }); setMode(nextMode); setError(''); }
    if (!record.actionsAvailable || record.kind !== 'project') return null;
    const canEdit = hasPermission(PROJECT_PLANNING_ACCESS.editProject), canCancel = hasPermission(PROJECT_PLANNING_ACCESS.cancel);
    async function save(action: ProjectPlanningAction, work: () => Promise<unknown>, message: string) {
        if (working || busy || !hasPermission(PROJECT_PLANNING_ACCESS[action])) return;
        setWorking(true); onBusyChange(true); setError(''); setNotice('');
        try { await work(); setMode(''); setNotice(message); await Promise.all(['project-services', 'schedules', 'project-statistics', 'project-history', 'panel-statistics'].map(key => client.invalidateQueries({ queryKey: [key] }))); }
        catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível salvar. Tente novamente.'); }
        finally { setWorking(false); onBusyChange(false); }
    }
    return <section className={styles.collaboration}><h3>Ações do projeto</h3>
        {(canEdit || canCancel) && <>
            <div className={styles.row}>{canEdit && <><button type="button" disabled={busy || working} className={styles.button} onClick={() => { setStage(record.planning?.stage ?? ''); begin('stage'); }}>Alterar etapa</button>
                <button type="button" disabled={busy || working} className={styles.button} onClick={() => { setNotes(record.notes); begin('notes'); }}>Editar observações</button>
                <button type="button" disabled={busy || working} className={styles.button} onClick={onReschedule}>Reagendar projeto</button></>}
                {canCancel && record.operationalStatus !== 'CANCELLED' && <button type="button" disabled={busy || working} className={styles.button} onClick={() => begin('cancel')}>Cancelar projeto</button>}</div>
            {mode && <form aria-label="Ação rápida do projeto" onSubmit={event => {
                event.preventDefault();
                if (mode === 'stage') {
                    const parsed = projectPlanningChangeSchema.safeParse({ expected: baseline.planning, next: { stage: stage || null, forecast: baseline.planning?.forecast ?? null } });
                    if (!parsed.success) { setError('Selecione uma etapa válida.'); return; }
                    void save('editProject', () => projectActionsApi.planning(record.sourceId, parsed.data, options), 'Etapa atualizada; a execução e a previsão foram preservadas.');
                } else if (mode === 'notes') void save('editProject', () => projectActionsApi.observations(record.sourceId, { expected: baseline.notes, next: notes }, options), 'Observações atualizadas.');
                else {
                    const parsed = projectCancellationSchema.safeParse({ reason, expectedStatus: baseline.status });
                    if (!parsed.success) { setError('Informe a justificativa do cancelamento.'); return; }
                    void save('cancel', () => projectActionsApi.cancel(record.sourceId, parsed.data, options), 'Projeto cancelado. Dados e histórico preservados.');
                }
            }}><fieldset disabled={busy || working} className={styles.collaboration}>
                {mode === 'stage' ? <div className={styles.field}><label htmlFor={`${fieldId}-stage`}>Nova etapa</label><select id={`${fieldId}-stage`} value={stage} onChange={event => setStage(event.target.value as ProjectPlanningStage | '')}><option value="">Não informada</option>{PROJECT_PLANNING_STAGES.map(item => <option key={item} value={item}>{PROJECT_PLANNING_STAGE_LABELS[item]}</option>)}</select></div>
                    : mode === 'notes' ? <div className={styles.field}><label htmlFor={`${fieldId}-notes`}>Observações do projeto</label><textarea id={`${fieldId}-notes`} rows={3} maxLength={10000} value={notes} onChange={event => setNotes(event.target.value)} /></div>
                        : <><p>O cancelamento preserva o cadastro, as pendências e o histórico. Confira a situação da execução antes de confirmar.</p><div className={styles.field}><label htmlFor={`${fieldId}-reason`}>Justificativa do cancelamento</label><textarea id={`${fieldId}-reason`} required rows={3} maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} /></div></>}
                <div className={styles.row}><button type="submit" className={`${styles.button} ${styles.primary}`}>{working ? 'Salvando…' : mode === 'cancel' ? 'Confirmar cancelamento' : 'Salvar alteração'}</button><button type="button" className={styles.button} onClick={() => setMode('')}>Voltar ao card</button></div>
            </fieldset></form>}
        </>}
        {error && <p role="alert" className={styles.notice}>{error}</p>}{notice && <p role="status">{notice}</p>}
        <ChronogramHistory id={record.sourceId} />
    </section>;
}
