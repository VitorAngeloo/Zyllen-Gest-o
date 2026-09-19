"use client";
import { followupsApi } from "@web/features/followups/api/followups-api";
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import { ClipboardList, Plus, ArrowLeft, Trash2, Edit, Image, FileText, Clock, History, Printer, FileArchive, PenLine } from "lucide-react";
import { printFollowupPdf } from "@web/features/followups/utils/followup-pdf";
import { Skeleton } from "@web/components/ui/skeleton";
import type { Followup } from "../types/followup.types";
import { STATUS_CONFIG } from "../followup.constants";
import { API_URL } from "../followup.constants";
import { BlockCard } from "./followup-block-card";

export function FollowupDetail({ followup, loading, fetchOpts, qc, onBack }: {
    followup: Followup;
    loading: boolean;
    fetchOpts: any;
    qc: any;
    user?: any;  // reserved for permission checks
    onBack: () => void;
}) {
    const [editingData, setEditingData] = useState(false);
    const [respName, setRespName] = useState(followup.responsibleName ?? "");
    const [respContact, setRespContact] = useState(followup.responsibleContact ?? "");
    const [editProjectId, setEditProjectId] = useState(followup.project?.id ?? "");
    const [showHistory, setShowHistory] = useState(false);

    // Sync state when followup changes
    const prevId = useRef(followup.id);
    if (prevId.current !== followup.id) {
        prevId.current = followup.id;
        setRespName(followup.responsibleName ?? "");
        setRespContact(followup.responsibleContact ?? "");
        setEditProjectId(followup.project?.id ?? "");
    }

    // Projetos da empresa deste acompanhamento (para vincular/alterar)
    const { data: detailProjects } = useQuery({
        queryKey: ["company-projects", followup.company?.id],
        queryFn: () => followupsApi.listProjects<{ data: { id: string; name: string }[] }>(followup.company?.id, fetchOpts),
        enabled: !!followup.company?.id,
    });

    const st = STATUS_CONFIG[followup.status] ?? STATUS_CONFIG.IN_PROGRESS;

    // ── Mutations ──
    const updateFollowup = useMutation({
        mutationFn: (body: any) => followupsApi.updateFollowup(followup.id, body, fetchOpts),
        onSuccess: () => {
            toast.success("Atualizado!");
            qc.invalidateQueries({ queryKey: ["followup", followup.id] });
            qc.invalidateQueries({ queryKey: ["followups"] });
            setEditingData(false);
        },
        onError: (e: any) => toast.error(e.message),
    });

    const changeStatus = useMutation({
        mutationFn: (status: string) => followupsApi.updateStatus(followup.id, { status }, fetchOpts),
        onSuccess: () => {
            toast.success("Status atualizado!");
            qc.invalidateQueries({ queryKey: ["followup", followup.id] });
            qc.invalidateQueries({ queryKey: ["followups"] });
        },
        onError: (e: any) => toast.error(e.message),
    });

    const deleteFollowup = useMutation({
        mutationFn: () => followupsApi.deleteFollowup(followup.id, fetchOpts),
        onSuccess: () => {
            toast.success("Acompanhamento removido");
            qc.invalidateQueries({ queryKey: ["followups"] });
            onBack();
        },
        onError: (e: any) => toast.error(e.message),
    });

    const addBlock = useMutation({
        mutationFn: (body: { type: string; title?: string; content?: string }) =>
            followupsApi.createBlock(followup.id, body, fetchOpts),
        onSuccess: () => {
            toast.success("Bloco adicionado!");
            qc.invalidateQueries({ queryKey: ["followup", followup.id] });
        },
        onError: (e: any) => toast.error(e.message),
    });

    // History query
    const { data: historyData } = useQuery({
        queryKey: ["followup-history", followup.id],
        queryFn: () => followupsApi.getHistory<{ data: any[] }>(followup.id, fetchOpts),
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

    const AddBlockButtons = ({ size = "sm", variant = "outline", className = "" }: {
        size?: "sm" | "default" | "lg" | "icon";
        variant?: "outline" | "ghost" | "default" | "destructive" | "secondary" | "link";
        className?: string;
    }) => (
        <>
            <Button
                size={size}
                variant={variant}
                onClick={() => addBlock.mutate({ type: "TEXT", title: "" })}
                className={`gap-1 ${className || "border-[var(--zyllen-border)] text-white hover:bg-[var(--zyllen-highlight)]/10 hover:text-[var(--zyllen-highlight)] hover:border-[var(--zyllen-highlight)]/30"}`}
            >
                <FileText size={14} /> Texto
            </Button>
            <Button
                size={size}
                variant={variant}
                onClick={() => addBlock.mutate({ type: "MEDIA", title: "" })}
                className={`gap-1 ${className || "border-[var(--zyllen-border)] text-white hover:bg-[var(--zyllen-highlight)]/10 hover:text-[var(--zyllen-highlight)] hover:border-[var(--zyllen-highlight)]/30"}`}
            >
                <Image size={14} /> Mídia
            </Button>
            <Button
                size={size}
                variant={variant}
                onClick={() => addBlock.mutate({ type: "CHECKLIST", title: "" })}
                className={`gap-1 ${className || "border-[var(--zyllen-border)] text-white hover:bg-[var(--zyllen-highlight)]/10 hover:text-[var(--zyllen-highlight)] hover:border-[var(--zyllen-highlight)]/30"}`}
            >
                <ClipboardList size={14} /> Checklist
            </Button>
            <Button
                size={size}
                variant={variant}
                onClick={() => addBlock.mutate({ type: "PDF", title: "" })}
                className={`gap-1 ${className || "border-[var(--zyllen-border)] text-white hover:bg-[var(--zyllen-highlight)]/10 hover:text-[var(--zyllen-highlight)] hover:border-[var(--zyllen-highlight)]/30"}`}
            >
                <FileArchive size={14} /> PDF
            </Button>
            <Button
                size={size}
                variant={variant}
                onClick={() => addBlock.mutate({ type: "SIGNATURE", title: "" })}
                className={`gap-1 ${className || "border-[var(--zyllen-border)] text-white hover:bg-[var(--zyllen-highlight)]/10 hover:text-[var(--zyllen-highlight)] hover:border-[var(--zyllen-highlight)]/30"}`}
            >
                <PenLine size={14} /> Assinatura
            </Button>
        </>
    );

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
                    <Button
                        variant="ghost" size="sm"
                        onClick={() => printFollowupPdf({
                            code: followup.code,
                            status: followup.status,
                            createdAt: followup.createdAt,
                            updatedAt: followup.updatedAt,
                            responsibleName: followup.responsibleName,
                            responsibleContact: followup.responsibleContact,
                            company: followup.company,
                            createdBy: followup.createdBy,
                            blocks: (followup.blocks ?? []) as any,
                            apiBaseUrl: API_URL,
                            followupId: followup.id,
                            token: typeof window !== "undefined" ? localStorage.getItem("accessToken") : null,
                        })}
                        className="text-[var(--zyllen-muted)] hover:text-white gap-1"
                    >
                        <Printer size={16} /> Exportar PDF
                    </Button>
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
                            {followup.project?.name && (
                                <div>
                                    <label className="text-xs text-[var(--zyllen-muted)] uppercase tracking-wider">Projeto</label>
                                    <p className="text-white font-medium">{followup.project.name}</p>
                                </div>
                            )}
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
                                    {detailProjects?.data && detailProjects.data.length > 0 && (
                                        <div>
                                            <label className="text-xs text-[var(--zyllen-muted)] uppercase tracking-wider">Projeto</label>
                                            <select
                                                value={editProjectId}
                                                onChange={(e) => setEditProjectId(e.target.value)}
                                                className="w-full h-9 px-3 mt-1 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30"
                                            >
                                                <option value="">Sem projeto específico</option>
                                                {detailProjects.data.map((p) => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
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
                                        <Button size="sm" onClick={() => updateFollowup.mutate({ projectId: editProjectId || null, responsibleName: respName, responsibleContact: respContact })} className="bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg-dark)] text-xs">
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
                        <div className="flex gap-2 flex-wrap justify-end">
                            <AddBlockButtons />
                        </div>
                    )}
                </div>

                {(!followup.blocks || followup.blocks.length === 0) ? (
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <Plus size={36} className="text-[var(--zyllen-muted)] mb-3" />
                            <p className="text-[var(--zyllen-muted)] text-sm">Nenhum bloco adicionado ainda</p>
                            <p className="text-xs text-[var(--zyllen-muted)] mt-1">Adicione blocos de Texto, Mídia, Checklist, PDF ou Assinatura</p>
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
                        <div className="flex gap-2 flex-wrap justify-center">
                            <AddBlockButtons
                                variant="ghost"
                                className="text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)]"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
