"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuth, useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import { Headset, Plus, MessageSquare, Clock, Send } from "lucide-react";

export default function ChamadosPage() {
    const fetchOpts = useAuthedFetch();
    const { user } = useAuth();
    const qc = useQueryClient();
    const [selected, setSelected] = useState<any>(null);
    const [newMsg, setNewMsg] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", companyId: "", externalUserId: "" });

    const { data: tickets } = useQuery({
        queryKey: ["tickets"],
        queryFn: () => apiClient.get<{ data: any[] }>("/tickets", fetchOpts),
    });

    const { data: detail } = useQuery({
        queryKey: ["ticket", selected?.id],
        queryFn: () => apiClient.get<{ data: any }>(`/tickets/${selected.id}`, fetchOpts),
        enabled: !!selected?.id,
    });

    const { data: companies } = useQuery({
        queryKey: ["companies"],
        queryFn: () => apiClient.get<{ data: any[] }>("/clients/companies", fetchOpts),
        enabled: showCreate,
    });

    const createTicket = useMutation({
        mutationFn: (data: any) => apiClient.post("/tickets", data, fetchOpts),
        onSuccess: () => { toast.success("Chamado criado!"); qc.invalidateQueries({ queryKey: ["tickets"] }); setShowCreate(false); setForm({ title: "", description: "", priority: "MEDIUM", companyId: "", externalUserId: "" }); },
        onError: (e: any) => toast.error(e.message),
    });

    const sendMessage = useMutation({
        mutationFn: (data: { ticketId: string; content: string }) => apiClient.post(`/tickets/${data.ticketId}/messages`, { content: data.content }, fetchOpts),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["ticket", selected?.id] }); setNewMsg(""); },
        onError: (e: any) => toast.error(e.message),
    });

    const assignTicket = useMutation({
        mutationFn: (ticketId: string) => apiClient.put(`/tickets/${ticketId}/assign`, { assignedToId: user?.id }, fetchOpts),
        onSuccess: () => { toast.success("Chamado atribuído!"); qc.invalidateQueries({ queryKey: ["tickets"] }); qc.invalidateQueries({ queryKey: ["ticket", selected?.id] }); },
        onError: (e: any) => toast.error(e.message),
    });

    const updateStatus = useMutation({
        mutationFn: (data: { ticketId: string; status: string }) => apiClient.put(`/tickets/${data.ticketId}/status`, { status: data.status }, fetchOpts),
        onSuccess: () => { toast.success("Status atualizado!"); qc.invalidateQueries({ queryKey: ["tickets"] }); qc.invalidateQueries({ queryKey: ["ticket", selected?.id] }); },
        onError: (e: any) => toast.error(e.message),
    });

    const priorityColor: Record<string, "destructive" | "warning" | "default"> = {
        HIGH: "destructive", MEDIUM: "warning", LOW: "default",
    };
    const statusColor: Record<string, "success" | "warning" | "destructive" | "default" | "secondary"> = {
        OPEN: "warning", IN_PROGRESS: "default", WAITING_CLIENT: "secondary", RESOLVED: "success", CLOSED: "success",
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Headset className="text-[var(--zyllen-highlight)]" /> Chamados
                </h1>
                <Button variant="highlight" onClick={() => setShowCreate(!showCreate)}>
                    <Plus size={16} /> Novo Chamado
                </Button>
            </div>

            {showCreate && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-highlight)]/20 max-w-lg">
                    <CardHeader><CardTitle className="text-white">Novo Chamado</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={(e) => { e.preventDefault(); createTicket.mutate(form); }} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Título</Label>
                                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Descrição</Label>
                                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="w-full h-24 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 py-2 text-sm resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Prioridade</Label>
                                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                        <option value="LOW">Baixa</option>
                                        <option value="MEDIUM">Média</option>
                                        <option value="HIGH">Alta</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Empresa</Label>
                                    <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                        <option value="">Selecione...</option>
                                        {companies?.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <Button type="submit" variant="highlight" className="w-full" disabled={createTicket.isPending}>Criar Chamado</Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tickets list */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] lg:col-span-1">
                    <CardHeader><CardTitle className="text-white text-sm">Fila de Chamados</CardTitle></CardHeader>
                    <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                        {tickets?.data?.map((t: any) => (
                            <div
                                key={t.id}
                                onClick={() => setSelected(t)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selected?.id === t.id
                                        ? "border-[var(--zyllen-highlight)]/30 bg-[var(--zyllen-highlight)]/5"
                                        : "border-[var(--zyllen-border)]/50 bg-[var(--zyllen-bg-dark)] hover:border-[var(--zyllen-border)]"
                                    }`}
                            >
                                <p className="text-white text-sm font-medium truncate">{t.title}</p>
                                <div className="flex gap-2 mt-2">
                                    <Badge variant={statusColor[t.status] ?? "default"} className="text-[10px]">{t.status}</Badge>
                                    <Badge variant={priorityColor[t.priority] ?? "default"} className="text-[10px]">{t.priority}</Badge>
                                </div>
                                <p className="text-[10px] text-[var(--zyllen-muted)] mt-1">{t.company?.name}</p>
                            </div>
                        ))}
                        {!tickets?.data?.length && <p className="text-[var(--zyllen-muted)] text-center py-4 text-sm">Nenhum chamado</p>}
                    </CardContent>
                </Card>

                {/* Ticket detail */}
                {selected && detail?.data ? (
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-white">{detail.data.title}</CardTitle>
                                <div className="flex gap-2">
                                    <Badge variant={statusColor[detail.data.status] ?? "default"}>{detail.data.status}</Badge>
                                    <Badge variant={priorityColor[detail.data.priority] ?? "default"}>{detail.data.priority}</Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-[var(--zyllen-muted)] text-sm">{detail.data.description}</p>
                            <div className="flex gap-4 text-xs text-[var(--zyllen-muted)]">
                                <span><Clock size={12} className="inline mr-1" />SLA: {detail.data.slaDueAt ? new Date(detail.data.slaDueAt).toLocaleString("pt-BR") : "—"}</span>
                                <span>Empresa: {detail.data.company?.name ?? "—"}</span>
                                <span>Técnico: {detail.data.assignedTo?.name ?? "Não atribuído"}</span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 flex-wrap">
                                {!detail.data.assignedToId && (
                                    <Button size="sm" variant="highlight" onClick={() => assignTicket.mutate(detail.data.id)}>Assumir</Button>
                                )}
                                {detail.data.status !== "CLOSED" && detail.data.status !== "RESOLVED" && (
                                    <Button size="sm" variant="outline" className="text-white border-[var(--zyllen-border)]" onClick={() => updateStatus.mutate({ ticketId: detail.data.id, status: "RESOLVED" })}>Resolver</Button>
                                )}
                                {detail.data.status === "RESOLVED" && (
                                    <Button size="sm" variant="outline" className="text-white border-[var(--zyllen-border)]" onClick={() => updateStatus.mutate({ ticketId: detail.data.id, status: "CLOSED" })}>Fechar</Button>
                                )}
                            </div>

                            {/* Messages */}
                            <div className="border-t border-[var(--zyllen-border)] pt-4">
                                <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                                    <MessageSquare size={14} /> Mensagens
                                </h3>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto mb-3">
                                    {detail.data.messages?.map((m: any) => (
                                        <div key={m.id} className="p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-medium text-[var(--zyllen-highlight)]">{m.sender?.name ?? "Sistema"}</span>
                                                <span className="text-[10px] text-[var(--zyllen-muted)]">{new Date(m.createdAt).toLocaleString("pt-BR")}</span>
                                            </div>
                                            <p className="text-sm text-white">{m.content}</p>
                                        </div>
                                    ))}
                                </div>
                                <form
                                    onSubmit={(e) => { e.preventDefault(); if (newMsg.trim()) sendMessage.mutate({ ticketId: detail.data.id, content: newMsg }); }}
                                    className="flex gap-2"
                                >
                                    <Input
                                        value={newMsg}
                                        onChange={(e) => setNewMsg(e.target.value)}
                                        placeholder="Escreva uma mensagem..."
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    />
                                    <Button type="submit" variant="highlight" disabled={sendMessage.isPending}>
                                        <Send size={16} />
                                    </Button>
                                </form>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="lg:col-span-2 flex items-center justify-center text-[var(--zyllen-muted)] text-sm">
                        Selecione um chamado para ver os detalhes
                    </div>
                )}
            </div>
        </div>
    );
}
