"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, X } from "lucide-react";
import type { FollowupChecklistEntry, UpdateChecklistItemInput } from "@zyllen/shared";
import { updateChecklistItemSchema } from "@zyllen/shared";
import type { RequestOptions } from "@web/lib/api-client";
import { followupsApi } from "../api/followups-api";
import { Button } from "@web/components/ui/button";
import { ChecklistComponentSelection } from "./checklist-component-selection";
import { componentInputs, type ChecklistComponentDraft } from "../utils/checklist-components";

const inputClass = "min-w-0 rounded border border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] px-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/40";

export function FollowupChecklistItem({ item, followupId, blockId, fetchOpts, readOnly }: {
    item: FollowupChecklistEntry; followupId: string; blockId: string; fetchOpts: RequestOptions; readOnly: boolean;
}) {
    const qc = useQueryClient();
    const [text, setText] = useState(item.text);
    const [details, setDetails] = useState(item.details ?? "");
    const [quantity, setQuantity] = useState(item.quantity == null ? "" : String(item.quantity));
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState("");
    const savedComponents = JSON.stringify(item.components ?? []);
    const [components, setComponents] = useState<ChecklistComponentDraft[]>(() => (item.components ?? []).map(part => ({ text: part.text, quantity: String(part.quantity) })));
    useEffect(() => setComponents(JSON.parse(savedComponents).map((part: { text: string; quantity: number }) => ({
        text: part.text, quantity: String(part.quantity),
    }))), [savedComponents]);
    useEffect(() => setText(item.text), [item.text]);
    useEffect(() => setDetails(item.details ?? ""), [item.details]);
    useEffect(() => setQuantity(item.quantity == null ? "" : String(item.quantity)), [item.quantity]);

    const refresh = () => {
        qc.invalidateQueries({ queryKey: ["followup", followupId] });
        qc.invalidateQueries({ queryKey: ["followup-history", followupId] });
    };
    const update = useMutation({
        mutationFn: (body: UpdateChecklistItemInput) => followupsApi.updateChecklistItem(followupId, blockId, item.id, body, fetchOpts),
        onSuccess: (_data, body) => {
            setError("");
            refresh();
            if (body.text !== undefined || body.components !== undefined) qc.invalidateQueries({ queryKey: ["followup-checklist-catalog"] });
        },
        onError: (e: Error) => setError(e.message || "Não foi possível salvar o item. Tente novamente."),
    });
    const remove = useMutation({
        mutationFn: () => followupsApi.deleteChecklistItem(followupId, blockId, item.id, fetchOpts),
        onSuccess: refresh,
        onError: (e: Error) => setError(e.message || "Não foi possível remover o item."),
    });
    const busy = update.isPending || remove.isPending;
    const save = (body: UpdateChecklistItemInput) => {
        const valid = updateChecklistItemSchema.safeParse(body);
        if (!valid.success) {
            setError(body.components !== undefined ? "Revise os componentes: cada um precisa de uma quantidade inteira maior que zero."
                : body.quantity !== undefined ? "Informe uma quantidade inteira maior que zero." : "Informe o nome do item (até 500 caracteres).");
            return;
        }
        update.mutate(valid.data);
    };

    return (
        <div className="space-y-2 rounded-md border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)]/60 p-2">
            <div className="flex flex-wrap items-center gap-2">
                <input type="checkbox" checked={item.checked} disabled={readOnly || busy}
                    aria-label={"Concluir " + item.text}
                    onChange={e => save({ checked: e.target.checked })}
                    className="size-5 shrink-0 accent-[var(--zyllen-highlight)]" />
                {readOnly ? (
                    <span className={"min-w-0 flex-1 break-words text-sm " + (item.checked ? "text-[var(--zyllen-muted)] line-through" : "text-white")}>{item.text}</span>
                ) : (
                    <input aria-label={"Nome do item " + item.text} value={text} maxLength={500}
                        onChange={e => setText(e.target.value)}
                        onBlur={() => { if (text.trim() !== item.text) save({ text: text.trim() }); }}
                        className={inputClass + " h-10 flex-1 basis-36 " + (item.checked ? "line-through" : "")} />
                )}
                {readOnly ? (
                    <span className="text-xs text-[var(--zyllen-muted)]">Qtd.: {item.quantity ?? "—"}</span>
                ) : (
                    <label className="flex items-center gap-1 text-xs text-[var(--zyllen-muted)]">
                        Qtd.
                        <input type="number" min={1} max={2147483647} step={1} inputMode="numeric"
                            aria-label={"Quantidade de " + item.text} value={quantity} placeholder="—"
                            aria-describedby={error ? "checklist-error-" + item.id : undefined}
                            onChange={e => setQuantity(e.target.value)}
                            onBlur={() => {
                                if (quantity === "" && item.quantity == null) return;
                                if (Number(quantity) !== item.quantity || quantity === "") save({ quantity: Number(quantity) });
                            }}
                            className={inputClass + " h-10 w-20"} />
                    </label>
                )}
                <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}
                    aria-label={"Detalhes de " + item.text}
                    className="flex size-10 shrink-0 items-center justify-center rounded text-[var(--zyllen-muted)] hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--zyllen-highlight)]">
                    <ChevronDown size={16} className={expanded ? "rotate-180" : ""} />
                    {item.details && !expanded && <span className="size-1.5 rounded-full bg-[var(--zyllen-highlight)]" />}
                </button>
                {!readOnly && (
                    <button type="button" onClick={() => remove.mutate()} disabled={busy} aria-label={"Remover " + item.text}
                        className="flex size-10 shrink-0 items-center justify-center rounded text-[var(--zyllen-error)] hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[var(--zyllen-highlight)]">
                        <X size={16} />
                    </button>
                )}
            </div>
            {(item.components?.length || components.length || !readOnly) ? (readOnly ? (
                <ul className="space-y-1 border-l-2 border-[var(--zyllen-border)] pl-3 text-sm text-[var(--zyllen-muted)]">
                    {(item.components ?? []).map(part => <li key={part.text}>{part.text} — Qtd.: {part.quantity}</li>)}
                </ul>
            ) : (
                <div className="space-y-2">
                    <ChecklistComponentSelection parentName={item.text} options={(item.components ?? []).map(part => ({ ...part, selectedByDefault: true }))}
                        value={components} onChange={setComponents} disabled={busy} />
                    {JSON.stringify(componentInputs(components)) !== savedComponents && (
                        <Button type="button" size="sm" disabled={busy} onClick={() => save({ components: componentInputs(components) })}>Salvar componentes</Button>
                    )}
                </div>
            )) : null}
            {expanded && (readOnly ? (
                <p className="whitespace-pre-wrap text-xs text-[var(--zyllen-muted)]">{item.details || "Sem detalhes"}</p>
            ) : (
                <label className="block text-xs text-[var(--zyllen-muted)]">
                    Detalhes do item
                    <textarea value={details} maxLength={3000} rows={3}
                        onChange={e => setDetails(e.target.value)}
                        onBlur={() => { if (details.trim() !== (item.details ?? "").trim()) save({ details: details.trim() }); }}
                        className={inputClass + " mt-1 w-full py-2"} />
                </label>
            ))}
            {error && <p id={"checklist-error-" + item.id} role="alert" className="text-sm text-[var(--zyllen-error)]">{error}</p>}
            {!readOnly && update.isError && <button type="button" onClick={() => update.variables && save(update.variables)} className="text-sm text-[var(--zyllen-highlight)]">Tentar salvar novamente</button>}
        </div>
    );
}
