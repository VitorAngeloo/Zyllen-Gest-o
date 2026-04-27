"use client";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuth, useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import {
    Headset, Plus, MessageSquare, Clock, Send, ChevronDown, ChevronUp,
    Lock, User, Building2, Phone, Briefcase, FolderOpen, ImageIcon,
    VideoIcon, FileText, Shield, ArrowRightLeft, X, Paperclip,
} from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { EMPTY_STATES, TOASTS, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
function isImage(n: string) { return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(n); }
function isVideo(n: string) { return /\.(mp4|webm|mov|avi)$/i.test(n); }
function renderStars(rating: number) { return Array.from({ length: 5 }, (_, i) => i < rating ? "★" : "☆").join(""); }

const STATUS_LABELS: Record<string, string> = {
    OPEN: "Aberto", IN_PROGRESS: "Em Andamento", WAITING_CLIENT: "Aguardando Cliente",
    RESOLVED: "Resolvido", CLOSED: "Encerrado",
};

function formatElapsedSeconds(sec: number): string {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min ${String(s).padStart(2, "0")}s`;
    if (m > 0) return `${m}min ${String(s).padStart(2, "0")}s`;
    return `${s}s`;
}

/* ── Pin Modal ── */
function PinModal({ title, onConfirm, onCancel, loading, children }: {
    title: string; onConfirm: (pin: string) => void; onCancel: () => void; loading: boolean; children?: React.ReactNode;
}) {
    const [pin, setPin] = useState("");
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
            <div className="bg-[var(--zyllen-bg)] border border-[var(--zyllen-border)] rounded-xl p-6 w-full max-w-sm space-y-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium flex items-center gap-2"><Lock size={16} className="text-[var(--zyllen-highlight)]" />{title}</h3>
                    <button onClick={onCancel} className="text-[var(--zyllen-muted)] hover:text-white"><X size={18} /></button>
                </div>
                {children}
                <div className="space-y-2">
                    <Label className="text-[var(--zyllen-muted)]">Digite seu PIN (4 dígitos)</Label>
                    <Input
                        type="password" maxLength={4} inputMode="numeric" pattern="[0-9]*"
                        placeholder="••••" value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-center text-2xl tracking-[0.5em] font-mono"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter" && pin.length === 4) onConfirm(pin); }}
                    />
                </div>
                <Button variant="highlight" className="w-full" disabled={pin.length !== 4 || loading} onClick={() => onConfirm(pin)}>
                    {loading ? <span className="flex items-center gap-2"><span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Validando...</span> : "Confirmar"}
                </Button>
            </div>
        </div>
    );
}

export default function ChamadosPage() {
    const fetchOpts = useAuthedFetch();
    const { user } = useAuth();
    const qc = useQueryClient();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [newMsg, setNewMsg] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: "", description: "", priority: "MEDIUM", companyId: "", externalUserId: "" });
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Modal states
    const [pinModal, setPinModal] = useState<null | { type: "assign" | "close" | "delegate" | "reassign"; ticketId: string }>(null);
    const [resolutionNotes, setResolutionNotes] = useState("");
    const [delegateUserId, setDelegateUserId] = useState("");
    const [modalLoading, setModalLoading] = useState(false);

    const isAdminOrGestor = user && "role" in user && (user.role?.name === "Administrador" || user.role?.name === "Gestor");

    const { data: tickets, isLoading: loadingTickets } = useQuery({
        queryKey: ["tickets"],
        queryFn: () => apiClient.get<{ data: any[] }>("/tickets", fetchOpts),
    });

    const { data: ticketDetail, isLoading: loadingDetail } = useQuery({
        queryKey: ["ticket", expandedId],
        queryFn: () => apiClient.get<{ data: any }>(`/tickets/${expandedId}`, fetchOpts),
        enabled: !!expandedId,
    });

    const { data: internalUsers } = useQuery({
        queryKey: ["internal-users"],
        queryFn: () => apiClient.get<{ data: any[] }>("/tickets/internal-users", fetchOpts),
    });

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [ticketDetail?.data?.messages]);

    const { data: companies } = useQuery({
        queryKey: ["companies"],
        queryFn: () => apiClient.get<{ data: any[] }>("/clients/companies", fetchOpts),
        enabled: showCreate,
    });

    const { data: extUsers } = useQuery({
        queryKey: ["extUsers", form.companyId],
        queryFn: () => apiClient.get<{ data: any[] }>(`/clients/external-users?companyId=${form.companyId}`, fetchOpts),
        enabled: showCreate && !!form.companyId,
    });

    const createTicket = useMutation({
        mutationFn: (data: any) => {
            const formData = new FormData();
            formData.append("title", data.title);
            formData.append("description", data.description);
            formData.append("priority", data.priority);
            if (data.companyId) formData.append("companyId", data.companyId);
            if (data.externalUserId) formData.append("externalUserId", data.externalUserId);
            selectedFiles.forEach((f) => formData.append("files", f));
            return apiClient.upload("/tickets", formData);
        },
        onSuccess: () => { toast.success(TOASTS.ticketCreated); qc.invalidateQueries({ queryKey: ["tickets"] }); setShowCreate(false); setForm({ title: "", description: "", priority: "MEDIUM", companyId: "", externalUserId: "" }); setSelectedFiles([]); },
        onError: (e: any) => toast.error(e.message),
    });

    const sendMessage = useMutation({
        mutationFn: (data: { ticketId: string; content: string }) => apiClient.post(`/tickets/${data.ticketId}/messages`, { content: data.content }, fetchOpts),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["ticket", expandedId] }); setNewMsg(""); },
        onError: (e: any) => toast.error(e.message),
    });

    const invalidateAll = () => {
        qc.invalidateQueries({ queryKey: ["tickets"] });
        qc.invalidateQueries({ queryKey: ["ticket", expandedId] });
    };

    // ── PIN confirm handler ──
    const handlePinConfirm = async (pin: string) => {
        if (!pinModal) return;
        setModalLoading(true);
        try {
            if (pinModal.type === "assign") {
                await apiClient.put(`/tickets/${pinModal.ticketId}/assign-with-pin`, { pin }, fetchOpts);
                toast.success(TOASTS.ticketAssigned);
            } else if (pinModal.type === "delegate") {
                if (!delegateUserId) { toast.error("Selecione um colaborador"); setModalLoading(false); return; }
                await apiClient.put(`/tickets/${pinModal.ticketId}/assign-with-pin`, { pin, assignedToId: delegateUserId }, fetchOpts);
                toast.success("Chamado delegado com sucesso");
            } else if (pinModal.type === "reassign") {
                if (!delegateUserId) { toast.error("Selecione um colaborador"); setModalLoading(false); return; }
                await apiClient.put(`/tickets/${pinModal.ticketId}/reassign`, { pin, assignedToId: delegateUserId }, fetchOpts);
                toast.success("Chamado movido com sucesso");
            } else if (pinModal.type === "close") {
                if (resolutionNotes.trim().length < 10) { toast.error("Preencha a descrição do atendimento (mín. 10 caracteres)"); setModalLoading(false); return; }
                await apiClient.put(`/tickets/${pinModal.ticketId}/close-with-pin`, { pin, resolutionNotes: resolutionNotes.trim() }, fetchOpts);
                toast.success("Chamado encerrado com sucesso");
            }
            invalidateAll();
            setPinModal(null);
            setResolutionNotes("");
            setDelegateUserId("");
        } catch (err: any) {
            toast.error(err.message || "Erro na operação");
        } finally {
            setModalLoading(false);
        }
    };

    const priorityColor: Record<string, "destructive" | "warning" | "default"> = {
        CRITICAL: "destructive", HIGH: "destructive", MEDIUM: "warning", LOW: "default",
    };
    const statusColor: Record<string, "success" | "warning" | "destructive" | "default" | "secondary"> = {
        OPEN: "warning", IN_PROGRESS: "default", WAITING_CLIENT: "secondary", RESOLVED: "success", CLOSED: "success",
    };

    const detail = ticketDetail?.data;

    return (
        <div className="space-y-6">
            {/* PIN Modals */}
            {pinModal?.type === "assign" && (
                <PinModal title="Assumir Chamado" onConfirm={handlePinConfirm} onCancel={() => setPinModal(null)} loading={modalLoading} />
            )}
            {pinModal?.type === "delegate" && (
                <PinModal title="Delegar Chamado" onConfirm={handlePinConfirm} onCancel={() => setPinModal(null)} loading={modalLoading}>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Selecione o colaborador</Label>
                        <select
                            value={delegateUserId}
                            onChange={(e) => setDelegateUserId(e.target.value)}
                            className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm"
                            style={{ colorScheme: "dark" }}
                        >
                            <option value="">Selecione...</option>
                            {internalUsers?.data?.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role?.name})</option>
                            ))}
                        </select>
                    </div>
                </PinModal>
            )}
            {pinModal?.type === "reassign" && (
                <PinModal title="Mover Chamado" onConfirm={handlePinConfirm} onCancel={() => setPinModal(null)} loading={modalLoading}>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Novo responsável</Label>
                        <select
                            value={delegateUserId}
                            onChange={(e) => setDelegateUserId(e.target.value)}
                            className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm"
                            style={{ colorScheme: "dark" }}
                        >
                            <option value="">Selecione...</option>
                            {internalUsers?.data?.filter((u: any) => u.id !== detail?.assignedToInternalUserId).map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name} ({u.role?.name})</option>
                            ))}
                        </select>
                    </div>
                </PinModal>
            )}
            {pinModal?.type === "close" && (
                <PinModal title="Finalizar Chamado" onConfirm={handlePinConfirm} onCancel={() => { setPinModal(null); setResolutionNotes(""); }} loading={modalLoading}>
                    <div className="space-y-2">
                        <Label className="text-[var(--zyllen-muted)]">Descrição do Atendimento *</Label>
                        <p className="text-xs text-[var(--zyllen-muted)]/70">Descreva o que foi feito para resolver o problema.</p>
                        <textarea
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            required minLength={10} rows={4}
                            placeholder="Ex: Realizada troca do HD e reinstalação do sistema operacional..."
                            className="w-full rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/40 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30"
                        />
                        {resolutionNotes.trim().length > 0 && resolutionNotes.trim().length < 10 && (
                            <p className="text-xs text-red-400">Mínimo de 10 caracteres ({resolutionNotes.trim().length}/10)</p>
                        )}
                    </div>
                </PinModal>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Headset className="text-[var(--zyllen-highlight)]" /> Chamados
                    </h1>
                    <p className="text-sm text-[var(--zyllen-muted)] hidden sm:block">{PAGE_DESCRIPTIONS.chamados}</p>
                </div>
                <Button variant="highlight" onClick={() => setShowCreate(!showCreate)}>
                    <Plus size={16} /> Novo Chamado
                </Button>
            </div>

            {/* Create form */}
            {showCreate && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-highlight)]/20 max-w-2xl">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Paperclip size={18} className="text-[var(--zyllen-highlight)]" />
                            Novo Chamado
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={(e) => { e.preventDefault(); createTicket.mutate(form); }} className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Título *</Label>
                                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" placeholder="Resumo do problema" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Descrição *</Label>
                                <p className="text-xs text-[var(--zyllen-muted)]/70">
                                    Explique com detalhes o que está acontecendo. Quanto mais informação, mais rápido a resolução.
                                </p>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    required
                                    rows={5}
                                    placeholder="Ex: O computador não liga desde ontem. Já tentei trocar a tomada e verificar os cabos..."
                                    className="w-full rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/40 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30 resize-none"
                                />
                            </div>

                            {/* File Upload */}
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Fotos e Vídeos (opcional)</Label>
                                <p className="text-xs text-[var(--zyllen-muted)]/70">
                                    Anexe fotos ou vídeos mostrando o problema para facilitar a análise.
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*,video/*"
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        const valid = files.filter((f) => {
                                            if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} excede 20 MB`); return false; }
                                            if (!/^(image|video)\//.test(f.type)) { toast.error(`${f.name}: apenas fotos e vídeos`); return false; }
                                            return true;
                                        });
                                        setSelectedFiles((prev) => [...prev, ...valid]);
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full border-2 border-dashed border-[var(--zyllen-border)] rounded-lg p-5 flex flex-col items-center gap-2 hover:border-[var(--zyllen-highlight)]/40 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <ImageIcon size={22} className="text-[var(--zyllen-muted)]" />
                                        <VideoIcon size={22} className="text-[var(--zyllen-muted)]" />
                                    </div>
                                    <span className="text-sm text-[var(--zyllen-muted)]">Clique para selecionar fotos e vídeos</span>
                                    <span className="text-xs text-[var(--zyllen-muted)]/50">Máximo 20 MB por arquivo · JPG, PNG, GIF, MP4, WebM</span>
                                </button>
                                {selectedFiles.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                                        {selectedFiles.map((file, i) => (
                                            <div key={`${file.name}-${i}`} className="relative rounded-lg border border-[var(--zyllen-border)] overflow-hidden group">
                                                {file.type.startsWith("image/") ? (
                                                    <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-20 object-cover" />
                                                ) : (
                                                    <div className="w-full h-20 flex items-center justify-center bg-[var(--zyllen-bg-dark)]">
                                                        <VideoIcon size={28} className="text-[var(--zyllen-muted)]" />
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                                                    className="absolute top-1 right-1 size-5 rounded-full bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} className="text-white" />
                                                </button>
                                                <p className="text-[10px] text-[var(--zyllen-muted)] px-2 py-1 truncate">{file.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Prioridade</Label>
                                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm" style={{ colorScheme: "dark" }}>
                                        <option value="LOW">Baixa</option>
                                        <option value="MEDIUM">Média</option>
                                        <option value="HIGH">Alta</option>
                                        <option value="CRITICAL">Crítica</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Empresa</Label>
                                    <select value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value, externalUserId: "" })} className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm" style={{ colorScheme: "dark" }}>
                                        <option value="">Selecione...</option>
                                        {companies?.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            {form.companyId && (
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Usuário Externo (opcional)</Label>
                                    <select value={form.externalUserId} onChange={(e) => setForm({ ...form, externalUserId: e.target.value })} className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm" style={{ colorScheme: "dark" }}>
                                        <option value="">Nenhum</option>
                                        {extUsers?.data?.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                                    </select>
                                </div>
                            )}
                            <Button type="submit" variant="highlight" className="w-full h-11" disabled={createTicket.isPending}>
                                {createTicket.isPending ? (
                                    <span className="flex items-center gap-2"><span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Criando...</span>
                                ) : (
                                    <span className="flex items-center gap-2"><Plus size={18} /> Criar Chamado</span>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Tickets List */}
            <div className="space-y-3">
                {loadingTickets ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                    </div>
                ) : !tickets?.data?.length ? (
                    <div className="text-center py-12">
                        <Headset size={48} className="mx-auto mb-3 text-[var(--zyllen-muted)]/30" />
                        <p className="text-[var(--zyllen-muted)]">{EMPTY_STATES.ticketsList}</p>
                    </div>
                ) : tickets.data.map((t: any) => {
                    const isExpanded = expandedId === t.id;
                    const d = isExpanded ? detail : null;
                    return (
                        <Card key={t.id} className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] overflow-hidden">
                            {/* Collapsed header — always visible */}
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--zyllen-highlight)]/5 transition-colors"
                                onClick={() => setExpandedId(isExpanded ? null : t.id)}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {isExpanded ? <ChevronUp size={16} className="text-[var(--zyllen-highlight)] shrink-0" /> : <ChevronDown size={16} className="text-[var(--zyllen-muted)] shrink-0" />}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white text-sm font-medium truncate">{t.title}</p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="text-xs text-[var(--zyllen-muted)] flex items-center gap-1">
                                                <Building2 size={11} /> {t.company?.name ?? "—"}
                                            </span>
                                            <span className="text-[var(--zyllen-border)]">·</span>
                                            <span className="text-xs text-[var(--zyllen-muted)] flex items-center gap-1">
                                                <User size={11} /> {t.externalUser?.name ?? t.internalUser?.name ?? "—"}
                                                {t.internalUser?.sector && !t.externalUser?.name && (
                                                    <span className="text-[var(--zyllen-muted)]/60">({t.internalUser.sector})</span>
                                                )}
                                            </span>
                                            {t.internalUser?.name && !t.externalUser?.name && (
                                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Interno</Badge>
                                            )}
                                            {t.assignedTo && (
                                                <>
                                                    <span className="text-[var(--zyllen-border)]">·</span>
                                                    <span className="text-xs text-[var(--zyllen-muted)] flex items-center gap-1">
                                                        <Shield size={11} /> {t.assignedTo.name}
                                                        {t.assignedTo.sector && <span className="text-[var(--zyllen-muted)]/60">({t.assignedTo.sector})</span>}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <Badge variant={statusColor[t.status] ?? "default"} className="text-[10px]">{STATUS_LABELS[t.status] ?? t.status}</Badge>
                                    <Badge variant={priorityColor[t.priority] ?? "default"} className="text-[10px]">{t.priority}</Badge>
                                </div>
                            </div>

                            {/* Expanded detail */}
                            {isExpanded && (
                                <div className="border-t border-[var(--zyllen-border)] p-4 space-y-5 bg-[var(--zyllen-bg-dark)]/30">
                                    {loadingDetail ? (
                                        <div className="space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-20 w-full" /></div>
                                    ) : d ? (
                                        <>
                                            {/* Description */}
                                            <div>
                                                <h4 className="text-xs font-medium text-[var(--zyllen-muted)] uppercase tracking-wider mb-2">Descrição</h4>
                                                <p className="text-sm text-white whitespace-pre-wrap">{d.description}</p>
                                            </div>

                                            {/* Client info */}
                                            {d.externalUser && (
                                                <div>
                                                    <h4 className="text-xs font-medium text-[var(--zyllen-muted)] uppercase tracking-wider mb-2">Informações do Cliente</h4>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                                                        <div className="flex items-center gap-2 text-[var(--zyllen-muted)]">
                                                            <User size={14} /> <span className="text-white">{d.externalUser.name}</span>
                                                        </div>
                                                        {d.externalUser.phone && (
                                                            <div className="flex items-center gap-2 text-[var(--zyllen-muted)]">
                                                                <Phone size={14} /> <span className="text-white">{d.externalUser.phone}</span>
                                                            </div>
                                                        )}
                                                        {d.externalUser.position && (
                                                            <div className="flex items-center gap-2 text-[var(--zyllen-muted)]">
                                                                <Briefcase size={14} /> <span className="text-white">{d.externalUser.position}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 text-[var(--zyllen-muted)]">
                                                            <Building2 size={14} /> <span className="text-white">{d.externalUser.company?.name ?? d.company?.name ?? "—"}</span>
                                                        </div>
                                                        {d.externalUser.project?.name && (
                                                            <div className="flex items-center gap-2 text-[var(--zyllen-muted)]">
                                                                <FolderOpen size={14} /> <span className="text-white">{d.externalUser.project.name}</span>
                                                            </div>
                                                        )}
                                                        {d.externalUser.email && (
                                                            <div className="flex items-center gap-2 text-[var(--zyllen-muted)]">
                                                                <span className="text-xs">✉</span> <span className="text-white">{d.externalUser.email}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Ticket meta */}
                                            <div className="flex flex-wrap gap-4 text-xs text-[var(--zyllen-muted)]">
                                                <span>Aberto por: <span className="text-white">{d.externalUser?.name ?? d.internalUser?.name ?? "—"}{d.internalUser?.sector && !d.externalUser?.name ? ` (${d.internalUser.sector})` : ""}</span></span>
                                                <span><Clock size={12} className="inline mr-1" />SLA: {d.slaDueAt ? new Date(d.slaDueAt).toLocaleString("pt-BR") : "—"}</span>
                                                <span>Técnico: <span className="text-white">{d.assignedTo?.name ?? "Não atribuído"}{d.assignedTo?.sector ? ` (${d.assignedTo.sector})` : ""}</span></span>
                                                <span>Criado: {new Date(d.createdAt).toLocaleString("pt-BR")}</span>
                                                {d.closedAt && <span>Fechado: {new Date(d.closedAt).toLocaleString("pt-BR")}</span>}
                                                {d.elapsedSeconds != null && (
                                                    <span className="text-emerald-400 font-medium">
                                                        <Clock size={12} className="inline mr-1" />Tempo de atendimento: {formatElapsedSeconds(d.elapsedSeconds)}
                                                    </span>
                                                )}
                                                {d.firstResponseAt && !d.closedAt && (
                                                    <span className="text-blue-400 font-medium">
                                                        <Clock size={12} className="inline mr-1" />Assumido: {new Date(d.firstResponseAt).toLocaleString("pt-BR")}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Attachments */}
                                            {d.attachments?.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-medium text-[var(--zyllen-muted)] uppercase tracking-wider mb-2">Anexos</h4>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        {d.attachments.map((att: any) => (
                                                            <a key={att.id} href={`${API_BASE}${att.filePath}`} target="_blank" rel="noopener noreferrer"
                                                                className="block rounded-lg border border-[var(--zyllen-border)] overflow-hidden hover:border-[var(--zyllen-highlight)]/30 transition-colors">
                                                                {isImage(att.fileName) ? (
                                                                    <img src={`${API_BASE}${att.filePath}`} alt={att.fileName} className="w-full h-20 object-cover" />
                                                                ) : isVideo(att.fileName) ? (
                                                                    <div className="w-full h-20 flex items-center justify-center bg-[var(--zyllen-bg-dark)]"><VideoIcon size={28} className="text-[var(--zyllen-muted)]" /></div>
                                                                ) : (
                                                                    <div className="w-full h-20 flex items-center justify-center bg-[var(--zyllen-bg-dark)]"><FileText size={28} className="text-[var(--zyllen-muted)]" /></div>
                                                                )}
                                                                <p className="text-[10px] text-[var(--zyllen-muted)] px-2 py-1 truncate">{att.fileName}</p>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Resolution Notes */}
                                            {d.resolutionNotes && (
                                                <div className="p-3 rounded-lg border border-[var(--zyllen-success)]/20 bg-[var(--zyllen-success)]/5">
                                                    <h4 className="text-xs font-medium text-[var(--zyllen-success)] uppercase tracking-wider mb-1">Descrição do Atendimento</h4>
                                                    <p className="text-sm text-white whitespace-pre-wrap">{d.resolutionNotes}</p>
                                                </div>
                                            )}

                                            {d.rating && (
                                                <div className="p-3 rounded-lg border border-yellow-400/20 bg-yellow-400/5 space-y-2">
                                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                                        <h4 className="text-xs font-medium text-yellow-300 uppercase tracking-wider">Avaliação do Atendimento</h4>
                                                        <span className="text-xs text-[var(--zyllen-muted)]">{new Date(d.rating.createdAt).toLocaleString("pt-BR")}</span>
                                                    </div>
                                                    <p className="text-lg tracking-wide text-yellow-300">{renderStars(d.rating.rating)}</p>
                                                    {d.rating.comment && <p className="text-sm text-white whitespace-pre-wrap">{d.rating.comment}</p>}
                                                    {d.rating.evaluator?.name && (
                                                        <p className="text-xs text-[var(--zyllen-muted)]">Avaliado por <span className="text-white">{d.rating.evaluator.name}</span></p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Actions (only non-CLOSED) */}
                                            {d.status !== "CLOSED" && (
                                                <div className="flex gap-2 flex-wrap">
                                                    {!d.assignedToInternalUserId && (
                                                        <Button size="sm" variant="highlight" onClick={() => setPinModal({ type: "assign", ticketId: d.id })}>
                                                            <Shield size={14} className="mr-1" /> Assumir
                                                        </Button>
                                                    )}
                                                    {!d.assignedToInternalUserId && isAdminOrGestor && (
                                                        <Button size="sm" variant="outline" className="text-white border-[var(--zyllen-border)]"
                                                            onClick={() => { setDelegateUserId(""); setPinModal({ type: "delegate", ticketId: d.id }); }}>
                                                            <User size={14} className="mr-1" /> Delegar
                                                        </Button>
                                                    )}
                                                    {d.assignedToInternalUserId && isAdminOrGestor && (
                                                        <Button size="sm" variant="outline" className="text-white border-[var(--zyllen-border)]"
                                                            onClick={() => { setDelegateUserId(""); setPinModal({ type: "reassign", ticketId: d.id }); }}>
                                                            <ArrowRightLeft size={14} className="mr-1" /> Mover
                                                        </Button>
                                                    )}
                                                    {d.assignedToInternalUserId && (
                                                        <Button size="sm" variant="outline" className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                                                            onClick={() => { setResolutionNotes(""); setPinModal({ type: "close", ticketId: d.id }); }}>
                                                            <Lock size={14} className="mr-1" /> Finalizar
                                                        </Button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Messages — only for internal (collaborator) tickets */}
                                            {d.source === "INTERNAL" && (
                                            <div className="border-t border-[var(--zyllen-border)] pt-4">
                                                <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                                                    <MessageSquare size={14} /> Mensagens
                                                </h3>
                                                <div className="space-y-3 max-h-[300px] overflow-y-auto mb-3">
                                                    {d.messages?.length ? d.messages.map((m: any) => (
                                                        <div key={m.id} className={`p-3 rounded-lg text-sm ${
                                                            m.authorType === "external"
                                                                ? "bg-[var(--zyllen-highlight)]/10 border border-[var(--zyllen-highlight)]/20 ml-8"
                                                                : "bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50 mr-8"
                                                        }`}>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-xs font-medium text-[var(--zyllen-highlight)]">
                                                                    {m.authorType === "external" ? "Colaborador" : "Atendente"}
                                                                </span>
                                                                <span className="text-[10px] text-[var(--zyllen-muted)]">{new Date(m.createdAt).toLocaleString("pt-BR")}</span>
                                                            </div>
                                                            <p className="text-white">{m.content}</p>
                                                        </div>
                                                    )) : <p className="text-sm text-[var(--zyllen-muted)]">Nenhuma mensagem.</p>}
                                                    <div ref={messagesEndRef} />
                                                </div>
                                                {d.status !== "CLOSED" && (
                                                    <form onSubmit={(e) => { e.preventDefault(); if (newMsg.trim()) sendMessage.mutate({ ticketId: d.id, content: newMsg }); }} className="flex gap-2">
                                                        <Input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Escreva uma mensagem..."
                                                            className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                                        <Button type="submit" variant="highlight" disabled={sendMessage.isPending}><Send size={16} /></Button>
                                                    </form>
                                                )}
                                            </div>
                                            )}
                                        </>
                                    ) : null}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
