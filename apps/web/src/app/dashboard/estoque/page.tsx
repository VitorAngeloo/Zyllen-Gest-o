"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import { Package, ArrowDownCircle, ArrowUpCircle, History, Search, Plus, Hash, Loader2, TrendingDown, ClipboardList, X } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import Link from "next/link";
import { EMPTY_STATES, TOASTS, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";

function SkuSearchCombobox({ skus, value, onChange }: { skus: any[]; value: string; onChange: (id: string) => void }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const selected = skus?.find((s: any) => s.id === value);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const normalize = (str: string) => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";

    const filtered = query.trim()
        ? skus?.filter((s: any) => {
            const q = normalize(query);
            return normalize(s.name).includes(q)
                || normalize(s.skuCode).includes(q)
                || (s.barcode && normalize(s.barcode).includes(q))
                || (s.brand && normalize(s.brand).includes(q));
        }) ?? []
        : skus ?? [];

    return (
        <div ref={ref} className="relative">
            {selected ? (
                <div className="flex items-center gap-2 h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                    <span className="font-mono text-[var(--zyllen-highlight)] text-xs">{selected.skuCode}</span>
                    <span className="truncate flex-1">{selected.name}</span>
                    {selected.barcode && <span className="text-[var(--zyllen-muted)] text-xs hidden sm:inline">({selected.barcode})</span>}
                    <button type="button" onClick={() => { onChange(""); setQuery(""); }} className="text-[var(--zyllen-muted)] hover:text-white ml-1">
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        placeholder="Buscar por nome, SKU ou código de barras..."
                        className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-9 pr-3 text-sm placeholder:text-[var(--zyllen-muted)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                    />
                </div>
            )}
            {open && !selected && (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] shadow-xl">
                    {filtered.length ? filtered.map((s: any) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => { onChange(s.id); setQuery(""); setOpen(false); }}
                            className="w-full text-left px-3 py-2 hover:bg-[var(--zyllen-highlight)]/10 transition-colors flex items-center gap-2 text-sm border-b border-[var(--zyllen-border)]/30 last:border-0"
                        >
                            <span className="font-mono text-[var(--zyllen-highlight)] text-xs w-16 shrink-0">{s.skuCode}</span>
                            <span className="text-white truncate flex-1">{s.name}</span>
                            {s.barcode && <span className="text-[var(--zyllen-muted)] text-xs shrink-0">{s.barcode}</span>}
                        </button>
                    )) : (
                        <div className="px-3 py-4 text-center text-[var(--zyllen-muted)] text-sm">Nenhum item encontrado</div>
                    )}
                </div>
            )}
            {/* Hidden input for form validation */}
            <input type="text" value={value} required tabIndex={-1} className="sr-only" onChange={() => {}} />
        </div>
    );
}

