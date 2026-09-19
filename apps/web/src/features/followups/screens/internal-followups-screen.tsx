"use client";
import { followupsApi } from "@web/features/followups/api/followups-api";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth, useAuthedFetch } from "@web/features/auth/context/auth-context";
import { Card, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Badge } from "@web/components/ui/badge";
import { PageHeader } from "@web/components/ui/page-header";
import { ClipboardList, Plus, Search, ChevronDown } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import type { Tab } from "../types/followup.types";
import type { Followup } from "../types/followup.types";
import { STATUS_CONFIG } from "../followup.constants";
import { NewFollowupForm } from "../components/new-followup-form";
import { FollowupDetail } from "../components/followup-detail";

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
            followupsApi.listFollowups<{ data: Followup[]; total: number }>(statusFilter ? `&status=${statusFilter}` : "", searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : "", fetchOpts),
    });

    // ── Detail query ──
    const { data: detailData, isLoading: loadingDetail } = useQuery({
        queryKey: ["followup", selected?.id],
        queryFn: () => followupsApi.getFollowup<{ data: Followup }>(selected!.id, fetchOpts),
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
                <PageHeader
                    eyebrow="Atendimento"
                    title="Acompanhamento"
                    description="Registre e acompanhe a evolução dos projetos dos clientes"
                    actions={<Button variant="highlight" onClick={() => setTab("new")}>
                        <Plus size={18} /> Novo Acompanhamento
                    </Button>}
                />

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
                                                    {f.project?.name && (
                                                        <Badge variant="outline" className="text-blue-400 border-blue-400/30">{f.project.name}</Badge>
                                                    )}
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
