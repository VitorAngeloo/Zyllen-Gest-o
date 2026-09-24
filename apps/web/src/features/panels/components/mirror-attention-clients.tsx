"use client";

import { useQuery } from '@tanstack/react-query';
import { Phone, UserRound } from 'lucide-react';
import { Button } from '@web/components/ui/button';
import type { PanelReader } from '../api/panel-api';
import styles from './panel-mirror.module.css';

export function MirrorAttentionClients({ reader }: { reader: PanelReader }) {
    const query = useQuery({ queryKey: ['panel-attention-clients', reader.key], queryFn: ({ signal }) => reader.attentionClients!(signal), enabled: !!reader.attentionClients, refetchInterval: 30_000 });
    return <div className={styles.viewState}>
        {query.isError && <div role="alert" className={styles.error}><span>Não foi possível atualizar os clientes de atenção.</span><Button type="button" size="sm" variant="outline" onClick={() => { void query.refetch(); }}>Tentar novamente</Button></div>}
        {query.isLoading && !query.data && <div role="status" className={styles.loading}>Carregando clientes de atenção…</div>}
        {query.data && <div className={styles.attentionView}><div className={styles.contextBar}><span>Clientes definidos pela equipe para acompanhamento próximo</span><span className={styles.updated}><strong>{query.data.length}</strong> selecionado{query.data.length === 1 ? '' : 's'}</span></div>
            {query.data.length ? <ol className={styles.attentionGrid}>{query.data.map((company, index) => <li key={company.id} data-attention-client={company.id} className={styles.attentionClient}>
                <span className={styles.attentionIndex}>{String(index + 1).padStart(2, '0')}</span><div className={styles.attentionIdentity}><h3>{company.name}</h3><div className={styles.attentionContact}>{company.contactName ? <span><UserRound aria-hidden="true" />{company.contactName}</span> : null}{company.contactPhone ? <span><Phone aria-hidden="true" />{company.contactPhone}</span> : null}{!company.contactName && !company.contactPhone ? <span>Contato responsável não informado</span> : null}</div></div>
            </li>)}</ol> : <div className={styles.emptyStage}><strong>Nenhum cliente de atenção definido</strong><p>A seleção pode ser feita na dashboard principal.</p></div>}
        </div>}
    </div>;
}
