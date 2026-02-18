"use client";
import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@web/lib/auth-context";
import { useAuthedFetch } from "@web/lib/auth-context";
import { apiClient } from "@web/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Input } from "@web/components/ui/input";
import { Button } from "@web/components/ui/button";
import { Label } from "@web/components/ui/label";
import { toast } from "sonner";
import { Plus, MessageSquare, Clock, CheckCircle2, AlertCircle, Send, ArrowLeft } from "lucide-react";

interface Ticket {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    createdAt: string;
    company?: { name: string };
    assignedTo?: { name: string };
    messages?: { id: string; content: string; authorType: string; createdAt: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    OPEN: { label: "Aberto", color: "var(--zyllen-info)", icon: AlertCircle },
    IN_PROGRESS: { label: "Em Andamento", color: "var(--zyllen-warning)", icon: Clock },
    WAITING_CLIENT: { label: "Aguardando Resposta", color: "var(--zyllen-highlight)", icon: MessageSquare },
    RESOLVED: { label: "Resolvido", color: "var(--zyllen-success)", icon: CheckCircle2 },
    CLOSED: { label: "Encerrado", color: "var(--zyllen-muted)", icon: CheckCircle2 },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
    LOW: { label: "Baixa", color: "var(--zyllen-success)" },
    MEDIUM: { label: "Média", color: "var(--zyllen-warning)" },
    HIGH: { label: "Alta", color: "var(--zyllen-error)" },
};

function ClientChamadosInner() {
    const { token } = useAuth();
    const authFetch = useAuthedFetch();
    const searchParams = useSearchParams();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewForm, setShowNewForm] = useState(searchParams.get("new") === "1");
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [formData, setFormData] = useState({ title: "", description: "", priority: "MEDIUM" });
    const [submitting, setSubmitting] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to latest message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedTicket?.messages]);

    const fetchTickets = useCallback(async () => {
        if (!token) return;
        try {
            const statusFilter = searchParams.get("status");
            const query = statusFilter ? `?status=${statusFilter.toUpperCase()}` : "";
            const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await apiClient.get<{ data: Ticket[] }>(`/client/tickets${query}`, { headers });
            setTickets(res.data);
        } catch {
            toast.error("Erro ao carregar chamados");
        } finally {
            setLoading(false);
        }
    }, [token, searchParams]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.description.trim()) {
            toast.error("Preencha título e descrição");
            return;
        }
        setSubmitting(true);
        try {
            await apiClient.post("/client/tickets", formData, authFetch);
            toast.success("Chamado criado com sucesso!");
            setFormData({ title: "", description: "", priority: "MEDIUM" });
            setShowNewForm(false);
            fetchTickets();
        } catch (err: any) {
            toast.error(err.message || "Erro ao criar chamado");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendMessage = async () => {
        if (!selectedTicket || !newMessage.trim()) return;
        setSubmitting(true);
        try {
            await apiClient.post(`/client/tickets/${selectedTicket.id}/messages`, { content: newMessage }, authFetch);
            toast.success("Mensagem enviada");
            setNewMessage("");
            // Reload ticket detail
            const res = await apiClient.get<{ data: Ticket }>(`/client/tickets/${selectedTicket.id}`, authFetch);
            setSelectedTicket(res.data);
        } catch (err: any) {
            toast.error(err.message || "Erro ao enviar mensagem");
        } finally {
            setSubmitting(false);
        }
    };

    // ── Ticket Detail View ──
    if (selectedTicket) {
        const statusCfg = STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.OPEN;
        return (
            <div className="space-y-6">
                <button
                    onClick={() => setSelectedTicket(null)}
                    className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar aos chamados
                </button>

                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-white">{selectedTicket.title}</CardTitle>
                            <span
                                className="text-xs px-2 py-1 rounded-full font-medium"
                                style={{
                                    backgroundColor: `color-mix(in srgb, ${statusCfg.color} 15%, transparent)`,
                                    color: statusCfg.color,
                                }}
                            >
                                {statusCfg.label}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-[var(--zyllen-muted)]">{selectedTicket.description}</p>

                        <div className="flex gap-4 text-xs text-[var(--zyllen-muted)]">
                            <span>Criado: {new Date(selectedTicket.createdAt).toLocaleDateString("pt-BR")}</span>
                            {selectedTicket.assignedTo && (
                                <span>Atendente: {selectedTicket.assignedTo.name}</span>
                            )}
                        </div>

                        {/* Messages */}
                        <div className="border-t border-[var(--zyllen-border)] pt-4 space-y-3 max-h-[400px] overflow-y-auto">
                            <h3 className="text-sm font-medium text-white">Mensagens</h3>
                            {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                                selectedTicket.messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`p-3 rounded-lg text-sm ${
                                            msg.authorType === "external"
                                                ? "bg-[var(--zyllen-highlight)]/10 border border-[var(--zyllen-highlight)]/20 ml-8"
                                                : "bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] mr-8"
                                        }`}
                                    >
                                        <div className="flex justify-between mb-1">
                                            <span className="text-xs font-medium text-[var(--zyllen-muted)]">
                                                {msg.authorType === "external" ? "Você" : "Atendente"}
                                            </span>
                                            <span className="text-xs text-[var(--zyllen-muted)]">
                                                {new Date(msg.createdAt).toLocaleString("pt-BR")}
                                            </span>
                                        </div>
                                        <p className="text-white">{msg.content}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-[var(--zyllen-muted)]">Nenhuma mensagem ainda.</p>
                            )}
                            <div ref={chatEndRef} />

                            {/* Send message */}
                            {selectedTicket.status !== "CLOSED" && (
                                <div className="flex gap-2 pt-2">
                                    <Input
                                        placeholder="Escreva uma mensagem..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50"
                                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                                    />
                                    <Button
                                        variant="highlight"
                                        size="sm"
                                        onClick={handleSendMessage}
                                        disabled={submitting || !newMessage.trim()}
                                    >
                                        <Send size={16} />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── New Ticket Form ──
    if (showNewForm) {
        return (
            <div className="space-y-6">
                <button
                    onClick={() => setShowNewForm(false)}
                    className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar aos chamados
                </button>

                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <CardTitle className="text-white">Novo Chamado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Título</Label>
                                <Input
                                    placeholder="Descreva brevemente o problema"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Descrição</Label>
                                <textarea
                                    placeholder="Detalhe o problema ou solicitação..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    required
                                    rows={5}
                                    className="w-full rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30 focus:border-[var(--zyllen-highlight)]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Prioridade</Label>
                                <div className="flex gap-2">
                                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, priority: key })}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                                                formData.priority === key
                                                    ? "border-[var(--zyllen-highlight)] text-[var(--zyllen-highlight)] bg-[var(--zyllen-highlight)]/10"
                                                    : "border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:border-[var(--zyllen-highlight)]/30"
                                            }`}
                                        >
                                            {cfg.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <Button type="submit" variant="highlight" disabled={submitting} className="w-full">
                                {submitting ? "Criando..." : "Criar Chamado"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Ticket List ──
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Meus Chamados</h1>
                    <p className="text-sm text-[var(--zyllen-muted)] mt-1">Acompanhe e gerencie seus chamados de suporte</p>
                </div>
                <Button variant="highlight" onClick={() => setShowNewForm(true)}>
                    <Plus size={16} className="mr-2" /> Novo Chamado
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-[var(--zyllen-muted)]">Carregando...</div>
            ) : tickets.length === 0 ? (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardContent className="py-12 text-center">
                        <MessageSquare size={48} className="mx-auto text-[var(--zyllen-muted)]/30 mb-4" />
                        <p className="text-[var(--zyllen-muted)]">Nenhum chamado encontrado</p>
                        <Button variant="highlight" className="mt-4" onClick={() => setShowNewForm(true)}>
                            Abrir Primeiro Chamado
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {tickets.map((ticket) => {
                        const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
                        const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM;
                        const StatusIcon = statusCfg.icon;
                        return (
                            <Card
                                key={ticket.id}
                                className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/30 transition-all cursor-pointer"
                                onClick={async () => {
                                    try {
                                        const res = await apiClient.get<{ data: Ticket }>(`/client/tickets/${ticket.id}`, authFetch);
                                        setSelectedTicket(res.data);
                                    } catch {
                                        toast.error("Erro ao carregar chamado");
                                    }
                                }}
                            >
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <StatusIcon size={18} style={{ color: statusCfg.color }} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{ticket.title}</p>
                                                <p className="text-xs text-[var(--zyllen-muted)]">
                                                    {new Date(ticket.createdAt).toLocaleDateString("pt-BR")} · {statusCfg.label}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className="text-xs px-2 py-1 rounded-full font-medium shrink-0"
                                            style={{
                                                backgroundColor: `color-mix(in srgb, ${priorityCfg.color} 15%, transparent)`,
                                                color: priorityCfg.color,
                                            }}
                                        >
                                            {priorityCfg.label}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function ClientChamadosPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="size-8 border-2 border-[var(--zyllen-highlight)] border-t-transparent rounded-full animate-spin" /></div>}>
            <ClientChamadosInner />
        </Suspense>
    );
}