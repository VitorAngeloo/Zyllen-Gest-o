"use client";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PROJECT_PLANNING_ACCESS } from '@zyllen/shared';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { projectActionsApi } from '@web/features/project-services/api/project-actions-api';
import { projectLegacyApi } from '@web/features/project-services/api/project-legacy-api';
import styles from './chronogram.module.css';
const labels: Record<string, string> = {
    PROJECT_LEGACY_UPDATE: 'Dados importados atualizados', PROJECT_LEGACY_PLANNING: 'Planejamento atualizado', PROJECT_LEGACY_OBSERVATIONS: 'Observações atualizadas', PROJECT_LEGACY_CANCEL: 'Cancelamento justificado',
    PROJECT_LEGACY_PENDING_CREATE: 'Pendência criada', PROJECT_LEGACY_PENDING_UPDATE: 'Pendência atualizada', PROJECT_LEGACY_PENDING_RESOLVE: 'Pendência resolvida', PROJECT_LEGACY_NOTE_CREATE: 'Anotação adicionada',
    PROJECT_SERVICE_CREATE: 'Projeto cadastrado', PROJECT_SERVICE_UPDATE: 'Cadastro atualizado', PROJECT_SERVICE_STATUS: 'Execução atualizada',
    SCHEDULE_CREATE: 'Agendamento criado', SCHEDULE_UPDATE: 'Agendamento atualizado', PROJECT_PLANNING_CHANGE: 'Planejamento atualizado',
    PROJECT_OBSERVATIONS_CHANGE: 'Observações atualizadas', PROJECT_CANCEL_WITH_REASON: 'Cancelamento justificado',
    PROJECT_PENDING_CREATE: 'Pendência criada', PROJECT_PENDING_UPDATE: 'Pendência atualizada', PROJECT_PENDING_RESOLVE: 'Pendência resolvida', PROJECT_NOTE_CREATE: 'Anotação adicionada',
};
export function ChronogramHistory({ id, legacy = false }: { id: string; legacy?: boolean }) {
    const [open, setOpen] = useState(false), [page, setPage] = useState(1);
    const { user, hasPermission } = useAuth(), options = useAuthedFetch();
    const query = useQuery({ queryKey: ['project-history', user?.id, legacy ? 'legacy' : 'project', id, page], enabled: open && hasPermission(PROJECT_PLANNING_ACCESS.history), queryFn: ({ signal }) => (legacy ? projectLegacyApi : projectActionsApi).history(id, page, { ...options, signal }) });
    return <section className={styles.collaboration}><button type="button" aria-expanded={open} className={styles.button} onClick={() => setOpen(!open)}>Histórico do projeto</button>
        {open && <div className={styles.collaboration} aria-label="Histórico do projeto">
            {query.isError ? <div role="alert">Não foi possível consultar o histórico. <button type="button" className={styles.button} onClick={() => { void query.refetch(); }}>Tentar consultar novamente</button></div>
                : !query.data ? <p role="status">Consultando histórico…</p> : <>
                    {!query.data.data.length && <p className={styles.muted}>Nenhuma alteração registrada.</p>}
                    {query.data.data.map(item => <article key={item.id} className={styles.pendingItem}><p><strong>{labels[item.action] ?? 'Registro atualizado'}</strong></p><p className={styles.muted}>{new Date(item.createdAt).toLocaleString('pt-BR')} · {item.author}</p>
                        {item.reason && <p>Justificativa: {item.reason}</p>}{item.changes.map((change, index) => <div key={index}><p>{change.field}</p><p className={styles.muted}>Antes: {change.before || 'Não informado'}</p><p>Depois: {change.after || 'Não informado'}</p></div>)}</article>)}
                    {query.data.total > query.data.limit && <div className={styles.row}><button className={styles.button} type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior no histórico</button><span>Página {page}</span>
                        <button className={styles.button} type="button" disabled={page * query.data.limit >= query.data.total} onClick={() => setPage(page + 1)}>Próxima no histórico</button></div>}
                </>}
        </div>}
    </section>;
}
