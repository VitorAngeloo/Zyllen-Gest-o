"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuth, useAuthedFetch } from "@web/features/auth/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { Badge } from "@web/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@web/components/ui/dialog";
import { Select, SelectOption } from "@web/components/ui/select";
import { StateCitySelector } from "@web/components/ui/state-city-selector";
import { toast } from "sonner";
import {
    Building2, Users, Plus, Pencil, Trash2, UserPlus, FolderKanban,
    ChevronDown, ChevronRight, Phone, Mail, MapPin, Briefcase, Eye,
} from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { PageHeader } from "@web/components/ui/page-header";
import { EmptyState, ListSectionHeader } from "@web/components/ui/workspace";
import { EMPTY_STATES, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";

type Tab = "companies" | "users";

// ─── Empty form defaults ──────────────────
const EMPTY_COMPANY = { name: "", cnpj: "" };
const EMPTY_USER = {
    name: "", email: "", cpf: "", phone: "", position: "",
    city: "", state: "", companyId: "", projectId: "",
    password: "", confirmPassword: "",
};

export default function ClientesPage() {
    const { user, userType } = useAuth();
    const canAuthorizeClient = userType === 'internal' && ['Administrador', 'Gestor'].includes((user as any)?.role?.name);
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("companies");

    // ─── Company state ──────────────────
    const [newCompany, setNewCompany] = useState({ ...EMPTY_COMPANY });
    const [editCompany, setEditCompany] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
    const [viewCompany, setViewCompany] = useState<any>(null);

    // ─── Project state ──────────────────
    const EMPTY_PROJECT = { name: "", description: "", phone: "", address: "", city: "", state: "" };
    const [newProject, setNewProject] = useState({ ...EMPTY_PROJECT });
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

    // ─── User state ─────────────────────
    const [newUser, setNewUser] = useState({ ...EMPTY_USER });
    const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set());

    // ═══════════════════════════════════════
    // QUERIES
    // ═══════════════════════════════════════

    const { data: companies, isLoading: loadingCompanies } = useQuery({
        queryKey: ["companies"],
        queryFn: () => apiClient.get<{ data: any[] }>("/clients/companies", fetchOpts),
    });

    const { data: externalUsers, isLoading: loadingUsers } = useQuery({
        queryKey: ["external-users"],
        queryFn: () => apiClient.get<{ data: any[] }>("/clients/users", fetchOpts),
        enabled: tab === "users",
    });

    // Projects for the selected company (user form)
    const { data: companyProjects } = useQuery({
        queryKey: ["company-projects", newUser.companyId],
        queryFn: () => apiClient.get<{ data: any[] }>(`/clients/companies/${newUser.companyId}/projects`, fetchOpts),
        enabled: !!newUser.companyId,
    });

    // Projects for company detail view
    const { data: viewCompanyProjects } = useQuery({
        queryKey: ["company-projects", viewCompany?.id],
        queryFn: () => apiClient.get<{ data: any[] }>(`/clients/companies/${viewCompany?.id}/projects`, fetchOpts),
        enabled: !!viewCompany?.id,
    });

    // ═══════════════════════════════════════
    // MUTATIONS: COMPANIES
    // ═══════════════════════════════════════

    const createCompany = useMutation({
        mutationFn: (data: any) => apiClient.post("/clients/companies", data, fetchOpts),
        onSuccess: () => {
            toast.success("Empresa criada!");
            qc.invalidateQueries({ queryKey: ["companies"] });
            setNewCompany({ ...EMPTY_COMPANY });
        },
        onError: (e: any) => toast.error(e.message),
    });

    const updateCompany = useMutation({
        mutationFn: (data: any) => apiClient.put(`/clients/companies/${data.id}`, {
            name: data.name, cnpj: data.cnpj,
        }, fetchOpts),
        onSuccess: () => {
            toast.success("Empresa atualizada!");
            qc.invalidateQueries({ queryKey: ["companies"] });
            setEditCompany(null);
        },
        onError: (e: any) => toast.error(e.message),
    });

    const deleteCompany = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/clients/companies/${id}`, fetchOpts),
        onSuccess: () => {
            toast.success("Empresa excluída!");
            qc.invalidateQueries({ queryKey: ["companies"] });
            setDeleteConfirm(null);
        },
        onError: (e: any) => toast.error(e.message),
    });

    // ═══════════════════════════════════════
    // MUTATIONS: PROJECTS
    // ═══════════════════════════════════════

    const createProject = useMutation({
        mutationFn: (data: { companyId: string; name: string; description?: string; phone?: string; address?: string; city?: string; state?: string }) =>
            apiClient.post(`/clients/companies/${data.companyId}/projects`, {
                name: data.name, description: data.description,
                phone: data.phone, address: data.address,
                city: data.city, state: data.state,
            }, fetchOpts),
        onSuccess: () => {
            toast.success("Projeto criado!");
            qc.invalidateQueries({ queryKey: ["company-projects", viewCompany?.id] });
            qc.invalidateQueries({ queryKey: ["companies"] });
            setNewProject({ ...EMPTY_PROJECT });
        },
        onError: (e: any) => toast.error(e.message),
    });

    const updateProject = useMutation({
        mutationFn: (data: { id: string; name: string; description?: string; phone?: string; address?: string; city?: string; state?: string }) =>
            apiClient.put(`/clients/projects/${data.id}`, {
                name: data.name, description: data.description,
                phone: data.phone, address: data.address,
                city: data.city, state: data.state,
            }, fetchOpts),
        onSuccess: () => {
            toast.success("Projeto atualizado!");
            qc.invalidateQueries({ queryKey: ["company-projects", viewCompany?.id] });
            qc.invalidateQueries({ queryKey: ["companies"] });
            setNewProject({ ...EMPTY_PROJECT });
            setEditingProjectId(null);
        },
        onError: (e: any) => toast.error(e.message),
    });

    const startEditProject = (p: any) => {
        setEditingProjectId(p.id);
        setNewProject({
            name: p.name ?? "", description: p.description ?? "", phone: p.phone ?? "",
            address: p.address ?? "", city: p.city ?? "", state: p.state ?? "",
        });
    };

    const cancelEditProject = () => {
        setEditingProjectId(null);
        setNewProject({ ...EMPTY_PROJECT });
    };

    const closeViewCompany = () => {
        setViewCompany(null);
        cancelEditProject();
    };

    const deleteProject = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/clients/projects/${id}`, fetchOpts),
        onSuccess: () => {
            toast.success("Projeto excluído!");
            qc.invalidateQueries({ queryKey: ["company-projects", viewCompany?.id] });
            qc.invalidateQueries({ queryKey: ["companies"] });
        },
        onError: (e: any) => toast.error(e.message),
    });

    // ═══════════════════════════════════════
    // MUTATIONS: USERS
    // ═══════════════════════════════════════

    const createUser = useMutation({
        mutationFn: (data: any) => apiClient.post("/clients/users", data, fetchOpts),
        onSuccess: () => {
            toast.success("Usuário externo criado!");
            qc.invalidateQueries({ queryKey: ["external-users"] });
            setNewUser({ ...EMPTY_USER });
        },
        onError: (e: any) => toast.error(e.message),
    });

    // ═══════════════════════════════════════
    // GROUPED USERS BY COMPANY
    // ═══════════════════════════════════════

    const groupedUsers = useMemo(() => {
        if (!externalUsers?.data) return [];
        const groups: Record<string, { company: any; users: any[] }> = {};
        for (const u of externalUsers.data) {
            const companyId = u.companyId || "sem-empresa";
            const companyName = u.company?.name || "Sem Empresa";
            if (!groups[companyId]) {
                groups[companyId] = { company: { id: companyId, name: companyName }, users: [] };
            }
            groups[companyId].users.push(u);
        }
        return Object.values(groups).sort((a, b) => a.company.name.localeCompare(b.company.name, "pt-BR"));
    }, [externalUsers?.data]);

    const toggleCollapse = (companyId: string) => {
        setCollapsedCompanies((prev) => {
            const next = new Set(prev);
            if (next.has(companyId)) next.delete(companyId);
            else next.add(companyId);
            return next;
        });
    };

    // ═══════════════════════════════════════
    // TABS CONFIG
    // ═══════════════════════════════════════

    const tabs = [
        { key: "companies", label: "Empresas", icon: Building2 },
        { key: "users", label: "Usuários Externos", icon: Users },
    ];

    return (
        <div className="space-y-6">
            <PageHeader eyebrow="Gestão" title="Clientes" description={PAGE_DESCRIPTIONS.clientes} />

            {/* ─── Tab Switcher ─── */}
            <div role="tablist" aria-label="Áreas de clientes" className="flex max-w-full gap-1 overflow-x-auto border-b border-white/10">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key as Tab)}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.key}
                        className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${tab === t.key
                            ? "border-[var(--zyllen-highlight)] text-white"
                            : "border-transparent text-[var(--zyllen-muted)] hover:border-white/20 hover:text-white"
                            }`}
                    >
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {/* ═══════════════════════════════════ */}
            {/* ═══ ABA: EMPRESAS ════════════════ */}
            {/* ═══════════════════════════════════ */}
            {tab === "companies" && (
                <div className="space-y-4">
                    {/* ─── Formulário Nova Empresa ─── */}
                    <Card className="border-white/10 bg-white/[0.02]">
                        <CardHeader><CardTitle className="text-white">Nova Empresa</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={(e) => { e.preventDefault(); createCompany.mutate(newCompany); }} className="space-y-3">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Razão Social *</Label>
                                        <Input
                                            value={newCompany.name}
                                            onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                                            placeholder="Razão social da empresa..."
                                            required
                                            className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">CNPJ</Label>
                                        <Input
                                            value={newCompany.cnpj}
                                            onChange={(e) => setNewCompany({ ...newCompany, cnpj: e.target.value })}
                                            placeholder="00.000.000/0000-00"
                                            className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                        />
                                    </div>
                                </div>

                                <Button type="submit" variant="highlight" className="w-full" disabled={createCompany.isPending}>
                                    <Plus size={16} /> {createCompany.isPending ? "Criando..." : "Criar Empresa"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* ─── Lista de Empresas ─── */}
                    <ListSectionHeader
                        title="Empresas cadastradas"
                        count={companies?.data?.length ?? 0}
                        description="Abra uma empresa para consultar e organizar seus projetos."
                    />
                        <div>
                            {loadingCompanies ? (
                                <div className="divide-y divide-white/10 border-y border-white/10">
                                    {[...Array(3)].map((_, i) => (
                                        <Skeleton key={i} className="my-3 h-16 w-full" />
                                    ))}
                                </div>
                            ) : companies?.data?.length ? (
                                <div className="divide-y divide-white/10 border-y border-white/10">
                                    {companies.data.map((c: any) => (
                                        <div key={c.id} className="group flex flex-wrap items-center gap-3 py-4 transition-colors hover:bg-white/[0.02] sm:px-3">
                                            <Building2 size={18} className="shrink-0 text-[var(--zyllen-highlight)]" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium">{c.name}</p>
                                                <p className="text-xs text-[var(--zyllen-muted)] font-mono">
                                                    {c.cnpj || "Sem CNPJ"}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[var(--zyllen-highlight)] border-[var(--zyllen-highlight)]/30">
                                                    {c._count?.externalUsers ?? 0} usuários
                                                </Badge>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setViewCompany(c)}
                                                    className="p-2 text-[var(--zyllen-muted)] transition-colors hover:text-white"
                                                    title="Ver detalhes e projetos"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setEditCompany({
                                                        id: c.id, name: c.name, cnpj: c.cnpj || "",
                                                    })}
                                                    className="p-2 text-[var(--zyllen-muted)] transition-colors hover:text-[var(--zyllen-highlight)]"
                                                    title="Editar empresa"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(c)}
                                                    className="p-2 text-[var(--zyllen-muted)] transition-colors hover:text-red-400"
                                                    title="Excluir empresa"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState icon={<Building2 size={22} />} title={EMPTY_STATES.companies} description="Cadastre uma empresa para então organizar projetos e usuários externos." />
                            )}
                        </div>
                </div>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* ═══ ABA: USUÁRIOS EXTERNOS ════════════ */}
            {/* ═══════════════════════════════════════ */}
            {tab === "users" && (
                <div className="space-y-4">
                    {/* ─── Formulário Novo Usuário ─── */}
                    {canAuthorizeClient && <Card className="border-white/10 bg-white/[0.02]">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <UserPlus size={18} /> Novo Usuário Externo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (newUser.password !== newUser.confirmPassword) {
                                        toast.error("As senhas não coincidem");
                                        return;
                                    }
                                    const payload: any = { ...newUser };
                                    // Remove empty optional fields
                                    if (!payload.cpf) delete payload.cpf;
                                    if (!payload.phone) delete payload.phone;
                                    if (!payload.position) delete payload.position;
                                    if (!payload.city) delete payload.city;
                                    if (!payload.state) delete payload.state;
                                    if (!payload.projectId) delete payload.projectId;
                                    createUser.mutate(payload);
                                }}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* Nome */}
                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="text-[var(--zyllen-muted)]">Nome Completo</Label>
                                        <Input
                                            value={newUser.name}
                                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                            placeholder="Nome completo"
                                            required
                                            className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Email</Label>
                                        <Input
                                            type="email"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                            placeholder="email@empresa.com"
                                            required
                                            className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                        />
                                    </div>

                                    {/* CPF */}
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">CPF</Label>
                                        <Input
                                            value={newUser.cpf}
                                            onChange={(e) => setNewUser({ ...newUser, cpf: e.target.value })}
                                            placeholder="000.000.000-00"
                                            className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                        />
                                    </div>

                                    {/* Telefone */}
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Telefone</Label>
                                        <Input
                                            value={newUser.phone}
                                            onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                                            placeholder="(00) 00000-0000"
                                            className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                        />
                                    </div>

                                    {/* Cargo */}
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Cargo / Função</Label>
                                        <Input
                                            value={newUser.position}
                                            onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                                            placeholder="Ex.: Coordenador, Analista..."
                                            className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                        />
                                    </div>
                                </div>

                                {/* Estado / Cidade */}
                                <StateCitySelector
                                    state={newUser.state}
                                    city={newUser.city}
                                    onStateChange={(uf) => setNewUser(prev => ({ ...prev, state: uf, city: "" }))}
                                    onCityChange={(city) => setNewUser(prev => ({ ...prev, city }))}
                                />

                                {/* Empresa + Projeto */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Empresa</Label>
                                        <Select
                                            value={newUser.companyId}
                                            onValueChange={(v) => setNewUser({ ...newUser, companyId: v, projectId: "" })}
                                            placeholder="Selecione a empresa..."
                                            className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                            required
                                        >
                                            {companies?.data?.map((c: any) => (
                                                <SelectOption key={c.id} value={c.id}>{c.name}</SelectOption>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Projeto</Label>
                                        <Select
                                            value={newUser.projectId}
                                            onValueChange={(v) => setNewUser({ ...newUser, projectId: v })}
                                            placeholder={newUser.companyId ? "Selecione o projeto..." : "Selecione a empresa primeiro"}
                                            className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                            disabled={!newUser.companyId}
                                        >
                                            {companyProjects?.data?.map((p: any) => (
                                                <SelectOption key={p.id} value={p.id}>{p.name}</SelectOption>
                                            ))}
                                        </Select>
                                    </div>
                                </div>

                                {/* Senha */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Senha</Label>
                                        <Input
                                            type="password"
                                            value={newUser.password}
                                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                            placeholder="Mínimo 6 caracteres"
                                            required
                                            minLength={6}
                                            className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Confirmar Senha</Label>
                                        <Input
                                            type="password"
                                            value={newUser.confirmPassword}
                                            onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                                            placeholder="Repita a senha"
                                            required
                                            minLength={6}
                                            className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                        />
                                    </div>
                                </div>

                                <Button type="submit" variant="highlight" className="w-full" disabled={createUser.isPending}>
                                    <UserPlus size={16} /> {createUser.isPending ? "Criando..." : "Criar Usuário"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>}

                    {/* ─── Lista de Usuários Agrupados por Empresa ─── */}
                    <ListSectionHeader
                        title="Usuários externos"
                        count={externalUsers?.data?.length ?? 0}
                        description="Pessoas autorizadas, agrupadas pela empresa à qual têm acesso."
                    />
                        <div>
                            {loadingUsers ? (
                                <div className="divide-y divide-white/10 border-y border-white/10">
                                    {[...Array(3)].map((_, i) => (
                                        <Skeleton key={i} className="my-3 h-14 w-full" />
                                    ))}
                                </div>
                            ) : groupedUsers.length > 0 ? (
                                <div className="divide-y divide-white/10 border-y border-white/10">
                                    {groupedUsers.map((group) => {
                                        const isCollapsed = collapsedCompanies.has(group.company.id);
                                        return (
                                            <section key={group.company.id}>
                                                {/* Group Header */}
                                                <button
                                                    onClick={() => toggleCollapse(group.company.id)}
                                                    className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-white/[0.025] sm:px-3"
                                                >
                                                    {isCollapsed
                                                        ? <ChevronRight size={16} className="text-[var(--zyllen-muted)]" />
                                                        : <ChevronDown size={16} className="text-[var(--zyllen-highlight)]" />
                                                    }
                                                    <Building2 size={16} className="text-[var(--zyllen-highlight)]" />
                                                    <span className="text-white font-medium flex-1">{group.company.name}</span>
                                                    <Badge variant="outline" className="text-[var(--zyllen-highlight)] border-[var(--zyllen-highlight)]/30">
                                                        {group.users.length} {group.users.length === 1 ? "usuário" : "usuários"}
                                                    </Badge>
                                                </button>

                                                {/* Users List */}
                                                {!isCollapsed && (
                                                    <div className="divide-y divide-white/[0.07] border-t border-white/[0.07]">
                                                        {group.users.map((u: any) => (
                                                            <div key={u.id} className="flex flex-wrap items-center gap-3 py-3 transition-colors hover:bg-white/[0.02] sm:px-8">
                                                                <div className="flex size-8 shrink-0 items-center justify-center border border-white/10 bg-white/[0.035] text-xs font-semibold text-white">
                                                                    {u.name?.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-white text-sm font-medium truncate">{u.name}</p>
                                                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--zyllen-muted)]">
                                                                        <span className="flex items-center gap-1"><Mail size={10} />{u.email}</span>
                                                                        {u.phone && <span className="flex items-center gap-1"><Phone size={10} />{u.phone}</span>}
                                                                        {u.position && <span className="flex items-center gap-1"><Briefcase size={10} />{u.position}</span>}
                                                                        {(u.city || u.state) && (
                                                                            <span className="flex items-center gap-1">
                                                                                <MapPin size={10} />
                                                                                {u.city}{u.city && u.state ? " - " : ""}{u.state}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {u.project && (
                                                                    <Badge variant="outline" className="text-xs text-blue-400 border-blue-400/30 shrink-0">
                                                                        <FolderKanban size={10} className="mr-1" />{u.project.name}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </section>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState icon={<Users size={22} />} title={EMPTY_STATES.externalUsers} description="Usuários aprovados ou criados diretamente aparecerão agrupados por empresa." />
                            )}
                        </div>
                </div>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* ═══ DIALOG: VER EMPRESA + PROJETOS ═══ */}
            {/* ═══════════════════════════════════════ */}
            <Dialog open={!!viewCompany} onOpenChange={(o) => !o && closeViewCompany()}>
                <DialogContent onClose={closeViewCompany} className="border-[var(--zyllen-border)] max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 size={18} className="text-[var(--zyllen-highlight)]" />
                            {viewCompany?.name}
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <div className="space-y-4">
                            {/* Company Info */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="col-span-2">
                                    <span className="text-[var(--zyllen-muted)]">CNPJ:</span>
                                    <span className="text-white ml-2">{viewCompany?.cnpj || "—"}</span>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-[var(--zyllen-border)]" />

                            {/* Projects Section */}
                            <div className="space-y-3">
                                <h3 className="text-white font-medium flex items-center gap-2">
                                    <FolderKanban size={16} className="text-[var(--zyllen-highlight)]" />
                                    Projetos
                                </h3>

                                {/* Add / edit project form */}
                                <div className="space-y-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                    {editingProjectId && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-[var(--zyllen-highlight)] flex items-center gap-1">
                                                <Pencil size={12} /> Editando projeto
                                            </span>
                                            <button
                                                onClick={cancelEditProject}
                                                className="text-xs text-[var(--zyllen-muted)] hover:text-white"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-[var(--zyllen-muted)]">Nome / Estande *</Label>
                                            <Input
                                                value={newProject.name}
                                                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                                placeholder="Nome do projeto ou estande..."
                                                className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] text-white"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-[var(--zyllen-muted)]">Telefone</Label>
                                            <Input
                                                value={newProject.phone}
                                                onChange={(e) => setNewProject({ ...newProject, phone: e.target.value })}
                                                placeholder="(00) 0000-0000"
                                                className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-[var(--zyllen-muted)]">Descrição</Label>
                                        <Input
                                            value={newProject.description}
                                            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                            placeholder="Descrição (opcional)"
                                            className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] text-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-[var(--zyllen-muted)]">Endereço</Label>
                                        <Input
                                            value={newProject.address}
                                            onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
                                            placeholder="Rua, número, bairro..."
                                            className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] text-white"
                                        />
                                    </div>
                                    <StateCitySelector
                                        state={newProject.state}
                                        city={newProject.city}
                                        onStateChange={(uf) => setNewProject(prev => ({ ...prev, state: uf, city: "" }))}
                                        onCityChange={(city) => setNewProject(prev => ({ ...prev, city }))}
                                    />
                                    <Button
                                        variant="highlight"
                                        size="sm"
                                        className="w-full"
                                        disabled={!newProject.name || createProject.isPending || updateProject.isPending}
                                        onClick={() => {
                                            if (!newProject.name) return;
                                            const payload = {
                                                name: newProject.name,
                                                description: newProject.description || undefined,
                                                phone: newProject.phone || undefined,
                                                address: newProject.address || undefined,
                                                city: newProject.city || undefined,
                                                state: newProject.state || undefined,
                                            };
                                            if (editingProjectId) {
                                                updateProject.mutate({ id: editingProjectId, ...payload });
                                            } else {
                                                if (!viewCompany?.id) return;
                                                createProject.mutate({ companyId: viewCompany.id, ...payload });
                                            }
                                        }}
                                    >
                                        {editingProjectId ? (
                                            <><Pencil size={14} /> {updateProject.isPending ? "Salvando..." : "Salvar Alterações"}</>
                                        ) : (
                                            <><Plus size={14} /> {createProject.isPending ? "Adicionando..." : "Adicionar Projeto"}</>
                                        )}
                                    </Button>
                                </div>

                                {/* Projects list */}
                                {viewCompanyProjects?.data?.length ? (
                                    <div className="space-y-1">
                                        {viewCompanyProjects.data.map((p: any) => (
                                            <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50 group">
                                                <FolderKanban size={16} className="text-blue-400 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-medium">{p.name}</p>
                                                    {p.description && (
                                                        <p className="text-xs text-[var(--zyllen-muted)] truncate">{p.description}</p>
                                                    )}
                                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--zyllen-muted)] mt-0.5">
                                                        {p.phone && <span className="flex items-center gap-1"><Phone size={10} />{p.phone}</span>}
                                                        {(p.city || p.state) && <span className="flex items-center gap-1"><MapPin size={10} />{p.city}{p.city && p.state ? " - " : ""}{p.state}</span>}
                                                        {p.address && <span className="text-[var(--zyllen-muted)]">{p.address}</span>}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-xs text-[var(--zyllen-muted)]">
                                                    {p._count?.externalUsers ?? 0} usuários
                                                </Badge>
                                                <button
                                                    onClick={() => startEditProject(p)}
                                                    className={`p-1 text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)] transition-opacity ${editingProjectId === p.id ? "opacity-100 text-[var(--zyllen-highlight)]" : "opacity-0 group-hover:opacity-100"}`}
                                                    title="Editar projeto"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => deleteProject.mutate(p.id)}
                                                    className="p-1 text-[var(--zyllen-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Excluir projeto"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-[var(--zyllen-muted)] text-center py-4">
                                        Nenhum projeto cadastrado — adicione o primeiro acima.
                                    </p>
                                )}
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={closeViewCompany}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ DIALOG: EDITAR EMPRESA ═══ */}
            <Dialog open={!!editCompany} onOpenChange={(o) => !o && setEditCompany(null)}>
                <DialogContent onClose={() => setEditCompany(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Editar Empresa</DialogTitle></DialogHeader>
                    <DialogBody>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Razão Social</Label>
                                <Input value={editCompany?.name || ""} onChange={(e) => setEditCompany({ ...editCompany, name: e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">CNPJ</Label>
                                <Input value={editCompany?.cnpj || ""} onChange={(e) => setEditCompany({ ...editCompany, cnpj: e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditCompany(null)}>Cancelar</Button>
                        <Button variant="highlight" onClick={() => updateCompany.mutate(editCompany)} disabled={updateCompany.isPending}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ DIALOG: CONFIRMAR EXCLUSÃO ═══ */}
            <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
                <DialogContent onClose={() => setDeleteConfirm(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
                    <DialogBody>
                        <p className="text-[var(--zyllen-muted)]">
                            Excluir empresa <strong className="text-white">{deleteConfirm?.name}</strong>? Todos os projetos e usuários associados serão afetados.
                        </p>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => deleteCompany.mutate(deleteConfirm.id)}>Excluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
