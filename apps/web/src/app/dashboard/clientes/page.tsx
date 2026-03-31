"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch } from "@web/lib/auth-context";
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
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("companies");

    // ─── Company state ──────────────────
    const [newCompany, setNewCompany] = useState({ ...EMPTY_COMPANY });
    const [editCompany, setEditCompany] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
    const [viewCompany, setViewCompany] = useState<any>(null);

    // ─── Project state ──────────────────
    const [newProject, setNewProject] = useState({ name: "", description: "", phone: "", address: "", city: "", state: "" });

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
            setNewProject({ name: "", description: "", phone: "", address: "", city: "", state: "" });
        },
        onError: (e: any) => toast.error(e.message),
    });

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
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Building2 className="text-[var(--zyllen-highlight)]" /> Clientes
            </h1>
            <p className="text-sm text-[var(--zyllen-muted)] mt-1">{PAGE_DESCRIPTIONS.clientes}</p>

            {/* ─── Tab Switcher ─── */}
            <div className="flex gap-1 bg-[var(--zyllen-bg)] rounded-xl p-1 border border-[var(--zyllen-border)] w-fit">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key as Tab)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key
                            ? "bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg)]"
                            : "text-[var(--zyllen-muted)] hover:text-white"
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
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader><CardTitle className="text-white">Nova Empresa</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={(e) => { e.preventDefault(); createCompany.mutate(newCompany); }} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
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
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader><CardTitle className="text-white">Empresas Cadastradas</CardTitle></CardHeader>
                        <CardContent>
                            {loadingCompanies ? (
                                <div className="space-y-2">
                                    {[...Array(3)].map((_, i) => (
                                        <Skeleton key={i} className="h-20 w-full rounded-lg" />
                                    ))}
                                </div>
                            ) : companies?.data?.length ? (
                                <div className="space-y-2">
                                    {companies.data.map((c: any) => (
                                        <div key={c.id} className="flex items-center gap-3 p-4 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50 group">
                                            <div className="flex items-center justify-center size-10 rounded-lg bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)]">
                                                <Building2 size={20} />
                                            </div>
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
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setViewCompany(c)}
                                                    className="p-1 text-[var(--zyllen-muted)] hover:text-blue-400"
                                                    title="Ver detalhes e projetos"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setEditCompany({
                                                        id: c.id, name: c.name, cnpj: c.cnpj || "",
                                                    })}
                                                    className="p-1 text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)]"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(c)}
                                                    className="p-1 text-[var(--zyllen-muted)] hover:text-red-400"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Building2 size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/50" />
                                    <p className="text-[var(--zyllen-muted)]">{EMPTY_STATES.companies}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* ═══ ABA: USUÁRIOS EXTERNOS ════════════ */}
            {/* ═══════════════════════════════════════ */}
            {tab === "users" && (
                <div className="space-y-4">
                    {/* ─── Formulário Novo Usuário ─── */}
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
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
                    </Card>

                    {/* ─── Lista de Usuários Agrupados por Empresa ─── */}
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader><CardTitle className="text-white">Usuários Externos</CardTitle></CardHeader>
                        <CardContent>
                            {loadingUsers ? (
                                <div className="space-y-2">
                                    {[...Array(3)].map((_, i) => (
                                        <Skeleton key={i} className="h-14 w-full rounded-lg" />
                                    ))}
                                </div>
                            ) : groupedUsers.length > 0 ? (
                                <div className="space-y-3">
                                    {groupedUsers.map((group) => {
                                        const isCollapsed = collapsedCompanies.has(group.company.id);
                                        return (
                                            <div key={group.company.id} className="rounded-lg border border-[var(--zyllen-border)]/50 overflow-hidden">
                                                {/* Group Header */}
                                                <button
                                                    onClick={() => toggleCollapse(group.company.id)}
                                                    className="w-full flex items-center gap-3 p-3 bg-[var(--zyllen-bg-dark)] hover:bg-[var(--zyllen-border)]/20 transition-colors text-left"
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
                                                    <div className="divide-y divide-[var(--zyllen-border)]/30">
                                                        {group.users.map((u: any) => (
                                                            <div key={u.id} className="flex items-center gap-3 p-3 hover:bg-[var(--zyllen-bg-dark)]/50 transition-colors">
                                                                <div className="flex items-center justify-center size-9 rounded-full bg-blue-400/20 text-blue-400 font-bold text-xs shrink-0">
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
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Users size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/50" />
                                    <p className="text-[var(--zyllen-muted)]">{EMPTY_STATES.externalUsers}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══════════════════════════════════════ */}
            {/* ═══ DIALOG: VER EMPRESA + PROJETOS ═══ */}
            {/* ═══════════════════════════════════════ */}
            <Dialog open={!!viewCompany} onOpenChange={(o) => !o && setViewCompany(null)}>
                <DialogContent onClose={() => setViewCompany(null)} className="border-[var(--zyllen-border)] max-w-xl">
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

                                {/* Add project form */}
                                <div className="space-y-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
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
                                        disabled={!newProject.name || createProject.isPending}
                                        onClick={() => {
                                            if (!newProject.name || !viewCompany?.id) return;
                                            createProject.mutate({
                                                companyId: viewCompany.id,
                                                name: newProject.name,
                                                description: newProject.description || undefined,
                                                phone: newProject.phone || undefined,
                                                address: newProject.address || undefined,
                                                city: newProject.city || undefined,
                                                state: newProject.state || undefined,
                                            });
                                        }}
                                    >
                                        <Plus size={14} /> {createProject.isPending ? "Adicionando..." : "Adicionar Projeto"}
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
                        <Button variant="ghost" onClick={() => setViewCompany(null)}>Fechar</Button>
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
