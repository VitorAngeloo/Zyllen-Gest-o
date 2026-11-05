"use client";

import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { addChecklistItemsSchema, type AddChecklistItemsInput, type FollowupChecklistCatalogItem } from "@zyllen/shared";
import { Button } from "@web/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@web/components/ui/dialog";
import { useAuth } from "@web/features/auth/context/auth-context";
import { ApiError, type RequestOptions } from "@web/lib/api-client";
import { useDialogFocus } from "@web/lib/use-dialog-focus";
import { followupsApi } from "../api/followups-api";
import { ChecklistComponentSelection } from "./checklist-component-selection";
import { componentInputs, defaultComponentSelection, type ChecklistComponentDraft } from "../utils/checklist-components";

const fieldClass = "w-full min-w-0 rounded-md border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/40";
type Selection = { item: FollowupChecklistCatalogItem; quantity: string; components: ChecklistComponentDraft[] };

export function ChecklistItemPicker({ followupId, blockId, fetchOpts, onClose }: {
    followupId: string; blockId: string; fetchOpts: RequestOptions; onClose: () => void;
}) {
    const qc = useQueryClient();
    const { user } = useAuth();
    const dialogRef = useRef<HTMLDivElement>(null);
    const pendingRequest = useRef<AddChecklistItemsInput | null>(null);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selected, setSelected] = useState<Record<string, Selection>>({});
    const [newText, setNewText] = useState("");
    const [error, setError] = useState("");
    const [uncertain, setUncertain] = useState(false);
    const selections = Object.values(selected);
    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 250);
        return () => clearTimeout(timeout);
    }, [search]);
    const catalog = useInfiniteQuery({
        queryKey: ["followup-checklist-catalog", user?.id, debouncedSearch],
        initialPageParam: 1,
        queryFn: ({ pageParam, signal }) => followupsApi.listChecklistCatalog(debouncedSearch, pageParam, { ...fetchOpts, signal }),
        getNextPageParam: last => last.page * last.limit < last.total ? last.page + 1 : undefined,
    });
    const options = catalog.data?.pages.flatMap(page => page.data) ?? [];
    const toggle = (item: FollowupChecklistCatalogItem) => {
        setError("");
        if (selected[item.id]) {
            setSelected(previous => {
                const next = { ...previous };
                delete next[item.id];
                return next;
            });
        } else if (selections.length < 100) {
            setSelected(previous => ({ ...previous, [item.id]: { item, quantity: "1", components: defaultComponentSelection(item) } }));
        } else {
            setError("Adicione até 100 itens por vez. Depois você pode incluir mais.");
        }
    };
    const create = useMutation({
        mutationFn: () => followupsApi.saveChecklistCatalogItem(newText.trim(), fetchOpts),
        onSuccess: result => {
            qc.invalidateQueries({ queryKey: ["followup-checklist-catalog"] });
            setSelected(previous => previous[result.data.id] ? previous : ({
                ...previous, [result.data.id]: { item: result.data, quantity: "1", components: defaultComponentSelection(result.data) },
            }));
            setNewText("");
        },
    });
    const add = useMutation({
        mutationFn: (body: AddChecklistItemsInput) => followupsApi.addChecklistItems(followupId, blockId, body, fetchOpts),
        onSuccess: result => {
            qc.invalidateQueries({ queryKey: ["followup", followupId] });
            qc.invalidateQueries({ queryKey: ["followup-history", followupId] });
            toast.success(result.data.addedCount === 1 ? "Item adicionado à checklist" : result.data.addedCount + " itens adicionados à checklist");
            onClose();
        },
        onError: (e: Error) => {
            const unknown = !(e instanceof ApiError) || e.status === 0 || e.status >= 500 || e.status === 408;
            setUncertain(unknown);
            if (!unknown) pendingRequest.current = null;
            setError(unknown
                ? "Não foi possível confirmar a inclusão. Tente novamente para verificar o mesmo envio sem duplicar os itens, ou feche para conferir a checklist."
                : e.message);
        },
    });
    const busy = add.isPending || create.isPending;
    const locked = busy || uncertain;
    const close = () => {
        if (busy) return;
        if (uncertain) qc.invalidateQueries({ queryKey: ["followup", followupId] });
        onClose();
    };
    useDialogFocus(dialogRef, close, busy);
    const submit = () => {
        if (pendingRequest.current) {
            add.mutate(pendingRequest.current);
            return;
        }
        const parsed = addChecklistItemsSchema.safeParse({
            requestId: crypto.randomUUID(),
            items: selections.map(({ item, quantity, components }) => ({
                catalogItemId: item.id, quantity: Number(quantity),
                ...((item.components?.length || components.length) ? { components: componentInputs(components) } : {}),
            })),
        });
        if (!parsed.success) {
            setError("Selecione pelo menos um item e informe uma quantidade inteira maior que zero para cada item e componente.");
            return;
        }
        setError("");
        pendingRequest.current = parsed.data;
        add.mutate(parsed.data);
    };

    return (
        <Dialog open onOpenChange={open => { if (!open) close(); }}>
            <DialogContent ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="checklist-picker-title"
                aria-describedby="checklist-picker-description" tabIndex={-1} onClose={close} className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle id="checklist-picker-title">Adicionar itens à checklist</DialogTitle>
                    <DialogDescription id="checklist-picker-description">
                        Selecione os itens do catálogo e confira a quantidade de cada um antes de adicionar.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 p-6">
                    <label className="block space-y-1 text-sm text-white">
                        <span>Buscar no catálogo</span>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-3 text-[var(--zyllen-muted)]" />
                            <input value={search} maxLength={500} onChange={e => setSearch(e.target.value)}
                                className={fieldClass + " pl-9"} placeholder="Digite o nome de um item" />
                        </div>
                    </label>
                    <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-[var(--zyllen-border)] p-2" aria-label="Itens do catálogo" aria-busy={catalog.isFetching}>
                        {catalog.isPending ? <p role="status" className="p-2 text-sm text-[var(--zyllen-muted)]">Carregando catálogo…</p> : (
                            options.map(item => (
                                <label key={item.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded px-2 py-2 text-sm text-white hover:bg-white/5">
                                    <input type="checkbox" checked={!!selected[item.id]} disabled={locked}
                                        aria-label={item.text}
                                        onChange={() => toggle(item)} className="size-5 shrink-0 accent-[var(--zyllen-highlight)]" />
                                    <span className="min-w-0 break-words">{item.text}{!!item.components?.length && (
                                        <span className="ml-2 text-xs text-[var(--zyllen-muted)]">com componentes</span>
                                    )}</span>
                                </label>
                            ))
                        )}
                        {!catalog.isPending && !catalog.isError && !options.length && (
                            <p className="p-2 text-sm text-[var(--zyllen-muted)]">{debouncedSearch ? "Nenhum item encontrado. Você pode cadastrar um novo abaixo." : "O catálogo ainda não tem itens. Cadastre o primeiro abaixo."}</p>
                        )}
                        {catalog.isError && <div role="alert" className="space-y-2 p-2 text-sm text-[var(--zyllen-error)]">
                            <p>Não foi possível carregar os itens do catálogo.</p>
                            <Button variant="outline" type="button" onClick={() => catalog.refetch()}>Tentar novamente</Button>
                        </div>}
                        {catalog.hasNextPage && <Button type="button" variant="ghost" disabled={catalog.isFetchingNextPage}
                            onClick={() => catalog.fetchNextPage()}>{catalog.isFetchingNextPage ? "Carregando…" : "Carregar mais itens"}</Button>}
                    </div>
                    <form className="space-y-2 rounded-md border border-[var(--zyllen-border)] p-3" onSubmit={e => {
                        e.preventDefault();
                        if (newText.trim() && !locked && selections.length < 100) create.mutate();
                    }}>
                        <label className="block space-y-1 text-sm text-white">
                            <span>Cadastrar novo item no catálogo</span>
                            <input value={newText} maxLength={500} disabled={locked}
                                onChange={e => setNewText(e.target.value)} className={fieldClass} placeholder="Nome do novo item" />
                        </label>
                        <Button type="submit" variant="outline" disabled={locked || !newText.trim() || selections.length >= 100}>
                            <Plus size={16} /> {create.isPending ? "Cadastrando…" : "Cadastrar e selecionar"}
                        </Button>
                        <p className="text-xs text-[var(--zyllen-muted)]">O cadastro fica disponível para outras listas. Se o nome já existir, o item existente será selecionado.</p>
                        {create.isError && <p role="alert" className="text-sm text-[var(--zyllen-error)]">{create.error.message}</p>}
                    </form>
                    <section aria-labelledby="checklist-selection-title" className="space-y-2">
                        <h3 id="checklist-selection-title" className="text-sm font-medium text-white">Selecionados ({selections.length})</h3>
                        <p className="text-xs text-[var(--zyllen-muted)]">A seleção é mantida ao buscar outros itens. Até 100 itens por inclusão.</p>
                        {selections.map(({ item, quantity, components }) => (
                            <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-md bg-[var(--zyllen-bg-dark)] p-2">
                                <span className="min-w-0 flex-1 basis-28 break-words text-sm text-white">{item.text}</span>
                                <label className="flex items-center gap-2 text-xs text-[var(--zyllen-muted)]">
                                    Quantidade
                                    <input type="number" min={1} max={2147483647} step={1} inputMode="numeric"
                                        aria-label={"Quantidade de " + item.text} value={quantity} disabled={locked}
                                        onChange={e => {
                                            setError("");
                                            setSelected(previous => ({ ...previous, [item.id]: { ...previous[item.id], quantity: e.target.value } }));
                                        }}
                                        className={fieldClass + " w-24"} />
                                </label>
                                <Button type="button" variant="ghost" size="icon" disabled={locked} aria-label={"Retirar " + item.text + " da seleção"}
                                    onClick={() => toggle(item)}><X size={16} /></Button>
                                <ChecklistComponentSelection parentName={item.text} options={item.components} value={components} disabled={locked}
                                    onChange={next => {
                                        setError("");
                                        setSelected(previous => ({ ...previous, [item.id]: { ...previous[item.id], components: next } }));
                                    }} />
                            </div>
                        ))}
                    </section>
                    {error && <p role="alert" className="text-sm text-[var(--zyllen-error)]">{error}</p>}
                    <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--zyllen-border)] pt-4">
                        <Button type="button" variant="outline" onClick={close} disabled={busy}>{uncertain ? "Fechar e conferir checklist" : "Cancelar"}</Button>
                        <Button type="button" variant="highlight" disabled={busy || !selections.length} onClick={submit}>
                            {add.isPending ? "Adicionando…" : uncertain ? "Verificar e concluir inclusão" : "Adicionar selecionados (" + selections.length + ")"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
