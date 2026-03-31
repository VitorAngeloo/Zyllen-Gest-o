"use client";
import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth, useAuthedFetch } from "@web/lib/auth-context";
import { apiClient } from "@web/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Input } from "@web/components/ui/input";
import { Button } from "@web/components/ui/button";
import { Label } from "@web/components/ui/label";
import { toast } from "sonner";
import {
    Plus, MessageSquare, Clock, CheckCircle2, AlertCircle,
    ArrowLeft, Paperclip, X, ImageIcon, VideoIcon, FileText,
} from "lucide-react";

interface Ticket {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    createdAt: string;
    resolutionNotes?: string;
    company?: { name: string };
    externalUser?: { name: string; email: string; phone?: string; position?: string; company?: { name: string }; project?: { name: string } };
    assignedTo?: { name: string };
    messages?: { id: string; content: string; authorType: string; createdAt: string }[];
    attachments?: { id: string; fileName: string; filePath: string }[];
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

function ClientChamadosInner() {
    const { token } = useAuth();
    const authFetch = useAuthedFetch();
    const searchParams = useSearchParams();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewForm, setShowNewForm] = useState(searchParams.get("new") === "1");
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [description, setDescription] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchTickets = useCallback(async () => {
        if (!token) return;
        try {
            const statusFilter = searchParams.get("status");
            const query = statusFilter ? `?status=${statusFilter.toUpperCase()}` : "";
            const res = await apiClient.get<{ data: Ticket[] }>(`/client/tickets${query}`, authFetch);
            setTickets(res.data);
        } catch {
            toast.error("Erro ao carregar chamados");
        } finally {
            setLoading(false);
        }
    }, [token, searchParams, authFetch]);

    useEffect(() => {
        fetchTickets();
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

    // ── Create ticket with upload ──
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (description.trim().length < 10) {
            toast.error("Descreva o problema com pelo menos 10 caracteres");
            return;
        }
        if (selectedFiles.length === 0) {
            toast.error("Anexe pelo menos uma foto ou vídeo do problema");
            return;
        }
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("description", description.trim());
            selectedFiles.forEach((f) => formData.append("files", f));

            await apiClient.upload("/client/tickets", formData);
            toast.success("Chamado criado com sucesso!");
            setDescription("");
            setSelectedFiles([]);
            setShowNewForm(false);
            fetchTickets();
        } catch (err: any) {
            toast.error(err.message || "Erro ao criar chamado");
        } finally {
            setSubmitting(false);
        }
    };

    // ══════════════════════════════════════════
    // TICKET DETAIL VIEW
    // ══════════════════════════════════════════
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
                    <ArrowLeft size={16} /> Voltar aos chamados
                </button>

                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Paperclip size={18} className="text-[var(--zyllen-highlight)]" />
                            Abrir Chamado
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="space-y-5">
                            {/* Description */}
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Descreva o problema *</Label>
                                <p className="text-xs text-[var(--zyllen-muted)]/70">
                                    Explique com detalhes o que está acontecendo. Quanto mais informação, mais rápido poderemos ajudar.
                                </p>
                                <textarea
                                    placeholder="Ex: O computador não liga desde ontem. Já tentei trocar a tomada e verificar os cabos, mas continua sem funcionar..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    required
                                    minLength={10}
                                    rows={6}
                                    className="w-full rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/40 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30 focus:border-[var(--zyllen-highlight)] resize-none"
                                />
                            </div>

                            {/* File Upload */}
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Fotos e Vídeos do problema *</Label>
                                <p className="text-xs text-[var(--zyllen-muted)]/70">
                                    Tire fotos ou grave vídeos mostrando o problema. Isso ajuda muito na análise.
                                </p>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*,video/*"
                                    onChange={handleFilesSelected}
                                    className="hidden"
                                />

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full border-2 border-dashed border-[var(--zyllen-border)] rounded-lg p-6 flex flex-col items-center gap-2 hover:border-[var(--zyllen-highlight)]/40 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <ImageIcon size={24} className="text-[var(--zyllen-muted)]" />
                                        <VideoIcon size={24} className="text-[var(--zyllen-muted)]" />
                                    </div>
                                    <span className="text-sm text-[var(--zyllen-muted)]">
                                        Clique para selecionar fotos e vídeos
                                    </span>
                                    <span className="text-xs text-[var(--zyllen-muted)]/50">
                                        Máximo 20 MB por arquivo · JPG, PNG, GIF, MP4, WebM
                                    </span>
                                </button>

                                {/* File previews */}
                                {selectedFiles.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                                        {selectedFiles.map((file, i) => (
                                            <div
                                                key={`${file.name}-${i}`}
                                                className="relative rounded-lg border border-[var(--zyllen-border)] overflow-hidden group"
                                            >
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
                                                    onClick={() => removeFile(i)}
                                                    className="absolute top-1 right-1 size-6 rounded-full bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={14} className="text-white" />
                                                </button>
                                                <p className="text-[10px] text-[var(--zyllen-muted)] px-2 py-1 truncate">
                                                    {file.name}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button
                                type="submit"
                                variant="highlight"
                                disabled={submitting}
                                className="w-full h-11 text-base"
                            >
                                {submitting ? (
                                    <span className="flex items-center gap-2">
                                        <span className="size-4 border-2 border-[var(--zyllen-bg)] border-t-transparent rounded-full animate-spin" />
                                        Enviando chamado...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Plus size={18} />
                                        Abrir Chamado
                                    </span>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ══════════════════════════════════════════
    // TICKET LIST
    // ══════════════════════════════════════════
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
                                                    {ticket.assignedTo && ` · ${ticket.assignedTo.name}`}
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