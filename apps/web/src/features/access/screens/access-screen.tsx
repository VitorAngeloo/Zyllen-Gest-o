"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch } from "@web/features/auth/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import { Users, Key, Plus, Pencil, Trash2, RotateCw } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { PageHeader } from "@web/components/ui/page-header";
import { WorkspaceBar, WorkspaceGroup } from "@web/components/ui/workspace";
import { EMPTY_STATES, TOASTS, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";

export default function AcessoPage() {
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();

    // ── State ──
    const [roleForm, setRoleForm] = useState({ name: "", description: "" });
    const [editingRole, setEditingRole] = useState<any>(null);
    const [userForm, setUserForm] = useState({ name: "", email: "", password: "", roleId: "" });
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editUserForm, setEditUserForm] = useState({ name: "", email: "", roleId: "", isActive: true });
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showCreateRole, setShowCreateRole] = useState(false);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

    // ── Queries ──
    const { data: roles, isLoading: loadingRoles } = useQuery({
        queryKey: ["roles"],
        queryFn: () => apiClient.get<{ data: any[] }>("/access/roles", fetchOpts),
    });

    const { data: permissions, isLoading: loadingPerms } = useQuery({
        queryKey: ["permissions"],
        queryFn: () => apiClient.get<{ data: any[] }>("/access/permissions", fetchOpts),
    });

    const { data: users, isLoading: loadingUsers } = useQuery({
        queryKey: ["internal-users"],
        queryFn: () => apiClient.get<{ data: any[] }>("/auth/users", fetchOpts),
    });

    const { data: roleDetail } = useQuery({
        queryKey: ["role-detail", selectedRoleId],
        queryFn: () => apiClient.get<{ data: any }>(`/access/roles/${selectedRoleId}`, fetchOpts),
        enabled: !!selectedRoleId,
    });

    // ── Mutations ──
    const createRole = useMutation({
        mutationFn: (data: any) => apiClient.post("/access/roles", data, fetchOpts),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); setShowCreateRole(false); setRoleForm({ name: "", description: "" }); toast.success("Perfil de acesso criado"); },
        onError: () => toast.error("Erro ao criar o perfil de acesso"),
    });

    const updateRole = useMutation({
        mutationFn: ({ id, ...data }: any) => apiClient.put(`/access/roles/${id}`, data, fetchOpts),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); setEditingRole(null); toast.success("Perfil de acesso atualizado"); },
        onError: () => toast.error("Erro ao atualizar o perfil de acesso"),
    });

    const deleteRole = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/access/roles/${id}`, fetchOpts),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast.success("Perfil de acesso excluído"); },
        onError: () => toast.error("Erro ao excluir o perfil de acesso"),
    });

    const createUser = useMutation({
        mutationFn: (data: any) => apiClient.post("/auth/users", data, fetchOpts),
        onSuccess: (res: any) => {
            qc.invalidateQueries({ queryKey: ["internal-users"] });
            setShowCreateUser(false);
            setUserForm({ name: "", email: "", password: "", roleId: "" });
            toast.success(`Usuário criado! PIN: ${res?.data?.pin ?? "—"}`, { duration: 10000 });
        },
        onError: () => toast.error("Erro ao criar usuário"),
    });

    const updateUser = useMutation({
        mutationFn: ({ id, ...data }: any) => apiClient.put(`/auth/users/${id}`, data, fetchOpts),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["internal-users"] }); setEditingUser(null); toast.success("Usuário atualizado"); },
        onError: () => toast.error("Erro ao atualizar usuário"),
    });

    const resetPin = useMutation({
        mutationFn: (id: string) => apiClient.post(`/auth/users/${id}/reset-pin`, {}, fetchOpts),
        onSuccess: (res: any) => toast.success(`Novo PIN: ${res?.data?.pin ?? "—"}`, { duration: 10000 }),
        onError: () => toast.error("Erro ao resetar PIN"),
    });

    const assignPerms = useMutation({
        mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
            apiClient.post(`/access/roles/${roleId}/permissions`, { permissionIds }, fetchOpts),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["role-detail", selectedRoleId] });
            qc.invalidateQueries({ queryKey: ["roles"] });
            toast.success(TOASTS.permissionsUpdated);
        },
        onError: () => toast.error("Erro ao atualizar permissões"),
    });

    // ── Permission helpers ──
    const allPerms = permissions?.data ?? [];
    const permScreens = [...new Set(allPerms.map((p: any) => p.screen))].sort();
    const rolePermIds = new Set((roleDetail?.data?.permissions ?? []).map((rp: any) => rp.permission?.id ?? rp.permissionId ?? rp.id));

    function togglePerm(permId: string) {
        if (!selectedRoleId) return;
        const current = new Set(rolePermIds);
        if (current.has(permId)) current.delete(permId);
        else current.add(permId);
        assignPerms.mutate({ roleId: selectedRoleId, permissionIds: [...current] as string[] });
    }

    const inputCls = "w-full p-2 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm placeholder:text-[var(--zyllen-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]";
    const btnPrimary = "px-4 py-2 rounded-lg bg-[var(--zyllen-highlight)] text-black text-sm font-medium hover:opacity-90 disabled:opacity-50";
    const btnSecondary = "px-3 py-1.5 rounded-lg border border-[var(--zyllen-border)] text-white text-xs hover:bg-[var(--zyllen-bg-dark)]";

    return (
        <div className="space-y-6">
            <PageHeader eyebrow="Gestão" title="Acesso & Permissões" description={PAGE_DESCRIPTIONS.acesso} />

            <WorkspaceBar className="sm:items-stretch">
                <WorkspaceGroup label="Estrutura de acesso" className="w-full">
                    <div className="grid grid-cols-3 divide-x divide-white/10 border-y border-white/10">
                        <AccessMetric label="Perfis" value={roles?.data?.length ?? 0} />
                        <AccessMetric label="Pessoas" value={users?.data?.length ?? 0} />
                        <AccessMetric label="Permissões" value={allPerms.length} loading={loadingPerms} />
                    </div>
                </WorkspaceGroup>
            </WorkspaceBar>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Roles ── */}
                <Card className="rounded-none border-x-0 border-white/10 bg-transparent">
                    <CardHeader className="flex flex-row items-center justify-between px-0">
                        <CardTitle className="text-white flex items-center gap-2">
                            <Key size={18} className="text-[var(--zyllen-highlight)]" /> Perfis de acesso
                        </CardTitle>
                        <button className={btnSecondary} onClick={() => setShowCreateRole(!showCreateRole)}>
                            <Plus size={14} className="inline mr-1" /> Novo perfil
                        </button>
                    </CardHeader>
                    <CardContent className="space-y-3 px-0">
                        {showCreateRole && (
                            <div className="space-y-2 border-l-2 border-[var(--zyllen-highlight)] bg-white/[0.02] p-4">
                                <input className={inputCls} placeholder="Nome do perfil" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} />
                                <input className={inputCls} placeholder="Descrição (opcional)" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} />
                                <div className="flex gap-2">
                                    <button className={btnPrimary} disabled={!roleForm.name} onClick={() => createRole.mutate(roleForm)}>Criar</button>
                                    <button className={btnSecondary} onClick={() => setShowCreateRole(false)}>Cancelar</button>
                                </div>
                            </div>
                        )}
                        {loadingRoles ? (
                            <div className="space-y-2">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                                ))}
                            </div>
                        ) : roles?.data?.length ? <div className="divide-y divide-white/10 border-y border-white/10">{roles.data.map((role: any) => (
                            <div key={role.id} className={`flex cursor-pointer items-center justify-between border-l-2 px-3 py-4 transition-colors ${selectedRoleId === role.id ? "border-[var(--zyllen-highlight)] bg-[var(--zyllen-highlight)]/[0.06]" : "border-transparent hover:bg-white/[0.02]"}`}
                                onClick={() => setSelectedRoleId(selectedRoleId === role.id ? null : role.id)}>
                                {editingRole?.id === role.id ? (
                                    <div className="flex-1 space-y-1" onClick={(e) => e.stopPropagation()}>
                                        <input className={inputCls} value={editingRole.name} onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })} />
                                        <div className="flex gap-2">
                                            <button className={btnPrimary} onClick={() => updateRole.mutate(editingRole)}>Salvar</button>
                                            <button className={btnSecondary} onClick={() => setEditingRole(null)}>Cancelar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <p className="text-white text-sm font-medium">{role.name}</p>
                                            <p className="text-xs text-[var(--zyllen-muted)]">{role.description ?? ""}</p>
                                        </div>
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Badge variant="outline" className="text-[var(--zyllen-highlight)] border-[var(--zyllen-highlight)]/30">
                                                {role._count?.permissions ?? role.permissions?.length ?? 0} permissões
                                            </Badge>
                                            <button className="text-[var(--zyllen-muted)] hover:text-white" onClick={() => setEditingRole({ id: role.id, name: role.name, description: role.description ?? "" })}>
                                                <Pencil size={14} />
                                            </button>
                                            <button className="text-[var(--zyllen-muted)] hover:text-red-400" onClick={() => { if (confirm("Excluir perfil de acesso?")) deleteRole.mutate(role.id); }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}</div> : !loadingRoles && <p className="border-y border-white/10 py-8 text-sm text-[var(--zyllen-muted)]">{EMPTY_STATES.roles}</p>}
                    </CardContent>
                </Card>

                {/* ── Users ── */}
                <Card className="rounded-none border-x-0 border-white/10 bg-transparent">
                    <CardHeader className="flex flex-row items-center justify-between px-0">
                        <CardTitle className="text-white flex items-center gap-2">
                            <Users size={18} className="text-[var(--zyllen-highlight)]" /> Usuários Internos
                        </CardTitle>
                        <button className={btnSecondary} onClick={() => setShowCreateUser(!showCreateUser)}>
                            <Plus size={14} className="inline mr-1" /> Novo
                        </button>
                    </CardHeader>
                    <CardContent className="space-y-3 px-0">
                        {showCreateUser && (
                            <div className="space-y-2 border-l-2 border-[var(--zyllen-highlight)] bg-white/[0.02] p-4">
                                <input className={inputCls} placeholder="Nome" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
                                <input className={inputCls} placeholder="Email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                                <input className={inputCls} placeholder="Senha" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
                                <select className={inputCls} value={userForm.roleId} onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}>
                                    <option value="">Selecione o perfil de acesso...</option>
                                    {(roles?.data ?? []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                                <div className="flex gap-2">
                                    <button className={btnPrimary} disabled={!userForm.name || !userForm.email || !userForm.password || !userForm.roleId} onClick={() => createUser.mutate(userForm)}>Criar</button>
                                    <button className={btnSecondary} onClick={() => setShowCreateUser(false)}>Cancelar</button>
                                </div>
                            </div>
                        )}
                        {loadingUsers ? (
                            <div className="space-y-2">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                                ))}
                            </div>
                        ) : users?.data?.length ? <div className="divide-y divide-white/10 border-y border-white/10">{users.data.map((u: any) => (
                            <div key={u.id} className="flex items-center gap-3 px-3 py-4 transition-colors hover:bg-white/[0.02]">
                                {editingUser?.id === u.id ? (
                                    <div className="flex-1 space-y-2">
                                        <input className={inputCls} value={editUserForm.name} onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })} />
                                        <input className={inputCls} value={editUserForm.email} onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })} />
                                        <select className={inputCls} value={editUserForm.roleId} onChange={(e) => setEditUserForm({ ...editUserForm, roleId: e.target.value })}>
                                            {(roles?.data ?? []).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                        <label className="flex items-center gap-2 text-sm text-white">
                                            <input type="checkbox" checked={editUserForm.isActive} onChange={(e) => setEditUserForm({ ...editUserForm, isActive: e.target.checked })} />
                                            Ativo
                                        </label>
                                        <div className="flex gap-2">
                                            <button className={btnPrimary} onClick={() => updateUser.mutate({ id: u.id, ...editUserForm })}>Salvar</button>
                                            <button className={btnSecondary} onClick={() => setEditingUser(null)}>Cancelar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex size-8 items-center justify-center border border-white/10 bg-white/[0.035] text-xs font-semibold text-[var(--zyllen-highlight)]">
                                            {u.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate">{u.name}</p>
                                            <p className="text-xs text-[var(--zyllen-muted)] truncate">{u.email}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={u.isActive ? "outline" : "destructive"} className="text-xs">
                                                {u.isActive ? u.role?.name : "Inativo"}
                                            </Badge>
                                            <button className="text-[var(--zyllen-muted)] hover:text-white" onClick={() => {
                                                setEditingUser(u);
                                                setEditUserForm({ name: u.name, email: u.email, roleId: u.role?.id ?? "", isActive: u.isActive });
                                            }}><Pencil size={14} /></button>
                                            <button className="text-[var(--zyllen-muted)] hover:text-amber-400" title="Resetar PIN" onClick={() => { if (confirm("Resetar PIN?")) resetPin.mutate(u.id); }}>
                                                <RotateCw size={14} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}</div> : !loadingUsers && <p className="border-y border-white/10 py-8 text-sm text-[var(--zyllen-muted)]">{EMPTY_STATES.users}</p>}
                    </CardContent>
                </Card>
            </div>

            {/* ── Permission Matrix ── */}
            {selectedRoleId && (
                <Card className="rounded-none border-x-0 border-white/10 bg-transparent">
                    <CardHeader className="px-0">
                        <CardTitle className="text-white">
                            Permissões do perfil: <span className="text-[var(--zyllen-highlight)]">{roles?.data?.find((r: any) => r.id === selectedRoleId)?.name}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0">
                        <div className="divide-y divide-white/10 border-y border-white/10">
                            {permScreens.map((screen) => {
                                const screenPerms = allPerms.filter((p: any) => p.screen === screen);
                                return (
                                    <div key={screen as string} className="grid gap-3 py-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">{screen as string}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {screenPerms.map((p: any) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => togglePerm(p.id)}
                                                    aria-pressed={rolePermIds.has(p.id)}
                                                    className={`border px-3 py-2 text-xs font-medium transition-colors ${
                                                        rolePermIds.has(p.id)
                                                            ? "border-[var(--zyllen-highlight)]/40 bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)]"
                                                            : "bg-transparent text-[var(--zyllen-muted)] border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/50"
                                                    }`}
                                                >
                                                    {p.action}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* All Permissions Reference */}
            {!selectedRoleId && (
                <Card className="rounded-none border-x-0 border-white/10 bg-transparent">
                    <CardHeader className="px-0">
                        <CardTitle className="text-white">Todas as Permissões</CardTitle>
                    </CardHeader>
                    <CardContent className="px-0">
                        {allPerms.length ? (
                            <div className="grid border-y border-white/10 sm:grid-cols-2 lg:grid-cols-4">
                                {allPerms.map((p: any) => (
                                    <div key={p.id} className="border-b border-white/10 p-3 sm:border-r">
                                        <p className="text-xs font-mono text-[var(--zyllen-highlight)]">{p.screen}.{p.action}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[var(--zyllen-muted)] text-center py-4">{EMPTY_STATES.permissions}</p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function AccessMetric({ label, value, loading = false }: { label: string; value: number; loading?: boolean }) {
    return (
        <div className="px-3 py-3 sm:px-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</p>
            <p className="mt-1 font-mono text-xl tabular-nums text-white">{loading ? "—" : value}</p>
        </div>
    );
}
