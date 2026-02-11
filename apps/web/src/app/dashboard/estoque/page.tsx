"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import { Package, ArrowDownCircle, ArrowUpCircle, History, Search, Plus, Hash } from "lucide-react";

export default function EstoquePage() {
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [tab, setTab] = useState<"balances" | "entry" | "exit" | "movements">("balances");
    const [entryForm, setEntryForm] = useState({ skuId: "", locationId: "", quantity: 1, pin: "", reason: "" });
    const [exitForm, setExitForm] = useState({ skuId: "", locationId: "", quantity: 1, pin: "", movementTypeId: "", reason: "" });

    const { data: balances } = useQuery({
        queryKey: ["balances"],
        queryFn: () => apiClient.get<{ data: any[] }>("/inventory/balances", fetchOpts),
    });
    const { data: movements } = useQuery({
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

    const entryMut = useMutation({
        mutationFn: (data: any) => apiClient.post("/inventory/entry", data, fetchOpts),
        onSuccess: () => { toast.success("Entrada registrada!"); qc.invalidateQueries({ queryKey: ["balances"] }); setEntryForm({ skuId: "", locationId: "", quantity: 1, pin: "", reason: "" }); },
        onError: (e: any) => toast.error(e.message),
    });
    const exitMut = useMutation({
        mutationFn: (data: any) => apiClient.post("/inventory/exit", data, fetchOpts),
        onSuccess: () => { toast.success("Saída registrada!"); qc.invalidateQueries({ queryKey: ["balances"] }); setExitForm({ skuId: "", locationId: "", quantity: 1, pin: "", movementTypeId: "", reason: "" }); },
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
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Package className="text-[var(--zyllen-highlight)]" /> Estoque
            </h1>

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
                        {balances?.data?.length ? (
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
                            <p className="text-[var(--zyllen-muted)] text-center py-8">Sem saldos registrados</p>
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
                                <Label className="text-[var(--zyllen-muted)]">SKU</Label>
                                <select value={entryForm.skuId} onChange={(e) => setEntryForm({ ...entryForm, skuId: e.target.value })} required className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                    <option value="">Selecione...</option>
                                    {skus?.data?.map((s: any) => <option key={s.id} value={s.id}>{s.skuCode} — {s.name}</option>)}
                                </select>
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
                                <Label className="text-[var(--zyllen-muted)]">Motivo</Label>
                                <Input value={entryForm.reason} onChange={(e) => setEntryForm({ ...entryForm, reason: e.target.value })} placeholder="Compra, transferência..." className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            <Button type="submit" variant="highlight" className="w-full" disabled={entryMut.isPending}>
                                {entryMut.isPending ? "Registrando..." : "Registrar Entrada"}
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
                                <Label className="text-[var(--zyllen-muted)]">SKU</Label>
                                <select value={exitForm.skuId} onChange={(e) => setExitForm({ ...exitForm, skuId: e.target.value })} required className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                    <option value="">Selecione...</option>
                                    {skus?.data?.map((s: any) => <option key={s.id} value={s.id}>{s.skuCode} — {s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Local</Label>
                                <select value={exitForm.locationId} onChange={(e) => setExitForm({ ...exitForm, locationId: e.target.value })} required className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                    <option value="">Selecione...</option>
                                    {locations?.data?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Tipo de Movimentação</Label>
                                <select value={exitForm.movementTypeId} onChange={(e) => setExitForm({ ...exitForm, movementTypeId: e.target.value })} required className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                    <option value="">Selecione...</option>
                                    {movementTypes?.data?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
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
                                <Input value={exitForm.reason} onChange={(e) => setExitForm({ ...exitForm, reason: e.target.value })} placeholder="Uso, perda..." className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
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
                        {movements?.data?.length ? (
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
                                                    <Badge variant={m.type === "ENTRY" ? "success" : "destructive"}>
                                                        {m.type === "ENTRY" ? "Entrada" : "Saída"}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{m.sku?.skuCode}</td>
                                                <td className="py-3 text-right text-white font-semibold">{m.quantity}</td>
                                                <td className="py-3 text-[var(--zyllen-muted)]">{m.reason ?? "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-[var(--zyllen-muted)] text-center py-8">Nenhuma movimentação</p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
