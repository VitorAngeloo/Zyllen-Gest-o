"use client";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { projectServiceApi } from '@web/features/project-services/api/project-service-api';
import { ProjectMarkerSettings } from '@web/features/project-services/components/project-marker-settings';
import { ScheduleWorkspace } from '@web/features/schedule/components/schedule-workspace';
import StructuresScreen from '@web/features/structures/screens/structures-screen';
import styles from './chronogram.module.css';

function MarkerSettings() {
    const { user } = useAuth(), options = useAuthedFetch();
    const query = useQuery({ queryKey: ['project-service-options', user?.id], queryFn: ({ signal }) => projectServiceApi.options({ ...options, signal }) });
    return query.isError ? <div role="alert"><p>Não foi possível carregar os marcadores.</p><button type="button" className={styles.button} onClick={() => { void query.refetch(); }}>Tentar novamente</button></div>
        : query.data ? <ProjectMarkerSettings markers={query.data.markers} onCreated={async () => { await query.refetch(); }} /> : <p role="status" className={styles.muted}>Carregando marcadores…</p>;
}
export function ChronogramTools({ historyInitiallyOpen }: { historyInitiallyOpen: boolean }) {
    const { hasPermission } = useAuth();
    const [history, setHistory] = useState(historyInitiallyOpen), [agenda, setAgenda] = useState(false), [markers, setMarkers] = useState(false);
    const [view, setView] = useState<'calendario' | 'agendamentos'>('agendamentos');
    return <div className={styles.extras}>
        <details open={agenda} onToggle={event => setAgenda(event.currentTarget.open)}><summary>Compromissos avulsos e recorrências</summary><div className={styles.extrasContent}>{agenda && <ScheduleWorkspace section="agenda" view={view} onViewChange={setView} />}</div></details>
        <details open={history} onToggle={event => setHistory(event.currentTarget.open)}><summary>Histórico de instalações</summary><div className={styles.extrasContent}>{history && <StructuresScreen />}</div></details>
        {hasPermission('schedule.create') && <details open={markers} onToggle={event => setMarkers(event.currentTarget.open)}><summary>Configurações de projetos</summary><div className={styles.extrasContent}>{markers && <MarkerSettings />}</div></details>}
    </div>;
}
