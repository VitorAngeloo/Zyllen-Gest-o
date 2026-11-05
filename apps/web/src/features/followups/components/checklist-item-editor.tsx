"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { updateChecklistItemSchema, type FollowupChecklistEntry, type UpdateChecklistItemInput } from "@zyllen/shared";
import { Button } from "@web/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@web/components/ui/dialog";
import { useAuth } from "@web/features/auth/context/auth-context";
import { useDialogFocus } from "@web/lib/use-dialog-focus";
import type { RequestOptions } from "@web/lib/api-client";
import { followupsApi } from "../api/followups-api";
import { componentInputs, componentNameKey, type ChecklistComponentDraft } from "../utils/checklist-components";
import { ChecklistComponentSelection } from "./checklist-component-selection";

export function ChecklistItemEditor({ item, fetchOpts, busy, onClose, onSave }: {
    item: FollowupChecklistEntry; fetchOpts: RequestOptions; busy: boolean;
    onClose: () => void; onSave: (body: UpdateChecklistItemInput) => Promise<void>;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    const [quantity, setQuantity] = useState(item.quantity == null ? "" : String(item.quantity));
    const [components, setComponents] = useState<ChecklistComponentDraft[]>(() =>
        (item.components ?? []).map(part => ({ text: part.text, quantity: String(part.quantity) })));
    const [error, setError] = useState("");
    const catalog = useQuery({
        queryKey: ["followup-checklist-catalog", user?.id, "item-editor", item.text],
        queryFn: ({ signal }) => followupsApi.listChecklistCatalog(item.text, 1, { ...fetchOpts, signal }),
    });
    const registered = catalog.data?.data.find(option => componentNameKey(option.text) === componentNameKey(item.text));
    const options = registered?.components ?? (item.components ?? []).map(part => ({ text: part.text, quantity: part.quantity, selectedByDefault: true }));
    const close = () => { if (!busy) onClose(); };
    useDialogFocus(ref, close, busy);
    const submit = async () => {
        const parsed = updateChecklistItemSchema.safeParse({ quantity: Number(quantity), components: componentInputs(components) });
        if (!parsed.success) { setError("Informe uma quantidade inteira maior que zero para o item e para cada componente selecionado."); return; }
        setError("");
        try { await onSave(parsed.data); onClose(); }
        catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar. Tente novamente."); }
    };
    return (
        <Dialog open onOpenChange={open => { if (!open) close(); }}>
            <DialogContent ref={ref} role="dialog" aria-modal="true" aria-labelledby="checklist-item-editor-title"
                aria-describedby="checklist-item-editor-description" tabIndex={-1} onClose={close} className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle id="checklist-item-editor-title">Selecionar itens e quantidades</DialogTitle>
                    <DialogDescription id="checklist-item-editor-description">
                        Ajuste a composição de {item.text}. A marcação de OK é feita na página principal.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 p-6">
                    <label className="block space-y-1 text-sm text-white">
                        <span>Quantidade de {item.text}</span>
                        <input type="number" min={1} max={2147483647} step={1} inputMode="numeric" value={quantity} disabled={busy}
                            onChange={e => setQuantity(e.target.value)}
                            className="h-10 w-28 rounded-md border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] px-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/40" />
                    </label>
                    {catalog.isFetching && <p role="status" className="text-sm text-[var(--zyllen-muted)]">Carregando opções de componentes…</p>}
                    {catalog.isError && <p className="text-sm text-[var(--zyllen-muted)]">Não foi possível carregar outras opções. Os componentes atuais continuam disponíveis.</p>}
                    <ChecklistComponentSelection parentName={item.text} options={options} value={components} onChange={setComponents} disabled={busy} />
                    {error && <p role="alert" className="text-sm text-[var(--zyllen-error)]">{error}</p>}
                    <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--zyllen-border)] pt-4">
                        <Button type="button" variant="outline" onClick={close} disabled={busy}>Cancelar</Button>
                        <Button type="button" variant="highlight" onClick={submit} disabled={busy}>{busy ? "Salvando…" : "Salvar itens e quantidades"}</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
