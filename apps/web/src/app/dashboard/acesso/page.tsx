"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, Users, Key, Plus, Pencil, Trash2, RotateCw } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
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
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); setShowCreateRole(false); setRoleForm({ name: "", description: "" }); toast.success("Role criada"); },
        onError: () => toast.error("Erro ao criar role"),
    });

    const updateRole = useMutation({
        mutationFn: ({ id, ...data }: any) => apiClient.put(`/access/roles/${id}`, data, fetchOpts),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); setEditingRole(null); toast.success("Role atualizada"); },
        onError: () => toast.error("Erro ao atualizar role"),
    });

    const deleteRole = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/access/roles/${id}`, fetchOpts),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast.success("Role excluída"); },
        onError: () => toast.error("Erro ao excluir role"),
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
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-[var(--zyllen-highlight)]" /> Acesso & Permissões
            </h1>
            <p className="text-sm text-[var(--zyllen-muted)] mt-1">{PAGE_DESCRIPTIONS.acesso}</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ── Roles ── */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-white flex items-center gap-2">
                            <Key size={18} className="text-[var(--zyllen-highlight)]" /> Roles
                        </CardTitle>
                        <button className={btnSecondary} onClick={() => setShowCreateRole(!showCreateRole)}>
                            <Plus size={14} className="inline mr-1" /> Nova
                        </button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {showCreateRole && (
                            <div className="space-y-2 p-3 rounded-lg border border-[var(--zyllen-highlight)]/30 bg-[var(--zyllen-bg-dark)]">
                                <input className={inputCls} placeholder="Nome da role" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} />
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
                        ) : roles?.data?.length ? roles.data.map((role: any) => (
                            <div key={role.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedRoleId === role.id ? "bg-[var(--zyllen-highlight)]/10 border-[var(--zyllen-highlight)]/50" : "bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)]/50"}`}
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
                                                {role._count?.permissions ?? role.permissions?.length ?? 0} perms
                                            </Badge>
                                            <button className="text-[var(--zyllen-muted)] hover:text-white" onClick={() => setEditingRole({ id: role.id, name: role.name, description: role.description ?? "" })}>
                                                <Pencil size={14} />
                                            </button>
                                            <button className="text-[var(--zyllen-muted)] hover:text-red-400" onClick={() => { if (confirm("Excluir role?")) deleteRole.mutate(role.id); }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )) : !loadingRoles && <p className="text-[var(--zyllen-muted)] text-center py-4">{EMPTY_STATES.roles}</p>}
                    </CardContent>
                </Card>

                {/* ── Users ── */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-white flex items-center gap-2">
                            <Users size={18} className="text-[var(--zyllen-highlight)]" /> Usuários Internos
                        </CardTitle>
                        <button className={btnSecondary} onClick={() => setShowCreateUser(!showCreateUser)}>
                            <Plus size={14} className="inline mr-1" /> Novo
                        </button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {showCreateUser && (
                            <div className="space-y-2 p-3 rounded-lg border border-[var(--zyllen-highlight)]/30 bg-[var(--zyllen-bg-dark)]">
                                <input className={inputCls} placeholder="Nome" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
                                <input className={inputCls} placeholder="Email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                                <input className={inputCls} placeholder="Senha" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
                                <select className={inputCls} value={userForm.roleId} onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}>
                                    <option value="">Selecione a role...</option>
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
                        ) : users?.data?.length ? users.data.map((u: any) => (
                            <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
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
                                        <div className="flex items-center justify-center size-8 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] font-bold text-xs">
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
                        )) : !loadingUsers && <p className="text-[var(--zyllen-muted)] text-center py-4">{EMPTY_STATES.users}</p>}
                    </CardContent>
                </Card>
            </div>

            {/* ── Permission Matrix ── */}
            {selectedRoleId && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <CardTitle className="text-white">
                            Permissões da Role: <span className="text-[var(--zyllen-highlight)]">{roles?.data?.find((r: any) => r.id === selectedRoleId)?.name}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {permScreens.map((screen) => {
                                const screenPerms = allPerms.filter((p: any) => p.screen === screen);
                                return (
                                    <div key={screen as string}>
                                        <p className="text-xs font-mono text-[var(--zyllen-highlight)] mb-2 uppercase">{screen as string}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {screenPerms.map((p: any) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => togglePerm(p.id)}
                                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                                        rolePermIds.has(p.id)
                                                            ? "bg-[var(--zyllen-highlight)] text-black border-[var(--zyllen-highlight)]"
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
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <CardTitle className="text-white">Todas as Permissões</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {allPerms.length ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                {allPerms.map((p: any) => (
                                    <div key={p.id} className="p-2 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
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