export default function EstoquePage() {
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [tab, setTab] = useState<"balances" | "entry" | "exit" | "movements">("balances");
    const [entryForm, setEntryForm] = useState({ skuId: "", locationId: "", transferToId: "", quantity: 1, pin: "", reason: "" });
    const [exitForm, setExitForm] = useState({ skuId: "", locationId: "", quantity: 1, pin: "", motivo: "", reason: "" });

    const { data: balances, isLoading: loadingBalances } = useQuery({
        queryKey: ["balances"],
        queryFn: () => apiClient.get<{ data: any[] }>("/inventory/balances", fetchOpts),
    });
    const { data: movements, isLoading: loadingMovements } = useQuery({
        queryKey: ["movements"],
        queryFn: () => apiClient.get<{ data: any[] }>("/inventory/movements", fetchOpts),
        enabled: tab === "movements",
    });
    const { data: skus } = useQuery({
        queryKey: ["skus"],
        queryFn: () => apiClient.get<{ data: any[] }>("/catalog/skus", fetchOpts),
    });
    const { data: locations } = useQuery({
        queryKey: ["locations"],
        queryFn: () => apiClient.get<{ data: any[] }>("/locations", fetchOpts),
    });
    const { data: movementTypes } = useQuery({
        queryKey: ["movementTypes"],
        queryFn: () => apiClient.get<{ data: any[] }>("/inventory/movement-types", fetchOpts),
    });

    const findTypeId = (name: string) => movementTypes?.data?.find((t: any) => t.name.toLowerCase() === name.toLowerCase())?.id;

    const entryMut = useMutation({
        mutationFn: async (data: any) => {
            const entradaId = findTypeId("Entrada");
            const transferenciaId = findTypeId("Transferência") || entradaId;
            if (data.transferToId) {
                const saidaId = findTypeId("Saída") || entradaId;
                await apiClient.post("/inventory/exit", { skuId: data.skuId, fromLocationId: data.locationId, qty: data.quantity, movementTypeId: saidaId, pin: data.pin, reason: data.reason || "Transferência entre locais" }, fetchOpts);
                await apiClient.post("/inventory/entry", { skuId: data.skuId, toLocationId: data.transferToId, qty: data.quantity, movementTypeId: transferenciaId || entradaId, pin: data.pin, reason: data.reason || "Transferência entre locais" }, fetchOpts);
            } else {
                await apiClient.post("/inventory/entry", { skuId: data.skuId, toLocationId: data.locationId, qty: data.quantity, movementTypeId: entradaId, pin: data.pin, reason: data.reason || undefined }, fetchOpts);
            }
        },
        onSuccess: () => { toast.success(entryForm.transferToId ? TOASTS.transferDone : TOASTS.entryRegistered); qc.invalidateQueries({ queryKey: ["balances"] }); qc.invalidateQueries({ queryKey: ["movements"] }); setEntryForm({ skuId: "", locationId: "", transferToId: "", quantity: 1, pin: "", reason: "" }); },
        onError: (e: any) => toast.error(e.message),
    });
    const exitMut = useMutation({
        mutationFn: (data: any) => {
            const saidaId = findTypeId("Saída");
            const reasonText = [data.motivo, data.reason].filter(Boolean).join(" — ");
            return apiClient.post("/inventory/exit", { skuId: data.skuId, fromLocationId: data.locationId, qty: data.quantity, movementTypeId: saidaId, pin: data.pin, reason: reasonText || undefined }, fetchOpts);
        },
        onSuccess: () => { toast.success(TOASTS.exitRegistered); qc.invalidateQueries({ queryKey: ["balances"] }); qc.invalidateQueries({ queryKey: ["movements"] }); setExitForm({ skuId: "", locationId: "", quantity: 1, pin: "", motivo: "", reason: "" }); },
        onError: (e: any) => toast.error(e.message),
    });

    const tabs = [
        { key: "balances", label: "Saldos", icon: Package },
        { key: "entry", label: "Entrada", icon: ArrowDownCircle },
        { key: "exit", label: "Saída", icon: ArrowUpCircle },
        { key: "movements", label: "Histórico", icon: History },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Package className="text-[var(--zyllen-highlight)]" /> Estoque
                </h1>
                <p className="text-sm text-[var(--zyllen-muted)] mt-1">{PAGE_DESCRIPTIONS.estoque}</p>
                <div className="flex gap-2 flex-wrap">
                    <Link href="/dashboard/equipamentos">
                        <Button variant="outline" className="border-[var(--zyllen-border)] text-white hover:bg-[var(--zyllen-highlight)]/10 hover:text-[var(--zyllen-highlight)] hover:border-[var(--zyllen-highlight)]/30 gap-2">
                            <ClipboardList size={16} /> Equipamentos
                        </Button>
                    </Link>
                    <Link href="/dashboard/saidas">
                        <Button variant="outline" className="border-[var(--zyllen-border)] text-white hover:bg-[var(--zyllen-highlight)]/10 hover:text-[var(--zyllen-highlight)] hover:border-[var(--zyllen-highlight)]/30 gap-2">
                            <TrendingDown size={16} /> Saída de Produtos
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[var(--zyllen-bg)] rounded-xl p-1 border border-[var(--zyllen-border)] w-fit">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key
                                ? "bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg)]"
                                : "text-[var(--zyllen-muted)] hover:text-white"
                            }`}
                    >
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {tab === "balances" && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <CardTitle className="text-white">Saldo por Local × SKU</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingBalances ? (
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-6 w-10 ml-auto" />
                                    </div>
                                ))}
                            </div>
                        ) : balances?.data?.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--zyllen-border)]">
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">SKU</th>
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Item</th>
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Local</th>
                                            <th className="text-right py-3 text-[var(--zyllen-muted)] font-medium">Qtd</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {balances.data.map((b: any) => (
                                            <tr key={b.id} className="border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02]">
                                                <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{b.sku?.skuCode}</td>
                                                <td className="py-3 text-white">{b.sku?.name}</td>
                                                <td className="py-3 text-[var(--zyllen-muted)]">{b.location?.name}</td>
                                                <td className="py-3 text-right">
                                                    <Badge variant={b.quantity > 0 ? "success" : "destructive"}>{b.quantity}</Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Package size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/50" />
                                <p className="text-[var(--zyllen-muted)]">{EMPTY_STATES.balances}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {tab === "entry" && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-lg">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <ArrowDownCircle className="text-emerald-400" /> Entrada de Estoque
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={(e) => { e.preventDefault(); entryMut.mutate(entryForm); }}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Produto</Label>
                                <SkuSearchCombobox skus={skus?.data ?? []} value={entryForm.skuId} onChange={(id) => setEntryForm({ ...entryForm, skuId: id })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Local</Label>
                                <select value={entryForm.locationId} onChange={(e) => setEntryForm({ ...entryForm, locationId: e.target.value })} required className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                    <option value="">Selecione...</option>
                                    {locations?.data?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Quantidade</Label>
                                    <Input type="number" min={1} value={entryForm.quantity} onChange={(e) => setEntryForm({ ...entryForm, quantity: +e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">PIN</Label>
                                    <Input type="password" maxLength={4} placeholder="••••" value={entryForm.pin} onChange={(e) => setEntryForm({ ...entryForm, pin: e.target.value })} required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-center tracking-widest" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Transferir para</Label>
                                <select value={entryForm.transferToId} onChange={(e) => setEntryForm({ ...entryForm, transferToId: e.target.value })} className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                    <option value="">Nenhum (entrada simples)</option>
                                    {locations?.data?.filter((l: any) => l.id !== entryForm.locationId).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Motivo</Label>
                                <Input value={entryForm.reason} onChange={(e) => setEntryForm({ ...entryForm, reason: e.target.value })} placeholder="Compra, reposição..." className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            <Button type="submit" variant="highlight" className="w-full" disabled={entryMut.isPending}>
                                {entryMut.isPending ? "Registrando..." : entryForm.transferToId ? "Transferir" : "Registrar Entrada"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {tab === "exit" && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-lg">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <ArrowUpCircle className="text-rose-400" /> Saída de Estoque
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={(e) => { e.preventDefault(); exitMut.mutate(exitForm); }}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Produto</Label>
                                <SkuSearchCombobox skus={skus?.data ?? []} value={exitForm.skuId} onChange={(id) => setExitForm({ ...exitForm, skuId: id })} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Local</Label>
                                <select value={exitForm.locationId} onChange={(e) => setExitForm({ ...exitForm, locationId: e.target.value })} required className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                    <option value="">Selecione...</option>
                                    {locations?.data?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Motivo da Saída</Label>
                                <select value={exitForm.motivo} onChange={(e) => setExitForm({ ...exitForm, motivo: e.target.value })} required className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                    <option value="">Selecione...</option>
                                    <option value="Uso">Uso</option>
                                    <option value="Perda">Perda</option>
                                    <option value="Cliente">Cliente</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Quantidade</Label>
                                    <Input type="number" min={1} value={exitForm.quantity} onChange={(e) => setExitForm({ ...exitForm, quantity: +e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">PIN</Label>
                                    <Input type="password" maxLength={4} placeholder="••••" value={exitForm.pin} onChange={(e) => setExitForm({ ...exitForm, pin: e.target.value })} required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-center tracking-widest" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Motivo</Label>
                                <Input value={exitForm.reason} onChange={(e) => setExitForm({ ...exitForm, reason: e.target.value })} placeholder="Detalhes adicionais..." className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            <Button type="submit" variant="highlight" className="w-full" disabled={exitMut.isPending}>
                                {exitMut.isPending ? "Registrando..." : "Registrar Saída"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {tab === "movements" && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <CardTitle className="text-white">Histórico de Movimentações</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingMovements ? (
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <Skeleton className="h-4 w-28" />
                                        <Skeleton className="h-6 w-16" />
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-4 w-8 ml-auto" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                ))}
                            </div>
                        ) : movements?.data?.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--zyllen-border)]">
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Data</th>
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Tipo</th>
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">SKU</th>
                                            <th className="text-right py-3 text-[var(--zyllen-muted)] font-medium">Qtd</th>
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Motivo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movements.data.map((m: any) => (
                                            <tr key={m.id} className="border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02]">
                                                <td className="py-3 text-[var(--zyllen-muted)] text-xs">{new Date(m.createdAt).toLocaleString("pt-BR")}</td>
                                                <td className="py-3">
                                                    <Badge variant={m.toLocationId ? "success" : "destructive"}>
                                                        {m.type?.name ?? (m.toLocationId ? "Entrada" : "Saída")}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{m.sku?.skuCode}</td>
                                                <td className="py-3 text-right text-white font-semibold">{m.qty}</td>
                                                <td className="py-3 text-[var(--zyllen-muted)]">{m.reason ?? "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <History size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/50" />
                                <p className="text-[var(--zyllen-muted)]">{EMPTY_STATES.movements}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
