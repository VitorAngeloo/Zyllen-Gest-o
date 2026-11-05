"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { FollowupChecklistComponentTemplate } from "@zyllen/shared";
import { Button } from "@web/components/ui/button";
import { componentNameKey, type ChecklistComponentDraft } from "../utils/checklist-components";

const fieldClass = "min-w-0 rounded-md border border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/40";

export function ChecklistComponentSelection({ parentName, options = [], value, onChange, disabled = false }: {
    parentName: string; options?: FollowupChecklistComponentTemplate[]; value: ChecklistComponentDraft[];
    onChange: (value: ChecklistComponentDraft[]) => void; disabled?: boolean;
}) {
    const [expanded, setExpanded] = useState(options.length > 0 || value.length > 0);
    const [newText, setNewText] = useState("");
    const [error, setError] = useState("");
    const choices = new Map(options.map(component => [componentNameKey(component.text), component]));
    for (const component of value) if (!choices.has(componentNameKey(component.text))) {
        choices.set(componentNameKey(component.text), { text: component.text, quantity: 1, selectedByDefault: false });
    }
    const selected = new Map(value.map(component => [componentNameKey(component.text), component]));
    const include = (text: string, quantity = "1") => {
        const key = componentNameKey(text);
        if (selected.has(key)) return;
        if (value.length >= 100) { setError("Adicione até 100 componentes por item."); return; }
        setError("");
        onChange([...value, { text, quantity }]);
    };
    if (!expanded) return (
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => setExpanded(true)}>
            <Plus size={14} /> Adicionar componentes a {parentName}
        </Button>
    );
    return (
        <div className="w-full space-y-3 border-l-2 border-[var(--zyllen-border)] pl-3" role="group" aria-label={"Componentes de " + parentName}>
            <p className="text-sm font-medium text-white">Componentes de {parentName}</p>
            <p className="text-xs text-[var(--zyllen-muted)]">Confira os componentes e suas quantidades totais. Você pode desmarcar o que não precisa ou incluir outra peça.</p>
            {[...choices].map(([key, component]) => {
                const current = selected.get(key);
                return <div key={key} className="flex flex-wrap items-center gap-2">
                    <label className="flex min-h-10 min-w-0 flex-1 basis-32 items-center gap-2 text-sm text-white">
                        <input type="checkbox" checked={!!current} disabled={disabled}
                            aria-label={"Incluir " + component.text + " em " + parentName}
                            onChange={e => {
                                if (e.target.checked) include(component.text, String(component.quantity));
                                else onChange(value.filter(part => componentNameKey(part.text) !== key));
                            }} className="size-5 shrink-0 accent-[var(--zyllen-highlight)]" />
                        <span className="min-w-0 break-words">{component.text}</span>
                    </label>
                    {current && <label className="flex items-center gap-2 text-xs text-[var(--zyllen-muted)]">
                        Qtd.
                        <input type="number" min={1} max={2147483647} step={1} inputMode="numeric"
                            value={current.quantity} disabled={disabled}
                            aria-label={"Quantidade de " + component.text + " em " + parentName}
                            onChange={e => onChange(value.map(part => componentNameKey(part.text) === key ? { ...part, quantity: e.target.value } : part))}
                            className={fieldClass + " w-24"} />
                    </label>}
                </div>;
            })}
            <div className="space-y-2">
                <label className="block space-y-1 text-xs text-[var(--zyllen-muted)]">
                    <span>Novo componente de {parentName}</span>
                    <input value={newText} maxLength={500} disabled={disabled} onChange={e => setNewText(e.target.value)}
                        className={fieldClass + " w-full"} placeholder="Nome da peça ou acessório"
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (newText.trim()) { include(newText.trim()); setNewText(""); } } }} />
                </label>
                <Button type="button" size="sm" variant="outline" disabled={disabled || !newText.trim() || value.length >= 100}
                    onClick={() => { include(newText.trim()); setNewText(""); }}><Plus size={14} /> Incluir componente</Button>
            </div>
            {error && <p role="alert" className="text-sm text-[var(--zyllen-error)]">{error}</p>}
        </div>
    );
}
