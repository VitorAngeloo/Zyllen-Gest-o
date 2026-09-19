"use client";
import { followupsApi } from "@web/features/followups/api/followups-api";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Search, X, Building2, User } from "lucide-react";
import type { Company } from "../types/followup.types";
import type { Followup } from "../types/followup.types";

export function NewFollowupForm({ onBack, fetchOpts, qc, onCreated }: {
    onBack: () => void;
    fetchOpts: any;
    qc: any;
    onCreated: (f: Followup) => void;
}) {
    const [companySearch, setCompanySearch] = useState("");
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [responsibleName, setResponsibleName] = useState("");
    const [responsibleContact, setResponsibleContact] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Companies search
    const { data: companies } = useQuery({
        queryKey: ["companies-search", companySearch],
        queryFn: () => followupsApi.searchCompanies<{ data: Company[] }>(encodeURIComponent(companySearch), fetchOpts),
        enabled: companySearch.length >= 1 && !selectedCompany,
    });

    // Projects of the selected company
    const { data: projects } = useQuery({
        queryKey: ["company-projects", selectedCompany?.id],
        queryFn: () => followupsApi.listProjects<{ data: { id: string; name: string }[] }>(selectedCompany?.id, fetchOpts),
        enabled: !!selectedCompany?.id,
    });

    const handleSubmit = async () => {
        if (!selectedCompany) { toast.error("Selecione uma empresa"); return; }
        setSubmitting(true);
        try {
            const res = await followupsApi.createFollowup<{ data: Followup }>({
                companyId: selectedCompany.id,
                projectId: selectedProjectId || undefined,
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
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedCompany(null); setSelectedProjectId(""); setCompanySearch(""); }}>
                                    <X size={16} className="text-[var(--zyllen-muted)]" />
                                </Button>
                            </div>

                            {/* Projeto — opcional, só quando a empresa tem projetos */}
                            {projects?.data && projects.data.length > 0 && (
                                <div>
                                    <label className="text-sm text-[var(--zyllen-muted)] mb-1 block">Projeto (opcional)</label>
                                    <select
                                        value={selectedProjectId}
                                        onChange={(e) => setSelectedProjectId(e.target.value)}
                                        className="w-full h-10 px-3 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30"
                                    >
                                        <option value="">Sem projeto específico</option>
                                        {projects.data.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
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
                                            onClick={() => { setSelectedCompany(c); setSelectedProjectId(""); setCompanySearch(""); }}
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
