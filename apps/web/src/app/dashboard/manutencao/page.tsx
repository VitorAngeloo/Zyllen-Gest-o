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
import { Wrench, Plus } from "lucide-react";

export default function ManutencaoPage() {
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ assetId: "", notes: "" });

    const { data: osList } = useQuery({
        queryKey: ["maintenance"],
        queryFn: () => apiClient.get<{ data: any[] }>("/maintenance", fetchOpts),
    });
    const { data: assets } = useQuery({
        queryKey: ["assets"],
        queryFn: () => apiClient.get<{ data: any[] }>("/assets", fetchOpts),
        enabled: showCreate,
    });

    const openOS = useMutation({
        mutationFn: (data: any) => apiClient.post("/maintenance", data, fetchOpts),
        onSuccess: () => { toast.success("OS aberta!"); qc.invalidateQueries({ queryKey: ["maintenance"] }); setShowCreate(false); setForm({ assetId: "", notes: "" }); },
        onError: (e: any) => toast.error(e.message),
    });

    const updateStatus = useMutation({
        mutationFn: (data: { id: string; status: string; notes?: string }) => apiClient.put(`/maintenance/${data.id}/status`, { status: data.status, notes: data.notes }, fetchOpts),
        onSuccess: () => { toast.success("Status atualizado!"); qc.invalidateQueries({ queryKey: ["maintenance"] }); },
        onError: (e: any) => toast.error(e.message),
    });

    const statusColor: Record<string, "warning" | "default" | "success"> = {
        OPEN: "warning", IN_PROGRESS: "default", CLOSED: "success",
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Wrench className="text-[var(--zyllen-highlight)]" /> Manutenção
                </h1>
                <Button variant="highlight" onClick={() => setShowCreate(!showCreate)}>
                    <Plus size={16} /> Abrir OS
                </Button>
            </div>

            {showCreate && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-highlight)]/20 max-w-lg">
                    <CardHeader><CardTitle className="text-white">Abrir Ordem de Serviço</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={(e) => { e.preventDefault(); openOS.mutate(form); }} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Patrimônio</Label>
                                <select value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })} required className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                    <option value="">Selecione...</option>
                                    {assets?.data?.map((a: any) => <option key={a.id} value={a.id}>{a.assetCode} — {a.sku?.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Observações</Label>
                                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full h-24 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 py-2 text-sm resize-none" placeholder="Descreva o problema..." />
                            </div>
                            <Button type="submit" variant="highlight" className="w-full" disabled={openOS.isPending}>Abrir OS</Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                <CardHeader><CardTitle className="text-white">Ordens de Serviço</CardTitle></CardHeader>
                <CardContent>
                    {osList?.data?.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--zyllen-border)]">
                                        <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Patrimônio</th>
                                        <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Item</th>
                                        <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Status</th>
                                        <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Data</th>
                                        <th className="text-right py-3 text-[var(--zyllen-muted)] font-medium">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {osList.data.map((os: any) => (
                                        <tr key={os.id} className="border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02]">
                                            <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{os.asset?.assetCode}</td>
                                            <td className="py-3 text-white">{os.asset?.sku?.name}</td>
                                            <td className="py-3"><Badge variant={statusColor[os.status] ?? "default"}>{os.status}</Badge></td>
                                            <td className="py-3 text-[var(--zyllen-muted)] text-xs">{new Date(os.createdAt).toLocaleString("pt-BR")}</td>
                                            <td className="py-3 text-right">
                                                {os.status === "OPEN" && (
                                                    <Button size="sm" variant="ghost" className="text-[var(--zyllen-highlight)] text-xs" onClick={() => updateStatus.mutate({ id: os.id, status: "IN_PROGRESS" })}>Iniciar</Button>
                                                )}
                                                {os.status === "IN_PROGRESS" && (
                                                    <Button size="sm" variant="ghost" className="text-emerald-400 text-xs" onClick={() => updateStatus.mutate({ id: os.id, status: "CLOSED", notes: "Concluído" })}>Fechar</Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-[var(--zyllen-muted)] text-center py-8">Nenhuma OS</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
