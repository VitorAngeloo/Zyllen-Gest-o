"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch, useAuth } from "@web/features/auth/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Input } from "@web/components/ui/input";
import { Button } from "@web/components/ui/button";
import { Label } from "@web/components/ui/label";
import { Badge } from "@web/components/ui/badge";
import { Select } from "@web/components/ui/select";
import { PageHeader } from "@web/components/ui/page-header";
import { EmptyState, ListSectionHeader, WorkspaceBar, WorkspaceGroup } from "@web/components/ui/workspace";
import { toast } from "sonner";
import Link from "next/link";
import { Users, Plus, Search, Building, Mail, ChevronRight, ArrowLeft, Power } from "lucide-react";
import { EMPTY_STATES, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";

interface Collaborator {
    id: string;
    name: string;
    email: string;
    sector: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    role: { id: string; name: string };
}

export default function ColaboradoresPage() {
    const fetchOpts = useAuthedFetch();
    const { hasPermission } = useAuth();
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const [showCreate, setShowCreate] = useState(false);

    const canManage = hasPermission("access.manage");

    const { data: usersRes, isLoading } = useQuery({
        queryKey: ["internal-users"],
        queryFn: () => apiClient.get<{ data: Collaborator[] }>("/auth/users", fetchOpts),
    });

    const { data: rolesRes } = useQuery({
        queryKey: ["roles"],
        queryFn: () => apiClient.get<{ data: any[] }>("/access/roles", fetchOpts),
    });

    const [form, setForm] = useState({
        name: "", email: "", password: "", roleId: "",
        sector: "", description: "",
    });

    const createUser = useMutation({
        mutationFn: (data: any) => apiClient.post("/auth/users", data, fetchOpts),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["internal-users"] });
            setShowCreate(false);
            setForm({ name: "", email: "", password: "", roleId: "", sector: "", description: "" });
            toast.success("Colaborador criado! O PIN será definido no primeiro acesso.", { duration: 6000 });
        },
        onError: (err: any) => toast.error(err.message || "Erro ao criar colaborador"),
    });

    const toggleActive = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            apiClient.put(`/auth/users/${id}`, { isActive }, fetchOpts),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["internal-users"] });
            toast.success("Status atualizado");
        },
        onError: (err: any) => toast.error(err.message || "Erro ao atualizar status"),
    });

    const users = usersRes?.data ?? [];
    const roles = rolesRes?.data ?? [];

    const filtered = users.filter((u) => {
        const q = search.toLowerCase();
        return (
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.sector ?? "").toLowerCase().includes(q)
        );
    });

    const inputCls = "bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50 focus-visible:ring-[var(--zyllen-highlight)]/30 focus-visible:border-[var(--zyllen-highlight)]";

    return (
        <div className="space-y-6">
            <Link href="/dashboard"
                className="flex items-center gap-1 text-sm text-[var(--zyllen-muted)] hover:text-white transition-colors">
                <ArrowLeft size={16} /> Voltar ao Dashboard
            </Link>

            {/* Header */}
            <PageHeader
                eyebrow="Gestão"
                title="Colaboradores"
                description={PAGE_DESCRIPTIONS.colaboradores}
                actions={canManage && (
                    <Button variant="highlight" onClick={() => setShowCreate(!showCreate)}>
                        <Plus size={16} className="mr-2" /> Novo Colaborador
                    </Button>
                )}
            />

            {/* Create form */}
            {showCreate && canManage && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-highlight)]/30">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">Cadastrar Novo Colaborador</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const payload: any = { ...form };
                                if (!payload.sector) delete payload.sector;
                                if (!payload.description) delete payload.description;
                                createUser.mutate(payload);
                            }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Nome *</Label>
                                <Input className={inputCls} placeholder="Nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Email *</Label>
                                <Input className={inputCls} type="email" placeholder="email@empresa.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Senha *</Label>
                                <Input className={inputCls} type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Perfil de acesso *</Label>
                                <Select
                                    value={form.roleId}
                                    onValueChange={(value) => setForm({ ...form, roleId: value })}
                                    aria-label="Perfil de acesso"
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {roles.map((r: any) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Setor</Label>
                                <Input className={inputCls} placeholder="Ex: TI, RH, Financeiro" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-[var(--zyllen-muted)]">Descrição</Label>
                                <textarea
                                    className={`w-full rounded-md p-3 text-sm min-h-[80px] bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30 focus:border-[var(--zyllen-highlight)]`}
                                    placeholder="Descrição sobre o colaborador, cargo, responsabilidades..."
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2 flex gap-3">
                                <Button type="submit" variant="highlight" disabled={createUser.isPending || !form.name || !form.email || !form.password || !form.roleId}>
                                    {createUser.isPending ? "Criando..." : "Cadastrar Colaborador"}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <WorkspaceBar>
                <WorkspaceGroup label="Filtrar colaboradores" className="w-full max-w-lg">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                        <Input
                            className={`${inputCls} pl-9`}
                            aria-label="Buscar colaboradores"
                            placeholder="Buscar por nome, email ou setor..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </WorkspaceGroup>
            </WorkspaceBar>

            <ListSectionHeader
                title="Equipe interna"
                count={filtered.length}
                description={search ? `Resultado para “${search}”.` : "Pessoas com acesso interno ao sistema e seus respectivos perfis."}
            />

            {/* User list */}
            {isLoading ? (
                <div role="status" className="border-y border-white/10 py-10 text-sm text-[var(--zyllen-muted)]">Carregando colaboradores...</div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={<Users size={22} />} title={search ? EMPTY_STATES.collaborators : EMPTY_STATES.noCollaborators} description={search ? "Revise o termo ou limpe a busca para consultar toda a equipe." : "Use “Novo colaborador” para cadastrar a primeira pessoa da equipe."} />
            ) : (
                <div className="divide-y divide-white/10 border-y border-white/10">
                    {filtered.map((user) => (
                        <article key={user.id} className="group flex flex-wrap items-center gap-3 py-4 transition-colors hover:bg-white/[0.02] sm:px-3">
                                    <Link href={`/dashboard/colaboradores/${user.id}`} className="flex size-9 shrink-0 items-center justify-center border border-white/10 bg-white/[0.035] text-sm font-semibold text-[var(--zyllen-highlight)]">
                                        {user.name.charAt(0).toUpperCase()}
                                    </Link>
                                    <Link href={`/dashboard/colaboradores/${user.id}`} className="flex-1 min-w-0 cursor-pointer">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-white truncate group-hover:text-[var(--zyllen-highlight)] transition-colors">
                                                {user.name}
                                            </p>
                                            <ChevronRight size={14} className="text-[var(--zyllen-muted)] group-hover:text-[var(--zyllen-highlight)] transition-colors shrink-0" />
                                        </div>
                                        <p className="text-xs text-[var(--zyllen-muted)] truncate flex items-center gap-1">
                                            <Mail size={10} /> {user.email}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <Badge variant={user.isActive ? "outline" : "destructive"} className="text-[10px]">
                                                {user.isActive ? user.role.name : "Inativo"}
                                            </Badge>
                                            {user.sector && (
                                                <Badge variant="outline" className="text-[10px] text-[var(--zyllen-muted)] border-[var(--zyllen-border)]">
                                                    <Building size={8} className="mr-1" /> {user.sector}
                                                </Badge>
                                            )}
                                        </div>
                                    </Link>
                                    <span className="hidden text-xs text-[var(--zyllen-muted)] lg:block">Desde {new Date(user.createdAt).toLocaleDateString("pt-BR")}</span>
                                    {canManage && (
                                        <button
                                            title={user.isActive ? "Desativar" : "Ativar"}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (confirm(`${user.isActive ? "Desativar" : "Ativar"} ${user.name}?`)) {
                                                    toggleActive.mutate({ id: user.id, isActive: !user.isActive });
                                                }
                                            }}
                                            className={`shrink-0 p-1.5 rounded-md transition-colors ${
                                                user.isActive
                                                    ? "text-green-400 hover:bg-green-400/10"
                                                    : "text-red-400 hover:bg-red-400/10"
                                            }`}
                                        >
                                            <Power size={16} />
                                        </button>
                                    )}
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}
