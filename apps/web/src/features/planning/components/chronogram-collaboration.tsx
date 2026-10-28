"use client";
import { useId, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PROJECT_PLANNING_ACCESS, PROJECT_PENDING_TYPES, projectPendingCreateSchema, projectPendingUpdateSchema, projectNoteCreateSchema, type ProjectPlanningAction } from '@zyllen/shared';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { projectCollaborationApi } from '@web/features/project-services/api/project-collaboration-api';
import { projectLegacyApi } from '@web/features/project-services/api/project-legacy-api';
import type { ChronogramPending, ChronogramRecord } from '../types/chronogram.types';
import { displayDay } from '../utils/chronogram-dates';
import { needsConfirmation } from '../utils/chronogram-selectors';
import styles from './chronogram.module.css';

interface Draft { id: string; type: string; responsible: string; deadline: string; detail: string; version?: number }
interface Props { record: ChronogramRecord; today: string; busy: boolean; onBusyChange: (busy: boolean) => void }
const blankPending = (): Draft => ({ id: crypto.randomUUID(), type: '', responsible: '', deadline: '', detail: '' });
const timestamp = (value: string) => !value ? 'data não informada' : Number.isNaN(Date.parse(value)) ? value : new Date(value).toLocaleString('pt-BR');
export function ChronogramCollaboration({ record, today, busy, onBusyChange }: Props) {
    const { hasPermission } = useAuth(), options = useAuthedFetch(), client = useQueryClient();
    const api = record.kind === 'legacy' ? projectLegacyApi : projectCollaborationApi;
    const allowed = (action: ProjectPlanningAction) => ['project', 'legacy'].includes(record.kind) && record.collaborationAvailable && hasPermission(PROJECT_PLANNING_ACCESS[action]);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [note, setNote] = useState(() => ({ id: crypto.randomUUID(), text: '' }));
    const [working, setWorking] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const heading = useRef<HTMLHeadingElement>(null);
    const fieldId = useId();
    async function perform(action: ProjectPlanningAction, name: string, work: () => Promise<unknown>, success: () => void, message: string) {
        if (working || busy || !allowed(action)) return;
        setWorking(name); setError(''); setNotice(''); onBusyChange(true);
        try {
            await work(); success(); setNotice(message);
            await Promise.all(['project-services', 'project-statistics', 'panel-statistics', 'project-history'].map(key => client.invalidateQueries({ queryKey: [key] })));
        } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível salvar. Tente novamente.'); }
        finally { setWorking(''); onBusyChange(false); requestAnimationFrame(() => heading.current?.focus({ preventScroll: true })); }
    }
    function savePending() {
        if (!draft) return;
        const values = { type: draft.type, responsible: draft.responsible, deadline: draft.deadline || null, detail: draft.detail };
        const parsed = draft.version === undefined ? projectPendingCreateSchema.safeParse({ id: draft.id, ...values }) : projectPendingUpdateSchema.safeParse({ ...values, expectedVersion: draft.version });
        if (!parsed.success) { setError(parsed.error.issues.map(issue => issue.message).join('. ')); return; }
        void perform(draft.version === undefined ? 'createPending' : 'editPending', 'pending', () => draft.version === undefined ? api.addPending(record.sourceId, projectPendingCreateSchema.parse({ id: draft.id, ...values }), options)
            : api.updatePending(record.sourceId, draft.id, projectPendingUpdateSchema.parse({ ...values, expectedVersion: draft.version }), options),
        () => setDraft(null), draft.version === undefined ? 'Pendência adicionada.' : 'Pendência atualizada.');
    }
    function edit(pending: ChronogramPending) { setError(''); setDraft({ ...pending, version: pending.version ?? 0 }); }
    return <>
        <section className={styles.collaboration}><h3 ref={heading} tabIndex={-1}>Ações pendentes</h3>
            {needsConfirmation(record, today) && <p className={styles.notice}>A data prevista já passou. Confira se o serviço foi realizado antes de atualizar seu status.</p>}
            {record.pending.filter(item => item.open).map(item => <article key={item.id} className={styles.pendingItem} data-pending-id={item.id}>
                <p><strong>{item.type}</strong></p><p className={styles.muted}>{item.responsible || 'Sem responsável'}{item.deadline && ` · Prazo: ${displayDay(item.deadline)}`}</p>
                {item.detail && <p>{item.detail}</p>}{item.createdAt && <p className={styles.muted}>Criada em {timestamp(item.createdAt)}{item.createdBy && ` por ${item.createdBy}`}</p>}
                <div className={styles.row}>{allowed('editPending') && <button type="button" disabled={busy || !!working} className={styles.button} onClick={() => edit(item)}>Editar pendência</button>}
                    {allowed('resolvePending') && <button type="button" disabled={busy || !!working} className={styles.button} onClick={() => { void perform('resolvePending', item.id, () => api.resolvePending(record.sourceId, item.id, item.version ?? 0, options), () => { if (draft?.id === item.id) setDraft(null); }, 'Pendência resolvida.'); }}>Resolver pendência</button>}</div>
            </article>)}
            {!needsConfirmation(record, today) && !record.pending.some(item => item.open) && <p className={styles.muted}>Nenhuma ação pendente nos dados deste registro.</p>}
            {record.pending.some(item => !item.open) && <details><summary className={styles.muted}>Ações resolvidas</summary>{record.pending.filter(item => !item.open).map(item => <article key={item.id} className={styles.pendingItem}>
                <p>{item.type}</p>{item.detail && <p>{item.detail}</p>}<p className={styles.muted}>Resolvida em {timestamp(item.resolvedAt)}{item.resolvedBy && ` por ${item.resolvedBy}`}</p>
            </article>)}</details>}
            {allowed('createPending') && !draft && <button type="button" className={styles.button} disabled={busy || !!working} onClick={() => { setError(''); setDraft(blankPending()); }}>Adicionar ação pendente</button>}
            {draft && allowed(draft.version === undefined ? 'createPending' : 'editPending') && <form aria-label="Cadastro de pendência" onSubmit={event => { event.preventDefault(); savePending(); }}>
                <fieldset disabled={busy || !!working} className={styles.collaboration}>
                    <div className={styles.field}><label htmlFor={`${fieldId}-type`}>Tipo de pendência</label><select id={`${fieldId}-type`} required value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value })}>
                        <option value="">Selecione o tipo</option>{draft.type && !PROJECT_PENDING_TYPES.some(type => type === draft.type) && <option>{draft.type}</option>}{PROJECT_PENDING_TYPES.map(type => <option key={type}>{type}</option>)}
                    </select></div>
                    <div className={styles.field}><label htmlFor={`${fieldId}-responsible`}>Responsável pela pendência</label><input id={`${fieldId}-responsible`} maxLength={200} value={draft.responsible} onChange={event => setDraft({ ...draft, responsible: event.target.value })} /></div>
                    <div className={styles.field}><label htmlFor={`${fieldId}-deadline`}>Prazo da pendência</label><input id={`${fieldId}-deadline`} type="date" min="1970-01-01" max="9999-12-31" value={draft.deadline} onChange={event => setDraft({ ...draft, deadline: event.target.value })} /></div>
                    <div className={styles.field}><label htmlFor={`${fieldId}-detail`}>Detalhes da pendência</label><textarea id={`${fieldId}-detail`} rows={3} maxLength={10000} value={draft.detail} onChange={event => setDraft({ ...draft, detail: event.target.value })} /></div>
                    <div className={styles.row}><button className={`${styles.button} ${styles.primary}`} type="submit">{working === 'pending' ? 'Salvando…' : 'Salvar pendência'}</button>
                        <button className={styles.button} type="button" onClick={() => { setDraft(null); setError(''); }}>Cancelar edição da pendência</button></div>
                </fieldset>
            </form>}
        </section>
        <section><h3>Observações</h3><p>{record.notes || 'Sem observações.'}</p></section>
        {(record.collaborationAvailable || record.annotations.length > 0) && <section className={styles.collaboration}><h3>Anotações</h3>
            {record.annotations.length ? [...record.annotations].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).map(item => <article key={item.id} className={styles.pendingItem}><p className={styles.muted}>{timestamp(item.date)} · {item.author}</p><p>{item.text}</p></article>) : <p className={styles.muted}>Nenhuma anotação ainda.</p>}
            {allowed('annotate') && <form aria-label="Nova anotação" onSubmit={event => {
                event.preventDefault(); const parsed = projectNoteCreateSchema.safeParse(note);
                if (!parsed.success) { setError(parsed.error.issues.map(issue => issue.message).join('. ')); return; }
                void perform('annotate', 'note', () => api.addNote(record.sourceId, parsed.data, options), () => setNote({ id: crypto.randomUUID(), text: '' }), 'Anotação adicionada.');
            }}><fieldset disabled={busy || !!working} className={styles.collaboration}><div className={styles.field}><label htmlFor={`${fieldId}-note`}>Texto da anotação</label><textarea id={`${fieldId}-note`} required maxLength={10000} rows={3} value={note.text} onChange={event => setNote(current => ({ ...current, text: event.target.value }))} /></div>
                <button className={`${styles.button} ${styles.primary}`} type="submit">{working === 'note' ? 'Salvando…' : 'Adicionar anotação'}</button></fieldset></form>}
        </section>}
        {error && <div role="alert" className={styles.notice}>{error}</div>}{notice && <p role="status" className={styles.muted}>{notice}</p>}
    </>;
}
