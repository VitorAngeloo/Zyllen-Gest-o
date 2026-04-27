"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth, useAuthedFetch } from "@web/lib/auth-context";
import { apiClient } from "@web/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Input } from "@web/components/ui/input";
import { Button } from "@web/components/ui/button";
import { Label } from "@web/components/ui/label";
import { Select, SelectOption } from "@web/components/ui/select";
import { toast } from "sonner";
import {
    Plus, MessageSquare, Clock, CheckCircle2, AlertCircle,
    Send, ArrowLeft, Paperclip, X, ImageIcon, VideoIcon, FileText,
    Headset,
} from "lucide-react";

interface Ticket {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    createdAt: string;
    resolutionNotes?: string;
    assignedTo?: { name: string };
    messages?: { id: string; content: string; authorType: string; createdAt: string }[];
    attachments?: { id: string; fileName: string; filePath: string }[];
    statusLabel?: string;
    rating?: { rating: number; comment?: string | null; createdAt: string; evaluator?: { name: string } } | null;
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function isImageFile(name: string) {
    return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(name);
}
function isVideoFile(name: string) {
    return /\.(mp4|webm|mov|avi)$/i.test(name);
}

function renderStars(rating: number) {
    return Array.from({ length: 5 }, (_, index) => (index < rating ? "★" : "☆")).join("");
}

export default function ChamadosTIPage() {
    const { token } = useAuth();
    const authFetch = useAuthedFetch();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewForm, setShowNewForm] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("MEDIUM");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedTicket?.messages]);

    const fetchTickets = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiClient.get<{ data: Ticket[] }>("/tickets/my-internal", authFetch);
            setTickets(res.data);
            setSelectedTicket((current) => current ? (res.data.find((ticket) => ticket.id === current.id) ?? null) : current);
        } catch {
            toast.error("Erro ao carregar chamados");
        } finally {
            setLoading(false);
        }
    }, [token, authFetch]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    useEffect(() => {
        const handleRefresh = () => fetchTickets();
        window.addEventListener("tickets:refresh", handleRefresh);
        return () => window.removeEventListener("tickets:refresh", handleRefresh);
    }, [fetchTickets]);

    // ── File handling ──
    const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const validFiles = files.filter((f) => {
            if (f.size > 20 * 1024 * 1024) {
                toast.error(`${f.name} excede o limite de 20 MB`);
                return false;
            }
            if (!/^(image|video)\//.test(f.type)) {
                toast.error(`${f.name}: apenas fotos e vídeos são permitidos`);
                return false;
            }
            return true;
        });
        setSelectedFiles((prev) => [...prev, ...validFiles]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    // ── Create ticket ──
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("Informe o título do chamado");
            return;
        }
        if (description.trim().length < 10) {
            toast.error("Descreva o problema com pelo menos 10 caracteres");
            return;
        }
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("title", title.trim());
            formData.append("description", description.trim());
            formData.append("priority", priority);
            selectedFiles.forEach((f) => formData.append("files", f));

            await apiClient.upload("/tickets/internal", formData);
            toast.success("Chamado TI criado com sucesso!");
            setTitle("");
            setDescription("");
            setPriority("MEDIUM");
            setSelectedFiles([]);
            setShowNewForm(false);
            fetchTickets();
        } catch (err: any) {
            toast.error(err.message || "Erro ao criar chamado");
        } finally {
            setSubmitting(false);
        }
    };

    // ── Send message ──
    const handleSendMessage = async () => {
        if (!selectedTicket || !newMessage.trim()) return;
        setSubmitting(true);
        try {
            await apiClient.post(`/tickets/my-internal/${selectedTicket.id}/messages`, { content: newMessage }, authFetch);
            toast.success("Mensagem enviada");
            setNewMessage("");
            // Refresh tickets and re-select
            const res = await apiClient.get<{ data: Ticket[] }>("/tickets/my-internal", authFetch);
            setTickets(res.data);
            const updated = res.data.find((t) => t.id === selectedTicket.id);
            if (updated) setSelectedTicket(updated);
        } catch (err: any) {
            toast.error(err.message || "Erro ao enviar mensagem");
        } finally {
            setSubmitting(false);
        }
    };

    // ══════════════════════════════════════════
    // TICKET DETAIL VIEW
    // ══════════════════════════════════════════
    if (selectedTicket) {
        const statusCfg = STATUS_CONFIG[selectedTicket.status] || STATUS_CONFIG.OPEN;
        const priorityCfg = PRIORITY_CONFIG[selectedTicket.priority] || PRIORITY_CONFIG.MEDIUM;
        const isClosed = selectedTicket.status === "CLOSED";

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
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-xs px-2 py-1 rounded-full font-medium"
                                    style={{
                                        backgroundColor: `color-mix(in srgb, ${priorityCfg.color} 15%, transparent)`,
                                        color: priorityCfg.color,
                                    }}
                                >
                                    {priorityCfg.label}
                                </span>
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
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-[var(--zyllen-muted)] whitespace-pre-wrap">{selectedTicket.description}</p>

                        <div className="flex flex-wrap gap-4 text-xs text-[var(--zyllen-muted)]">
                            <span>Criado: {new Date(selectedTicket.createdAt).toLocaleDateString("pt-BR")}</span>
                            {selectedTicket.assignedTo && (
                                <span>Atendente: <span className="text-white">{selectedTicket.assignedTo.name}</span></span>
                            )}
                        </div>

                        {/* Attachments */}
                        {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-medium text-[var(--zyllen-muted)] uppercase tracking-wider">Anexos</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {selectedTicket.attachments.map((att) => (
                                        <a
                                            key={att.id}
                                            href={`${API_BASE}${att.filePath}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block rounded-lg border border-[var(--zyllen-border)] overflow-hidden hover:border-[var(--zyllen-highlight)]/30 transition-colors"
                                        >
                                            {isImageFile(att.fileName) ? (
                                                <img
                                                    src={`${API_BASE}${att.filePath}`}
                                                    alt={att.fileName}
                                                    className="w-full h-24 object-cover"
                                                />
                                            ) : isVideoFile(att.fileName) ? (
                                                <div className="w-full h-24 flex items-center justify-center bg-[var(--zyllen-bg-dark)]">
                                                    <VideoIcon size={32} className="text-[var(--zyllen-muted)]" />
                                                </div>
                                            ) : (
                                                <div className="w-full h-24 flex items-center justify-center bg-[var(--zyllen-bg-dark)]">
                                                    <FileText size={32} className="text-[var(--zyllen-muted)]" />
                                                </div>
                                            )}
                                            <p className="text-xs text-[var(--zyllen-muted)] px-2 py-1 truncate">{att.fileName}</p>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Resolution Notes */}
                        {selectedTicket.resolutionNotes && (
                            <div className="p-3 rounded-lg border border-[var(--zyllen-success)]/20 bg-[var(--zyllen-success)]/5">
                                <h4 className="text-xs font-medium text-[var(--zyllen-success)] uppercase tracking-wider mb-1">Descrição do Atendimento</h4>
                                <p className="text-sm text-white whitespace-pre-wrap">{selectedTicket.resolutionNotes}</p>
                            </div>
                        )}

                        {selectedTicket.rating && (
                            <div className="p-3 rounded-lg border border-yellow-400/20 bg-yellow-400/5 space-y-2">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <h4 className="text-xs font-medium text-yellow-300 uppercase tracking-wider">Avaliação do Atendimento</h4>
                                    <span className="text-xs text-[var(--zyllen-muted)]">{new Date(selectedTicket.rating.createdAt).toLocaleString("pt-BR")}</span>
                                </div>
                                <p className="text-lg tracking-wide text-yellow-300">{renderStars(selectedTicket.rating.rating)}</p>
                                {selectedTicket.rating.comment && (
                                    <p className="text-sm text-white whitespace-pre-wrap">{selectedTicket.rating.comment}</p>
                                )}
                            </div>
                        )}

                        {/* Messages / Chat */}
                        <div className="border-t border-[var(--zyllen-border)] pt-4 space-y-3">
                            <h3 className="text-sm font-medium text-white">Mensagens</h3>
                            <div className="max-h-[400px] overflow-y-auto space-y-3">
                                {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                                    selectedTicket.messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`p-3 rounded-lg text-sm ${
                                                msg.authorType === "internal"
                                                    ? "bg-[var(--zyllen-highlight)]/10 border border-[var(--zyllen-highlight)]/20 ml-8"
                                                    : "bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] mr-8"
                                            }`}
                                        >
                                            <div className="flex justify-between mb-1">
                                                <span className="text-xs font-medium text-[var(--zyllen-muted)]">
                                                    {msg.authorType === "internal" ? "Você" : "Atendente"}
                                                </span>
                                                <span className="text-xs text-[var(--zyllen-muted)]">
                                                    {new Date(msg.createdAt).toLocaleString("pt-BR")}
                                                </span>
                                            </div>
                                            <p className="text-white whitespace-pre-wrap">{msg.content}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-[var(--zyllen-muted)] text-center py-4">Nenhuma mensagem ainda</p>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Message input */}
                            {!isClosed && (
                                <div className="flex gap-2 pt-2">
                                    <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Digite sua mensagem..."
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white flex-1"
                                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                    />
                                    <Button
                                        variant="highlight"
                                        size="sm"
                                        disabled={submitting || !newMessage.trim()}
                                        onClick={handleSendMessage}
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

    // ══════════════════════════════════════════
    // NEW TICKET FORM
    // ══════════════════════════════════════════
    if (showNewForm) {
        return (
            <div className="space-y-6">
                <button
                    onClick={() => setShowNewForm(false)}
                    className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar
                </button>

                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Headset size={20} className="text-[var(--zyllen-highlight)]" />
                            Novo Chamado TI
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-[var(--zyllen-muted)]">Título *</Label>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Resumo breve do problema..."
                                        required
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Prioridade</Label>
                                    <Select
                                        value={priority}
                                        onValueChange={setPriority}
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    >
                                        <SelectOption value="LOW">Baixa</SelectOption>
                                        <SelectOption value="MEDIUM">Média</SelectOption>
                                        <SelectOption value="HIGH">Alta</SelectOption>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Descrição *</Label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Descreva o problema em detalhes (mínimo 10 caracteres)..."
                                    rows={5}
                                    required
                                    minLength={10}
                                    className="w-full rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30"
                                />
                            </div>

                            {/* File upload (optional) */}
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Anexos (opcional)</Label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-[var(--zyllen-border)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--zyllen-highlight)]/30 transition-colors"
                                >
                                    <Paperclip size={24} className="mx-auto mb-2 text-[var(--zyllen-muted)]" />
                                    <p className="text-sm text-[var(--zyllen-muted)]">
                                        Clique para anexar fotos ou vídeos
                                    </p>
                                    <p className="text-xs text-[var(--zyllen-muted)]/50 mt-1">
                                        Máx. 20 MB por arquivo (imagens e vídeos)
                                    </p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={handleFilesSelected}
                                />
                            </div>

                            {/* Selected files preview */}
                            {selectedFiles.length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Arquivos selecionados</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={idx} className="relative rounded-lg border border-[var(--zyllen-border)] overflow-hidden">
                                                {file.type.startsWith("image/") ? (
                                                    <img
                                                        src={URL.createObjectURL(file)}
                                                        alt={file.name}
                                                        className="w-full h-24 object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-24 flex items-center justify-center bg-[var(--zyllen-bg-dark)]">
                                                        <VideoIcon size={32} className="text-[var(--zyllen-muted)]" />
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(idx)}
                                                    className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full text-white hover:bg-red-500"
                                                >
                                                    <X size={12} />
                                                </button>
                                                <p className="text-xs text-[var(--zyllen-muted)] px-2 py-1 truncate">{file.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Button
                                type="submit"
                                variant="highlight"
                                className="w-full"
                                disabled={submitting}
                            >
                                {submitting ? "Enviando..." : "Abrir Chamado"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ══════════════════════════════════════════
    // TICKETS LIST
    // ══════════════════════════════════════════
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Headset className="text-[var(--zyllen-highlight)]" /> Meus Chamados TI
                    </h1>
                    <p className="text-sm text-[var(--zyllen-muted)] mt-1">
                        Abra e acompanhe seus chamados de suporte técnico interno.
                    </p>
                </div>
                <Button variant="highlight" onClick={() => setShowNewForm(true)}>
                    <Plus size={16} /> Novo Chamado
                </Button>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 rounded-lg bg-[var(--zyllen-bg)] animate-pulse" />
                    ))}
                </div>
            ) : tickets.length === 0 ? (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardContent className="text-center py-12">
                        <Headset size={40} className="mx-auto mb-3 text-[var(--zyllen-muted)]/50" />
                        <p className="text-[var(--zyllen-muted)]">Você ainda não abriu nenhum chamado TI.</p>
                        <Button variant="highlight" className="mt-4" onClick={() => setShowNewForm(true)}>
                            <Plus size={16} /> Abrir Primeiro Chamado
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {tickets.map((ticket) => {
                        const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
                        const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM;
                        const StatusIcon = statusCfg.icon;

                        return (
                            <Card
                                key={ticket.id}
                                className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/30 transition-colors cursor-pointer"
                                onClick={() => setSelectedTicket(ticket)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex items-center justify-center size-10 rounded-lg"
                                            style={{ backgroundColor: `color-mix(in srgb, ${statusCfg.color} 15%, transparent)` }}
                                        >
                                            <StatusIcon size={20} style={{ color: statusCfg.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">{ticket.title}</p>
                                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--zyllen-muted)]">
                                                <span>{new Date(ticket.createdAt).toLocaleDateString("pt-BR")}</span>
                                                {ticket.assignedTo && <span>Atendente: {ticket.assignedTo.name}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span
                                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                style={{
                                                    backgroundColor: `color-mix(in srgb, ${priorityCfg.color} 15%, transparent)`,
                                                    color: priorityCfg.color,
                                                }}
                                            >
                                                {priorityCfg.label}
                                            </span>
                                            <span
                                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                style={{
                                                    backgroundColor: `color-mix(in srgb, ${statusCfg.color} 15%, transparent)`,
                                                    color: statusCfg.color,
                                                }}
                                            >
                                                {statusCfg.label}
                                            </span>
                                            {ticket.messages && ticket.messages.length > 0 && (
                                                <span className="flex items-center gap-1 text-xs text-[var(--zyllen-muted)]">
                                                    <MessageSquare size={12} /> {ticket.messages.length}
                                                </span>
                                            )}
                                        </div>
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
