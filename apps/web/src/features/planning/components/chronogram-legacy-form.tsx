"use client";
import { useId, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { projectLegacyData, projectLegacyUpdateSchema, type ProjectLegacyData, type ProjectLegacyRecord } from '@zyllen/shared';
import { useAuthedFetch } from '@web/features/auth/context/auth-context';
import { projectLegacyApi } from '@web/features/project-services/api/project-legacy-api';
import { ProjectSpecificationFields } from '@web/features/project-services/components/project-specification-fields';
import { ProjectPlanningFields } from '@web/features/project-services/components/project-planning-fields';
import styles from './chronogram.module.css';

interface Props { initial: ProjectLegacyRecord; onDone: () => void; onCancel: () => void; onBusyChange: (busy: boolean) => void }
export function ChronogramLegacyForm({ initial, onDone, onCancel, onBusyChange }: Props) {
    const options = useAuthedFetch(), client = useQueryClient(), fieldId = useId();
    const [data, setData] = useState<ProjectLegacyData>(() => structuredClone(projectLegacyData(initial)));
    const [reason, setReason] = useState(''), [error, setError] = useState(''), [working, setWorking] = useState(false);
    const cancelling = data.planning.stage === 'cancelado' && initial.planning.stage !== 'cancelado';
    function change<K extends keyof ProjectLegacyData>(key: K, value: ProjectLegacyData[K]) { setData(current => ({ ...current, [key]: value })); }
    async function save() {
        if (working) return;
        const parsed = projectLegacyUpdateSchema.safeParse({ expectedVersion: initial.version ?? 0, data, reason });
        if (!parsed.success) { setError(parsed.error.issues.map(item => item.message).join('. ')); return; }
        if (cancelling && reason.trim().length < 5) { setError('Informe a justificativa do cancelamento.'); return; }
        setWorking(true); onBusyChange(true); setError('');
        try {
            await projectLegacyApi.update(initial.id, parsed.data, options);
            await Promise.all(['project-services', 'project-history'].map(key => client.invalidateQueries({ queryKey: [key] })));
            onDone();
        } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível salvar. Seu preenchimento foi mantido.'); }
        finally { setWorking(false); onBusyChange(false); }
    }
    return <form aria-label="Editar dados do registro importado" className={`${styles.collaboration} ${styles.legacyForm}`} onSubmit={event => { event.preventDefault(); void save(); }}>
        <p>Edite os dados do cronograma. A fonte original e o histórico de alterações são preservados.</p>
        <fieldset disabled={working} className={styles.collaboration}>
            <div className={styles.technical}>
                <div className={styles.field}><label htmlFor={`${fieldId}-service`}>Serviço</label><select id={`${fieldId}-service`} value={data.service ?? ''} onChange={event => change('service', event.target.value as ProjectLegacyData['service'] || null)}>
                    <option value="">Não informado</option><option value="INSTALLATION">Instalação</option><option value="REMOVAL">Desinstalação</option><option value="MAINTENANCE">Manutenção ou upgrade</option>
                </select></div>
                <div className={styles.field}><label htmlFor={`${fieldId}-name`}>Cliente</label><input id={`${fieldId}-name`} required maxLength={1000} value={data.name} onChange={event => change('name', event.target.value)} /></div>
                <div className={styles.field}><label htmlFor={`${fieldId}-location`}>Cidade/UF</label><input id={`${fieldId}-location`} maxLength={1000} placeholder="Ex.: Goiânia/GO" value={data.location} onChange={event => change('location', event.target.value)} /></div>
                <div className={styles.field}><label htmlFor={`${fieldId}-technician`}>Técnico responsável</label><input id={`${fieldId}-technician`} maxLength={2000} value={data.technician} onChange={event => change('technician', event.target.value)} /></div>
                {([['start', 'Início'], ['end', 'Fim (se durar mais de um dia)'], ['original', 'Data original (se reagendado)']] as const).map(([key, label]) => <div key={key} className={styles.field}>
                    <label htmlFor={`${fieldId}-${key}`}>{label}</label><input id={`${fieldId}-${key}`} type="date" min="1970-01-01" max="9999-12-31" value={data[key] ?? ''} onChange={event => change(key, event.target.value || null)} />
                </div>)}
            </div>
            <ProjectPlanningFields value={data.planning} onChange={value => change('planning', value ?? { stage: null, forecast: null })} />
            <ProjectSpecificationFields value={data.specifications} onChange={value => change('specifications', value ?? { category: null, equipment: [], room: null })} />
            <div className={styles.field}><label htmlFor={`${fieldId}-notes`}>Observação</label><textarea id={`${fieldId}-notes`} rows={4} maxLength={20000} value={data.notes} onChange={event => change('notes', event.target.value)} /></div>
            {cancelling && <div className={styles.field}><label htmlFor={`${fieldId}-reason`}>Justificativa do cancelamento</label><textarea id={`${fieldId}-reason`} required minLength={5} maxLength={2000} rows={3} value={reason} onChange={event => setReason(event.target.value)} /></div>}
            {error && <p role="alert" className={styles.notice}>{error}</p>}
            <div className={styles.row}><button type="submit" className={`${styles.button} ${styles.primary}`}>{working ? 'Salvando…' : 'Salvar dados'}</button>
                <button type="button" className={styles.button} onClick={onCancel}>Cancelar edição</button></div>
        </fieldset>
    </form>;
}
