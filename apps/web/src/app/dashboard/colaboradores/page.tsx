"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch, useAuth } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Input } from "@web/components/ui/input";
import { Button } from "@web/components/ui/button";
import { Label } from "@web/components/ui/label";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import {
    Users, Plus, Search, UserCircle, Building, Mail,
    Calendar, ShieldCheck, ChevronRight, ArrowLeft,
} from "lucide-react";
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

    // ── Create form ──
    const [form, setForm] = useState({
        name: "", email: "", password: "", roleId: "",
        sector: "", description: "", pin: "",
    });

    const createUser = useMutation({
        mutationFn: (data: any) => apiClient.post("/auth/users", data, fetchOpts),
        onSuccess: (res: any) => {
            qc.invalidateQueries({ queryKey: ["internal-users"] });
            setShowCreate(false);
            setForm({ name: "", email: "", password: "", roleId: "", sector: "", description: "", pin: "" });
            toast.success(`Colaborador criado! PIN: ${res?.data?.pin ?? "—"}`, { duration: 10000 });
        },
        onError: (err: any) => toast.error(err.message || "Erro ao criar colaborador"),
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="text-[var(--zyllen-highlight)]" /> Colaboradores
                    </h1>
                    <p className="text-sm text-[var(--zyllen-muted)] mt-1">
                        {PAGE_DESCRIPTIONS.colaboradores}
                    </p>
                </div>
                {canManage && (
                    <Button variant="highlight" onClick={() => setShowCreate(!showCreate)}>
                        <Plus size={16} className="mr-2" /> Novo Colaborador
                    </Button>
                )}
            </div>

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
                                if (!payload.pin) delete payload.pin;
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
                                <Label className="text-[var(--zyllen-muted)]">PIN (4 dígitos)</Label>
                                <Input className={inputCls} placeholder="Ex: 1234 (opcional, gerado auto)" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} maxLength={4} pattern="\d{4}" />
                                <p className="text-xs text-[var(--zyllen-muted)]">Se não informado, será gerado automaticamente</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Role *</Label>
                                <select
                                    className={`w-full h-10 rounded-md px-3 text-sm ${inputCls}`}
                                    value={form.roleId}
                                    onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    {roles.map((r: any) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
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

            {/* Search */}
            <div className="relative max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                <Input
                    className={`${inputCls} pl-9`}
                    placeholder="Buscar por nome, email ou setor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* User list */}
            {isLoading ? (
                <div className="text-center py-12 text-[var(--zyllen-muted)]">Carregando...</div>
            ) : filtered.length === 0 ? (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardContent className="py-12 text-center">
                        <Users size={48} className="mx-auto text-[var(--zyllen-muted)]/30 mb-4" />
                        <p className="text-[var(--zyllen-muted)]">
                            {search ? EMPTY_STATES.collaborators : EMPTY_STATES.noCollaborators}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((user) => (
                        <Link key={user.id} href={`/dashboard/colaboradores/${user.id}`}>
                            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/30 transition-all cursor-pointer group h-full">
                                <CardContent className="py-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex items-center justify-center size-10 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] font-bold text-sm shrink-0">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-white truncate group-hover:text-[var(--zyllen-highlight)] transition-colors">
                                                    {user.name}
                                                </p>
                                                <ChevronRight size={14} className="text-[var(--zyllen-muted)] group-hover:text-[var(--zyllen-highlight)] transition-colors shrink-0" />
                                            </div>
                                            <p className="text-xs text-[var(--zyllen-muted)] truncate flex items-center gap-1">
                                                <Mail size={10} /> {user.email}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                <Badge variant={user.isActive ? "outline" : "destructive"} className="text-[10px]">
                                                    {user.isActive ? user.role.name : "Inativo"}
                                                </Badge>
                                                {user.sector && (
                                                    <Badge variant="outline" className="text-[10px] text-[var(--zyllen-muted)] border-[var(--zyllen-border)]">
                                                        <Building size={8} className="mr-1" /> {user.sector}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
