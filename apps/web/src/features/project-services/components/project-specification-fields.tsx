"use client";
import { useState } from 'react';
import { projectRoomSpecificationsSchema, type ProjectRoomSpecifications, type ProjectSpecifications } from '@zyllen/shared';
import { Input } from '@web/components/ui/input';
import { Textarea } from '@web/components/ui/textarea';

interface Props { value?: ProjectSpecifications | null; disabled?: boolean; onChange: (value: ProjectSpecifications | null) => void }
const roomFields: [keyof ProjectRoomSpecifications, string][] = [
    ['roomType', 'Tipo de sala'], ['format', 'Formato'], ['projections', 'Projeções'], ['proportion', 'Proporção'],
    ['resolution', 'Resolução'], ['control', 'Totem ou tablet'], ['sound', 'Som'],
];
const selectClass = 'w-full min-w-0 rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] px-3 py-2 text-sm text-white [color-scheme:dark]';

export function ProjectSpecificationFields({ value, disabled, onChange }: Props) {
    const current = value ?? { category: null, equipment: [], room: null };
    const [equipmentText, setEquipmentText] = useState(() => current.equipment.join('\n'));
    const showRoom = current.category === 'sala' || !!current.room && Object.values(current.room).some(Boolean);
    function changeRoom(key: keyof ProjectRoomSpecifications, text: string) {
        onChange({ ...current, room: { ...projectRoomSpecificationsSchema.parse({}), ...current.room, [key]: text } });
    }
    return <fieldset disabled={disabled} className="space-y-3 rounded-lg border border-[var(--zyllen-border)] p-3">
        <legend className="px-1 text-sm text-white">Equipamentos e características técnicas</legend>
        <p className="text-xs text-[var(--zyllen-muted)]">Preencha os dados conhecidos. Campos em branco permanecem não informados.</p>
        <label className="block space-y-1 text-xs text-[var(--zyllen-muted)]"><span>Categoria da instalação</span>
            <select aria-label="Categoria da instalação" className={selectClass} value={current.category ?? ''} onChange={event => onChange({ ...current, category: event.target.value as ProjectSpecifications['category'] || null })}>
                <option value="">Não informada</option><option value="sala">Sala</option><option value="tela">Tela ou totem</option>
            </select>
        </label>
        <label className="block space-y-1 text-xs text-[var(--zyllen-muted)]"><span>Equipamentos (um por linha, com modelo exato)</span>
            <Textarea aria-label="Equipamentos (um por linha, com modelo exato)" autoComplete="off" rows={3} value={equipmentText} onChange={event => {
                setEquipmentText(event.target.value);
                onChange({ ...current, equipment: event.target.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean) });
            }} />
        </label>
        {showRoom && <div className="space-y-3">
            {current.category !== 'sala' && <p className="text-xs text-[var(--zyllen-muted)]">Os dados de sala já preenchidos serão mantidos ao mudar a categoria.</p>}
            <div className="grid gap-3 sm:grid-cols-2">{roomFields.map(([key, label]) => <label key={key} className="block min-w-0 space-y-1 text-xs text-[var(--zyllen-muted)]"><span>{label}</span>
                <Input aria-label={label} autoComplete="off" value={current.room?.[key] ?? ''} maxLength={key === 'roomType' ? 100 : 300} onChange={event => changeRoom(key, event.target.value)} />
            </label>)}</div>
        </div>}
        <button type="button" disabled={disabled || !value} className="min-h-10 text-xs text-[var(--zyllen-muted)] underline disabled:opacity-40" onClick={() => { setEquipmentText(''); onChange(null); }}>Limpar dados técnicos</button>
    </fieldset>;
}
