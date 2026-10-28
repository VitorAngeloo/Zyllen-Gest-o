"use client";
import { useState } from 'react';
import { PROJECT_PLANNING_STAGES, PROJECT_PLANNING_STAGE_LABELS, type ProjectPlanning } from '@zyllen/shared';
import { Input } from '@web/components/ui/input';

interface Props { value?: ProjectPlanning | null; disabled?: boolean; scheduled?: boolean; onChange: (value: ProjectPlanning | null) => void }
const selectClass = 'w-full min-w-0 rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] px-3 py-2 text-sm text-white [color-scheme:dark]';
export function ProjectPlanningFields({ value, disabled, scheduled, onChange }: Props) {
    const current = value ?? { stage: null, forecast: null };
    const [precision, setPrecision] = useState<'month' | 'date'>(() => current.forecast?.length === 10 ? 'date' : 'month');
    // Separate drafts avoid silently truncating a day when switching to a month.
    const [drafts, setDrafts] = useState(() => ({ month: current.forecast?.length === 7 ? current.forecast : '', date: current.forecast?.length === 10 ? current.forecast : '' }));
    return <fieldset disabled={disabled} className="space-y-3 rounded-lg border border-[var(--zyllen-border)] p-3">
        <legend className="px-1 text-sm text-white">Planejamento do cronograma</legend>
        <p className="text-xs text-[var(--zyllen-muted)]">A etapa organiza o planejamento. Início, conclusão e cancelamento da execução continuam registrados separadamente.</p>
        <label className="block space-y-1 text-xs text-[var(--zyllen-muted)]"><span>Etapa do cronograma</span>
            <select aria-label="Etapa do cronograma" className={selectClass} value={current.stage ?? ''} onChange={event => onChange({ ...current, stage: event.target.value as ProjectPlanning['stage'] || null })}>
                <option value="">Não informada</option>{PROJECT_PLANNING_STAGES.map(stage => <option key={stage} value={stage}>{PROJECT_PLANNING_STAGE_LABELS[stage]}</option>)}
            </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs text-[var(--zyllen-muted)]"><span>Precisão da previsão</span>
                <select aria-label="Precisão da previsão" className={selectClass} value={precision} onChange={event => {
                    const next = event.target.value as typeof precision; setPrecision(next); onChange({ ...current, forecast: drafts[next] || null });
                }}><option value="month">Somente mês</option><option value="date">Dia previsto</option></select>
            </label>
            <label className="block space-y-1 text-xs text-[var(--zyllen-muted)]"><span>{precision === 'month' ? 'Mês previsto' : 'Dia previsto'}</span>
                <Input aria-label={precision === 'month' ? 'Mês previsto' : 'Dia previsto'} type={precision} min={precision === 'month' ? '1970-01' : '1970-01-01'} max={precision === 'month' ? '9999-12' : '9999-12-31'}
                    value={drafts[precision]} onChange={event => { const text = event.target.value; setDrafts(previous => ({ ...previous, [precision]: text })); onChange({ ...current, forecast: text || null }); }} />
            </label>
        </div>
        <p className="text-xs text-[var(--zyllen-muted)]">{scheduled ? 'O calendário usa o intervalo agendado. A previsão informada é mantida para consulta.' : 'A previsão aparece no cronograma sem confirmar agendamento ou disponibilidade da equipe.'}</p>
        <button type="button" disabled={disabled || !value} className="min-h-10 text-xs text-[var(--zyllen-muted)] underline disabled:opacity-40" onClick={() => { setDrafts({ month: '', date: '' }); onChange(null); }}>Limpar planejamento</button>
    </fieldset>;
}
