"use client";
import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuth, useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import {
    ClipboardList, Plus, ArrowLeft, Search, Trash2, Edit, MessageSquare,
    Image, FileText, Send, X, ChevronDown, Clock, Building2, User, Phone,
    History, MoreVertical, Upload,
} from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";

// ─── Types ──────────────────────────────────────
type Tab = "list" | "new" | "detail";

interface Company {
    id: string;
    name: string;
    cnpj?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
}

interface FollowupBlock {
    id: string;
    type: "TEXT" | "MEDIA";
    title?: string;
    content?: string;
    order: number;
    attachments: { id: string; fileName: string; filePath: string; mimeType?: string }[];
    comments: { id: string; text: string; createdAt: string; author: { id: string; name: string } }[];
}

interface Followup {
    id: string;
    code: string;
    status: string;
    responsibleName?: string;
    responsibleContact?: string;
    createdAt: string;
    updatedAt: string;
    company: Company;
    createdBy: { id: string; name: string; email: string };
    blocks: FollowupBlock[];
    _count?: { blocks: number };
}

const STATUS_CONFIG: Record<string, { label: string; variant: "warning" | "default" | "success" }> = {
    IN_PROGRESS: { label: "Em Andamento", variant: "default" },
    PENDING: { label: "Pendente", variant: "warning" },
    COMPLETED: { label: "Concluído", variant: "success" },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ═══════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════
export default function AcompanhamentoPage() {
    const fetchOpts = useAuthedFetch();
    const { user } = useAuth();
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("list");
    const [selected, setSelected] = useState<Followup | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    // ── List query ──
    const { data: listData, isLoading } = useQuery({
        queryKey: ["followups", statusFilter, searchTerm],
        queryFn: () =>
            apiClient.get<{ data: Followup[]; total: number }>(
                `/followups?limit=100${statusFilter ? `&status=${statusFilter}` : ""}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ""}`,
                fetchOpts,
            ),
    });

    // ── Detail query ──
    const { data: detailData, isLoading: loadingDetail } = useQuery({
        queryKey: ["followup", selected?.id],
        queryFn: () => apiClient.get<{ data: Followup }>(`/followups/${selected!.id}`, fetchOpts),
        enabled: !!selected?.id && tab === "detail",
    });

    const detail = detailData?.data;

    const openDetail = (f: Followup) => {
        setSelected(f);
        setTab("detail");
    };

    const backToList = () => {
        setTab("list");
        setSelected(null);
        qc.invalidateQueries({ queryKey: ["followups"] });
    };

    // ─────────────────────────────────
    // TAB: LIST
    // ─────────────────────────────────
    if (tab === "list") {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <ClipboardList className="text-[var(--zyllen-highlight)]" size={28} />
                            Acompanhamento
                        </h1>
                        <p className="text-sm text-[var(--zyllen-muted)] mt-1">
                            Registre e acompanhe a evolução dos projetos dos clientes
                        </p>
                    </div>
                    <Button onClick={() => setTab("new")} className="gap-2 bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg-dark)] hover:bg-[var(--zyllen-highlight)]/90 font-semibold">
                        <Plus size={18} /> Novo Acompanhamento
                    </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por código ou empresa..."
                            className="w-full pl-10 pr-4 h-10 rounded-md bg-[var(--zyllen-bg)] border border-[var(--zyllen-border)] text-white text-sm placeholder:text-[var(--zyllen-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-10 px-3 rounded-md bg-[var(--zyllen-bg)] border border-[var(--zyllen-border)] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30"
                    >
                        <option value="">Todos os status</option>
                        <option value="IN_PROGRESS">Em Andamento</option>
                        <option value="PENDING">Pendente</option>
                        <option value="COMPLETED">Concluído</option>
                    </select>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
                ) : !listData?.data?.length ? (
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <ClipboardList size={48} className="text-[var(--zyllen-muted)] mb-4" />
                            <p className="text-[var(--zyllen-muted)]">Nenhum acompanhamento encontrado</p>
                            <Button onClick={() => setTab("new")} variant="ghost" className="mt-4 text-[var(--zyllen-highlight)]">
                                <Plus size={16} className="mr-2" /> Criar primeiro acompanhamento
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-3">
                        {listData.data.map((f) => {
                            const st = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.IN_PROGRESS;
                            return (
                                <Card
                                    key={f.id}
                                    className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/40 transition-colors cursor-pointer"
                                    onClick={() => openDetail(f)}
                                >
                                    <CardContent className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="flex items-center justify-center size-10 rounded-lg bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)] shrink-0">
                                                <ClipboardList size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono text-sm text-[var(--zyllen-highlight)]">{f.code}</span>
                                                    <Badge variant={st.variant as any}>{st.label}</Badge>
                                                </div>
                                                <p className="text-white font-medium truncate mt-0.5">{f.company?.name}</p>
                                                <p className="text-xs text-[var(--zyllen-muted)] mt-0.5">
                                                    por {f.createdBy?.name} • {new Date(f.createdAt).toLocaleDateString("pt-BR")}
                                                    {f._count?.blocks !== undefined && ` • ${f._count.blocks} bloco(s)`}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronDown size={18} className="text-[var(--zyllen-muted)] -rotate-90 shrink-0" />
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // ─────────────────────────────────
    // TAB: NEW
    // ─────────────────────────────────
    if (tab === "new") {
        return <NewFollowupForm onBack={backToList} fetchOpts={fetchOpts} qc={qc} onCreated={(f) => { setSelected(f); setTab("detail"); }} />;
    }

    // ─────────────────────────────────
    // TAB: DETAIL
    // ─────────────────────────────────
    if (tab === "detail" && selected) {
        return (
            <FollowupDetail
                followup={detail ?? selected}
                loading={loadingDetail}
                fetchOpts={fetchOpts}
                qc={qc}
                user={user}
                onBack={backToList}
            />
        );
    }

    return null;
}

// ═══════════════════════════════════════════════════
// New Followup Form
// ═══════════════════════════════════════════════════
function NewFollowupForm({ onBack, fetchOpts, qc, onCreated }: {
    onBack: () => void;
    fetchOpts: any;
    qc: any;
    onCreated: (f: Followup) => void;
}) {
    const [companySearch, setCompanySearch] = useState("");
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [responsibleName, setResponsibleName] = useState("");
    const [responsibleContact, setResponsibleContact] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Companies search
    const { data: companies } = useQuery({
        queryKey: ["companies-search", companySearch],
        queryFn: () => apiClient.get<{ data: Company[] }>(`/clients/companies?search=${encodeURIComponent(companySearch)}&limit=20`, fetchOpts),
        enabled: companySearch.length >= 1 && !selectedCompany,
    });

    const handleSubmit = async () => {
        if (!selectedCompany) { toast.error("Selecione uma empresa"); return; }
        setSubmitting(true);
        try {
            const res = await apiClient.post<{ data: Followup }>("/followups", {
                companyId: selectedCompany.id,
                responsibleName: responsibleName || undefined,
                responsibleContact: responsibleContact || undefined,
            }, fetchOpts);
            toast.success("Acompanhamento criado!");
            qc.invalidateQueries({ queryKey: ["followups"] });
            onCreated(res.data);
        } catch (e: any) {
            toast.error(e.message || "Erro ao criar");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={onBack} className="text-[var(--zyllen-muted)] hover:text-white">
                    <ArrowLeft size={18} />
                </Button>
                <h1 className="text-xl font-bold text-white">Novo Acompanhamento</h1>
            </div>

            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                        <Building2 size={20} className="text-[var(--zyllen-highlight)]" />
                        Selecionar Empresa
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {selectedCompany ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-highlight)]/10 border border-[var(--zyllen-highlight)]/30">
                                <div>
                                    <p className="text-white font-medium">{selectedCompany.name}</p>
                                    {selectedCompany.cnpj && <p className="text-xs text-[var(--zyllen-muted)]">CNPJ: {selectedCompany.cnpj}</p>}
                                    {(selectedCompany.city || selectedCompany.state) && (
                                        <p className="text-xs text-[var(--zyllen-muted)]">
                                            {[selectedCompany.city, selectedCompany.state].filter(Boolean).join(" - ")}
                                        </p>
                                    )}
                                    {selectedCompany.phone && <p className="text-xs text-[var(--zyllen-muted)]">Tel: {selectedCompany.phone}</p>}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedCompany(null); setCompanySearch(""); }}>
                                    <X size={16} className="text-[var(--zyllen-muted)]" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                                <input
                                    value={companySearch}
                                    onChange={(e) => setCompanySearch(e.target.value)}
                                    placeholder="Buscar empresa pelo nome..."
                                    className="w-full pl-10 pr-4 h-10 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm placeholder:text-[var(--zyllen-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30"
                                    autoFocus
                                />
                            </div>
                            {companies?.data && companies.data.length > 0 && (
                                <div className="max-h-48 overflow-y-auto rounded-md border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)]">
                                    {companies.data.map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => { setSelectedCompany(c); setCompanySearch(""); }}
                                            className="w-full text-left px-3 py-2.5 hover:bg-[var(--zyllen-highlight)]/10 transition-colors border-b border-[var(--zyllen-border)] last:border-0"
                                        >
                                            <p className="text-white text-sm font-medium">{c.name}</p>
                                            {c.cnpj && <p className="text-xs text-[var(--zyllen-muted)]">CNPJ: {c.cnpj}</p>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedCompany && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <CardHeader>
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                            <User size={20} className="text-[var(--zyllen-highlight)]" />
                            Responsável do Cliente
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm text-[var(--zyllen-muted)] mb-1 block">Nome do responsável</label>
                            <input
                                value={responsibleName}
                                onChange={(e) => setResponsibleName(e.target.value)}
                                placeholder="Nome do contato no cliente"
                                className="w-full h-10 px-3 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm placeholder:text-[var(--zyllen-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30"
                            />
                        </div>
                        <div>
                            <label className="text-sm text-[var(--zyllen-muted)] mb-1 block">Contato (telefone, e-mail, etc.)</label>
                            <input
                                value={responsibleContact}
                                onChange={(e) => setResponsibleContact(e.target.value)}
                                placeholder="(11) 99999-9999 ou email@empresa.com"
                                className="w-full h-10 px-3 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm placeholder:text-[var(--zyllen-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30"
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={onBack} className="text-[var(--zyllen-muted)]">Cancelar</Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!selectedCompany || submitting}
                    className="bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg-dark)] hover:bg-[var(--zyllen-highlight)]/90 font-semibold disabled:opacity-40"
                >
                    {submitting ? "Criando..." : "Criar Acompanhamento"}
                </Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// Followup Detail View
// ═══════════════════════════════════════════════════
function FollowupDetail({ followup, loading, fetchOpts, qc, user, onBack }: {
    followup: Followup;
    loading: boolean;
    fetchOpts: any;
    qc: any;
    user: any;
    onBack: () => void;
}) {
    const [editingData, setEditingData] = useState(false);
    const [respName, setRespName] = useState(followup.responsibleName ?? "");
    const [respContact, setRespContact] = useState(followup.responsibleContact ?? "");
    const [showHistory, setShowHistory] = useState(false);

    // Sync state when followup changes
    const prevId = useRef(followup.id);
    if (prevId.current !== followup.id) {
        prevId.current = followup.id;
        setRespName(followup.responsibleName ?? "");
        setRespContact(followup.responsibleContact ?? "");
    }

    const st = STATUS_CONFIG[followup.status] ?? STATUS_CONFIG.IN_PROGRESS;

    // ── Mutations ──
    const updateFollowup = useMutation({
        mutationFn: (body: any) => apiClient.put(`/followups/${followup.id}`, body, fetchOpts),
        onSuccess: () => {
            toast.success("Atualizado!");
            qc.invalidateQueries({ queryKey: ["followup", followup.id] });
            setEditingData(false);
        },
        onError: (e: any) => toast.error(e.message),
    });

    const changeStatus = useMutation({
        mutationFn: (status: string) => apiClient.put(`/followups/${followup.id}/status`, { status }, fetchOpts),
        onSuccess: () => {
            toast.success("Status atualizado!");
            qc.invalidateQueries({ queryKey: ["followup", followup.id] });
            qc.invalidateQueries({ queryKey: ["followups"] });
        },
        onError: (e: any) => toast.error(e.message),
    });

    const deleteFollowup = useMutation({
        mutationFn: () => apiClient.delete(`/followups/${followup.id}`, fetchOpts),
        onSuccess: () => {
            toast.success("Acompanhamento removido");
            qc.invalidateQueries({ queryKey: ["followups"] });
            onBack();
        },
        onError: (e: any) => toast.error(e.message),
    });

    const addBlock = useMutation({
        mutationFn: (body: { type: string; title?: string; content?: string }) =>
            apiClient.post(`/followups/${followup.id}/blocks`, body, fetchOpts),
        onSuccess: () => {
            toast.success("Bloco adicionado!");
            qc.invalidateQueries({ queryKey: ["followup", followup.id] });
        },
        onError: (e: any) => toast.error(e.message),
    });

    // History query
    const { data: historyData } = useQuery({
        queryKey: ["followup-history", followup.id],
        queryFn: () => apiClient.get<{ data: any[] }>(`/followups/${followup.id}/history`, fetchOpts),
        enabled: showHistory,
    });

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-32 w-full rounded-lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={onBack} className="text-[var(--zyllen-muted)] hover:text-white">
                        <ArrowLeft size={18} />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-white">{followup.code}</h1>
                            <Badge variant={st.variant as any}>{st.label}</Badge>
                        </div>
                        <p className="text-sm text-[var(--zyllen-muted)]">{followup.company?.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {followup.status !== "COMPLETED" && (
                        <select
                            value={followup.status}
                            onChange={(e) => changeStatus.mutate(e.target.value)}
                            className="h-9 px-3 rounded-md bg-[var(--zyllen-bg)] border border-[var(--zyllen-border)] text-white text-sm"
                        >
                            <option value="IN_PROGRESS">Em Andamento</option>
                            <option value="PENDING">Pendente</option>
                            <option value="COMPLETED">Concluído</option>
                        </select>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="text-[var(--zyllen-muted)] hover:text-white gap-1">
                        <History size={16} /> Histórico
                    </Button>
                    <Button
                        variant="ghost" size="sm"
                        onClick={() => { if (confirm("Tem certeza que deseja excluir?")) deleteFollowup.mutate(); }}
                        className="text-[var(--zyllen-error)] hover:text-[var(--zyllen-error)] hover:bg-[var(--zyllen-error)]/10"
                    >
                        <Trash2 size={16} />
                    </Button>
                </div>
            </div>

            {/* History panel */}
            {showHistory && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] animate-in fade-in slide-in-from-top-2 duration-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-white text-sm flex items-center gap-2">
                            <History size={16} className="text-[var(--zyllen-highlight)]" /> Histórico de Alterações
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {historyData?.data?.length ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {historyData.data.map((h: any) => (
                                    <div key={h.id} className="flex items-start gap-2 text-xs py-1 border-b border-[var(--zyllen-border)] last:border-0">
                                        <Clock size={12} className="text-[var(--zyllen-muted)] mt-0.5 shrink-0" />
                                        <div>
                                            <span className="text-white">{h.user?.name}</span>
                                            <span className="text-[var(--zyllen-muted)]"> — {h.action}</span>
                                            <span className="text-[var(--zyllen-muted)] ml-2">
                                                {new Date(h.createdAt).toLocaleString("pt-BR")}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-[var(--zyllen-muted)]">Nenhum registro</p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ── Seção Dados ── */}
            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-white text-lg">Dados</CardTitle>
                    {!editingData && (
                        <Button variant="ghost" size="sm" onClick={() => setEditingData(true)} className="text-[var(--zyllen-muted)] hover:text-white gap-1">
                            <Edit size={14} /> Editar
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Dados automáticos */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-[var(--zyllen-muted)] uppercase tracking-wider">Empresa</label>
                                <p className="text-white font-medium">{followup.company?.name}</p>
                            </div>
                            {followup.company?.cnpj && (
                                <div>
                                    <label className="text-xs text-[var(--zyllen-muted)] uppercase tracking-wider">CNPJ</label>
                                    <p className="text-white text-sm">{followup.company.cnpj}</p>
                                </div>
                            )}
                            {(followup.company?.city || followup.company?.state) && (
                                <div>
                                    <label className="text-xs text-[var(--zyllen-muted)] uppercase tracking-wider">Localização</label>
                                    <p className="text-white text-sm">
                                        {[followup.company.address, followup.company.city, followup.company.state].filter(Boolean).join(", ")}
                                    </p>
                                </div>
                            )}
                            {followup.company?.phone && (
                                <div>
                                    <label className="text-xs text-[var(--zyllen-muted)] uppercase tracking-wider">Telefone</label>
                                    <p className="text-white text-sm">{followup.company.phone}</p>
                                </div>
                            )}
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-[var(--zyllen-muted)] uppercase tracking-wider">Colaborador</label>
                                <p className="text-white text-sm">{followup.createdBy?.name}</p>
                            </div>
                            <div>
                                <label className="text-xs text-[var(--zyllen-muted)] uppercase tracking-wider">Data do Registro</label>
                                <p className="text-white text-sm">{new Date(followup.createdAt).toLocaleString("pt-BR")}</p>
                            </div>

                            {/* Editáveis */}
                            {editingData ? (
                                <>
                                    <div>
                                        <label className="text-xs text-[var(--zyllen-muted)] uppercase tracking-wider">Responsável do Cliente</label>
                                        <input
                                            value={respName}
                                            onChange={(e) => setRespName(e.target.value)}
                                            className="w-full h-9 px-3 mt-1 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[var(--zyllen-muted)] uppercase tracking-wider">Contato do Responsável</label>
                                        <input
                                            value={respContact}
                                            onChange={(e) => setRespContact(e.target.value)}
                                            className="w-full h-9 px-3 mt-1 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <Button size="sm" onClick={() => updateFollowup.mutate({ responsibleName: respName, responsibleContact: respContact })} className="bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg-dark)] text-xs">
                                            Salvar
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingData(false)} className="text-[var(--zyllen-muted)] text-xs">
                                            Cancelar
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-xs text-[var(--zyllen-muted)] uppercase tracking-wider">Responsável do Cliente</label>
                                        <p className="text-white text-sm">{followup.responsibleName || <span className="text-[var(--zyllen-muted)] italic">Não informado</span>}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-[var(--zyllen-muted)] uppercase tracking-wider">Contato</label>
                                        <p className="text-white text-sm">{followup.responsibleContact || <span className="text-[var(--zyllen-muted)] italic">Não informado</span>}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Formulário Dinâmico ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Blocos de Registro</h2>
                    {followup.status !== "COMPLETED" && (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addBlock.mutate({ type: "TEXT", title: "" })}
                                className="gap-1 border-[var(--zyllen-border)] text-white hover:bg-[var(--zyllen-highlight)]/10 hover:text-[var(--zyllen-highlight)] hover:border-[var(--zyllen-highlight)]/30"
                            >
                                <FileText size={14} /> Texto
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addBlock.mutate({ type: "MEDIA", title: "" })}
                                className="gap-1 border-[var(--zyllen-border)] text-white hover:bg-[var(--zyllen-highlight)]/10 hover:text-[var(--zyllen-highlight)] hover:border-[var(--zyllen-highlight)]/30"
                            >
                                <Image size={14} /> Mídia
                            </Button>
                        </div>
                    )}
                </div>

                {(!followup.blocks || followup.blocks.length === 0) ? (
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <Plus size={36} className="text-[var(--zyllen-muted)] mb-3" />
                            <p className="text-[var(--zyllen-muted)] text-sm">Nenhum bloco adicionado ainda</p>
                            <p className="text-xs text-[var(--zyllen-muted)] mt-1">Clique em "Texto" ou "Mídia" para adicionar blocos</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {followup.blocks.map((block, idx) => (
                            <BlockCard
                                key={block.id}
                                block={block}
                                followupId={followup.id}
                                index={idx}
                                fetchOpts={fetchOpts}
                                qc={qc}
                                readOnly={followup.status === "COMPLETED"}
                            />
                        ))}
                    </div>
                )}

                {followup.status !== "COMPLETED" && followup.blocks && followup.blocks.length > 0 && (
                    <div className="flex justify-center pt-2">
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addBlock.mutate({ type: "TEXT", title: "" })}
                                className="gap-1 text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)]"
                            >
                                <Plus size={14} /> Adicionar Texto
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addBlock.mutate({ type: "MEDIA", title: "" })}
                                className="gap-1 text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)]"
                            >
                                <Plus size={14} /> Adicionar Mídia
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════
// Block Card Component
// ═══════════════════════════════════════════════════
function BlockCard({ block, followupId, index, fetchOpts, qc, readOnly }: {
    block: FollowupBlock;
    followupId: string;
    index: number;
    fetchOpts: any;
    qc: any;
    readOnly: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(block.title ?? "");
    const [content, setContent] = useState(block.content ?? "");
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const updateBlock = useMutation({
        mutationFn: (body: any) => apiClient.put(`/followups/${followupId}/blocks/${block.id}`, body, fetchOpts),
        onSuccess: () => {
            toast.success("Bloco atualizado");
            qc.invalidateQueries({ queryKey: ["followup", followupId] });
            setEditing(false);
        },
        onError: (e: any) => toast.error(e.message),
    });

    const removeBlock = useMutation({
        mutationFn: () => apiClient.delete(`/followups/${followupId}/blocks/${block.id}`, fetchOpts),
        onSuccess: () => {
            toast.success("Bloco removido");
            qc.invalidateQueries({ queryKey: ["followup", followupId] });
        },
        onError: (e: any) => toast.error(e.message),
    });

    const addComment = useMutation({
        mutationFn: (text: string) => apiClient.post(`/followups/${followupId}/blocks/${block.id}/comments`, { text }, fetchOpts),
        onSuccess: () => {
            toast.success("Comentário adicionado");
            qc.invalidateQueries({ queryKey: ["followup", followupId] });
            setNewComment("");
        },
        onError: (e: any) => toast.error(e.message),
    });

    const removeAttachment = useMutation({
        mutationFn: (attId: string) => apiClient.delete(`/followups/${followupId}/blocks/${block.id}/attachments/${attId}`, fetchOpts),
        onSuccess: () => {
            toast.success("Arquivo removido");
            qc.invalidateQueries({ queryKey: ["followup", followupId] });
        },
        onError: (e: any) => toast.error(e.message),
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        setUploading(true);
        try {
            const formData = new FormData();
            for (const f of Array.from(files)) formData.append("files", f);
            await apiClient.upload(`/followups/${followupId}/blocks/${block.id}/attachments`, formData, fetchOpts);
            toast.success("Upload concluído!");
            qc.invalidateQueries({ queryKey: ["followup", followupId] });
        } catch (e: any) {
            toast.error(e.message || "Erro no upload");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const isText = block.type === "TEXT";
    const isMedia = block.type === "MEDIA";

    return (
        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Block header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)]/50">
                <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center size-7 rounded ${isText ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"}`}>
                        {isText ? <FileText size={14} /> : <Image size={14} />}
                    </div>
                    {editing ? (
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Título do bloco (opcional)"
                            className="h-7 px-2 rounded bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/30"
                            autoFocus
                        />
                    ) : (
                        <span className="text-white text-sm font-medium">
                            {block.title || `Bloco ${index + 1}`}
                        </span>
                    )}
                    <span className="text-xs text-[var(--zyllen-muted)] capitalize">{isText ? "Texto" : "Mídia"}</span>
                </div>
                {!readOnly && (
                    <div className="flex items-center gap-1">
                        {editing ? (
                            <>
                                <Button size="sm" variant="ghost" onClick={() => updateBlock.mutate({ title, content })} className="text-[var(--zyllen-highlight)] text-xs h-7">Salvar</Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setTitle(block.title ?? ""); setContent(block.content ?? ""); }} className="text-[var(--zyllen-muted)] text-xs h-7">Cancelar</Button>
                            </>
                        ) : (
                            <>
                                <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="text-[var(--zyllen-muted)] hover:text-white h-7 w-7 p-0">
                                    <Edit size={14} />
                                </Button>
                                <Button
                                    size="sm" variant="ghost"
                                    onClick={() => { if (confirm("Remover este bloco?")) removeBlock.mutate(); }}
                                    className="text-[var(--zyllen-muted)] hover:text-[var(--zyllen-error)] h-7 w-7 p-0"
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Block content */}
            <CardContent className="p-4 space-y-3">
                {/* Text content */}
                {isText && (
                    editing ? (
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                            placeholder="Digite suas anotações aqui..."
                            className="w-full px-3 py-2 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm placeholder:text-[var(--zyllen-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30 resize-y"
                        />
                    ) : (
                        <div className="text-white text-sm whitespace-pre-wrap min-h-[2rem]">
                            {block.content || <span className="text-[var(--zyllen-muted)] italic">Sem conteúdo. Clique em editar para adicionar texto.</span>}
                        </div>
                    )
                )}

                {/* Media zone */}
                {isMedia && (
                    <div className="space-y-3">
                        {block.attachments.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {block.attachments.map((att) => {
                                    const isImage = att.mimeType?.startsWith("image/");
                                    const isVideo = att.mimeType?.startsWith("video/");
                                    const url = `${API_URL}/followups/${followupId}/blocks/${block.id}/attachments/${att.id}/file`;
                                    return (
                                        <div key={att.id} className="relative group rounded-lg overflow-hidden border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)]">
                                            {isImage && (
                                                <img src={url} alt={att.fileName} className="w-full h-32 object-cover" />
                                            )}
                                            {isVideo && (
                                                <video src={url} controls className="w-full h-32 object-cover" />
                                            )}
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 flex items-center justify-between">
                                                <span className="text-xs text-white truncate flex-1">{att.fileName}</span>
                                                {!readOnly && (
                                                    <button onClick={() => removeAttachment.mutate(att.id)} className="text-[var(--zyllen-error)] hover:text-white ml-1">
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {!readOnly && (
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="gap-1 border-dashed border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)] hover:border-[var(--zyllen-highlight)]/30"
                                >
                                    <Upload size={14} />
                                    {uploading ? "Enviando..." : "Upload de imagem/vídeo"}
                                </Button>
                            </div>
                        )}
                        {/* Also allow text caption for media blocks */}
                        {editing ? (
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={2}
                                placeholder="Descrição / legenda do bloco (opcional)"
                                className="w-full px-3 py-2 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm placeholder:text-[var(--zyllen-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30 resize-y"
                            />
                        ) : block.content ? (
                            <p className="text-white text-sm whitespace-pre-wrap">{block.content}</p>
                        ) : null}
                    </div>
                )}

                {/* Comments section */}
                <div className="pt-2 border-t border-[var(--zyllen-border)]">
                    <button
                        onClick={() => setShowComments(!showComments)}
                        className="flex items-center gap-1.5 text-xs text-[var(--zyllen-muted)] hover:text-white transition-colors"
                    >
                        <MessageSquare size={12} />
                        {block.comments.length} comentário(s)
                        <ChevronDown size={12} className={`transition-transform ${showComments ? "rotate-180" : ""}`} />
                    </button>

                    {showComments && (
                        <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            {block.comments.map((c) => (
                                <div key={c.id} className="flex gap-2 text-xs">
                                    <div className="size-6 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] flex items-center justify-center font-bold text-[10px] shrink-0">
                                        {c.author.name.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="text-white font-medium">{c.author.name}</span>
                                        <span className="text-[var(--zyllen-muted)] ml-2">{new Date(c.createdAt).toLocaleString("pt-BR")}</span>
                                        <p className="text-[var(--zyllen-muted)] mt-0.5">{c.text}</p>
                                    </div>
                                </div>
                            ))}

                            {/* New comment input */}
                            {!readOnly && (
                                <div className="flex gap-2 mt-2">
                                    <input
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter" && newComment.trim()) addComment.mutate(newComment.trim()); }}
                                        placeholder="Escreva um comentário..."
                                        className="flex-1 h-8 px-3 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-xs placeholder:text-[var(--zyllen-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/30"
                                    />
                                    <Button
                                        size="sm"
                                        disabled={!newComment.trim()}
                                        onClick={() => { if (newComment.trim()) addComment.mutate(newComment.trim()); }}
                                        className="h-8 w-8 p-0 bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg-dark)]"
                                    >
                                        <Send size={12} />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
