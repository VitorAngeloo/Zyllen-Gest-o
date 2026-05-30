"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import { ClipboardList, ArrowLeft, RefreshCw, FileText, Image as ImageIcon, CheckSquare, Upload, Video } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const STATUS_CONFIG: Record<string, { label: string; variant: "warning" | "default" | "success" }> = {
    IN_PROGRESS: { label: "Em Andamento", variant: "default" },
    PENDING: { label: "Pendente", variant: "warning" },
    COMPLETED: { label: "Concluído", variant: "success" },
};

function formatDate(v: string | null | undefined) {
    if (!v) return "—";
    return new Date(v).toLocaleDateString("pt-BR");
}

function isImg(mime?: string | null, name?: string) {
    return mime?.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp)$/i.test(name ?? "");
}
function isVid(mime?: string | null, name?: string) {
    return mime?.startsWith("video/") || /\.(mp4|webm|mov|avi)$/i.test(name ?? "");
}

export default function ClientFollowupsPage() {
    const fetchOpts = useAuthedFetch();
    const [selectedFollowup, setSelectedFollowup] = useState<any>(null);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["client-followups"],
        queryFn: () => apiClient.get<{ data: any[]; total: number }>("/client/followups", fetchOpts),
    });

    const list: any[] = data?.data ?? [];

    if (selectedFollowup) {
        const status = STATUS_CONFIG[selectedFollowup.status] ?? { label: selectedFollowup.status, variant: "default" as const };

        return (
            <div className="space-y-6">
                <button
                    onClick={() => setSelectedFollowup(null)}
                    className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar
                </button>

                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-white">{selectedFollowup.code}</h1>
                        <p className="text-sm text-[var(--zyllen-muted)] mt-0.5">{selectedFollowup.company?.name}</p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                </div>

                {/* Info */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardContent className="pt-4 space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-[var(--zyllen-muted)] text-xs">Criado em</p>
                                <p className="text-white">{formatDate(selectedFollowup.createdAt)}</p>
                            </div>
                            {selectedFollowup.responsibleName && (
                                <div>
                                    <p className="text-[var(--zyllen-muted)] text-xs">Responsável</p>
                                    <p className="text-white">{selectedFollowup.responsibleName}</p>
                                </div>
                            )}
                            {selectedFollowup.responsibleContact && (
                                <div>
                                    <p className="text-[var(--zyllen-muted)] text-xs">Contato</p>
                                    <p className="text-white">{selectedFollowup.responsibleContact}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Blocks */}
                {selectedFollowup.blocks?.length > 0 && (
                    <div className="space-y-3">
                        {selectedFollowup.blocks.map((block: any, idx: number) => (
                            <Card key={block.id} className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                                <CardHeader className="p-3 pb-0">
                                    <div className="flex items-center gap-2">
                                        {block.type === "TEXT" && <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-blue-500/15 text-blue-400"><FileText size={12} /> Texto</div>}
                                        {block.type === "MEDIA" && <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-purple-500/15 text-purple-400"><ImageIcon size={12} /> Mídia</div>}
                                        {block.type === "CHECKLIST" && <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-green-500/15 text-green-400"><CheckSquare size={12} /> Checklist</div>}
                                        {block.title && <span className="text-xs text-[var(--zyllen-muted)]">{block.title}</span>}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-3 pt-2">
                                    {/* TEXT */}
                                    {block.type === "TEXT" && (
                                        <p className={`text-sm whitespace-pre-wrap ${block.content ? "text-white" : "text-[var(--zyllen-muted)] italic"}`}>
                                            {block.content || "Sem conteúdo"}
                                        </p>
                                    )}

                                    {/* MEDIA */}
                                    {block.type === "MEDIA" && (
                                        <div className="space-y-2">
                                            {block.attachments?.length > 0 ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {block.attachments.map((att: any) => {
                                                        const fileUrl = `${API_URL}/followups/${selectedFollowup.id}/blocks/${block.id}/attachments/${att.id}/file`;
                                                        return (
                                                            <div key={att.id} className="rounded-lg overflow-hidden border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)]">
                                                                {isImg(att.mimeType, att.fileName) ? (
                                                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                                                        <img src={fileUrl} alt={att.fileName} className="w-full h-28 object-cover hover:opacity-80 transition-opacity cursor-pointer" />
                                                                    </a>
                                                                ) : isVid(att.mimeType, att.fileName) ? (
                                                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-28 bg-black/40 hover:bg-black/60 cursor-pointer">
                                                                        <Video size={28} className="text-[var(--zyllen-highlight)]" />
                                                                    </a>
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-28"><Upload size={28} className="text-[var(--zyllen-muted)]" /></div>
                                                                )}
                                                                <div className="px-2 py-1"><p className="text-[10px] text-[var(--zyllen-muted)] truncate">{att.fileName}</p></div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-[var(--zyllen-muted)] italic">Nenhuma mídia</p>
                                            )}
                                        </div>
                                    )}

                                    {/* CHECKLIST */}
                                    {block.type === "CHECKLIST" && (
                                        <div className="space-y-1">
                                            {block.checklistItems?.length > 0 ? (
                                                block.checklistItems.map((item: any) => (
                                                    <div key={item.id} className="flex items-center gap-2">
                                                        <div className={`size-4 rounded shrink-0 flex items-center justify-center border ${item.checked ? "bg-[var(--zyllen-success)] border-[var(--zyllen-success)]" : "border-[var(--zyllen-border)]"}`}>
                                                            {item.checked && <span className="text-white text-[10px]">✓</span>}
                                                        </div>
                                                        <span className={`text-sm ${item.checked ? "text-[var(--zyllen-muted)] line-through" : "text-white"}`}>
                                                            {item.text}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-[var(--zyllen-muted)] italic">Sem itens</p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
                {(!selectedFollowup.blocks || selectedFollowup.blocks.length === 0) && (
                    <p className="text-xs text-[var(--zyllen-muted)] italic text-center py-4">Nenhum conteúdo registrado neste acompanhamento</p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ClipboardList size={22} className="text-[var(--zyllen-highlight)]" />
                        Acompanhamentos
                    </h1>
                    <p className="text-[var(--zyllen-muted)] text-sm mt-1">
                        Acompanhamentos vinculados à sua empresa
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="text-xs text-[var(--zyllen-muted)] hover:text-white transition-colors flex items-center gap-1"
                >
                    <RefreshCw size={12} /> Atualizar
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 bg-[var(--zyllen-bg)]" />)}
                </div>
            ) : list.length === 0 ? (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardContent className="py-12 text-center">
                        <ClipboardList size={32} className="mx-auto text-[var(--zyllen-muted)]/40 mb-3" />
                        <p className="text-[var(--zyllen-muted)] text-sm">Nenhum acompanhamento encontrado</p>
                        <p className="text-[var(--zyllen-muted)]/60 text-xs mt-1">
                            Os acompanhamentos da sua empresa aparecerão aqui
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {list.map((followup) => {
                        const status = STATUS_CONFIG[followup.status] ?? { label: followup.status, variant: "default" as const };
                        return (
                            <Card
                                key={followup.id}
                                className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/30 transition-all cursor-pointer"
                                onClick={() => setSelectedFollowup(followup)}
                            >
                                <CardContent className="py-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className="flex items-center justify-center size-10 rounded-lg shrink-0"
                                            style={{ backgroundColor: "color-mix(in srgb, var(--zyllen-highlight) 15%, transparent)" }}
                                        >
                                            <ClipboardList size={18} className="text-[var(--zyllen-highlight)]" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-white truncate">{followup.code}</p>
                                            <p className="text-xs text-[var(--zyllen-muted)] mt-0.5">
                                                {followup._count?.blocks ?? 0} bloco(s) · {formatDate(followup.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={status.variant} className="shrink-0">{status.label}</Badge>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
