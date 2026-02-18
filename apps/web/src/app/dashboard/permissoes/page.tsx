"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch, useAuth } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Search, Check, X, Users, ChevronRight, ShieldAlert } from "lucide-react";
import { EMPTY_STATES, TOASTS, PAGE_DESCRIPTIONS, ACCESS_DENIED } from "@web/lib/brand-voice";

const SCREEN_LABELS: Record<string, string> = {
    access: "Acesso & Permissões",
    assets: "Patrimônio",
    catalog: "Cadastros",
    dashboard: "Dashboard",
    inventory: "Estoque",
    labels: "Etiquetas",
    maintenance: "Manutenção",
    purchases: "Compras",
    settings: "Configurações",
    tickets: "Chamados",
};

const ACTION_LABELS: Record<string, string> = {
    view: "Visualizar",
    create: "Criar",
    edit: "Editar",
    delete: "Excluir",
    manage: "Gerenciar",
    manage_roles: "Gerenciar Roles",
    manage_permissions: "Gerenciar Permissões",
    approve: "Aprovar",
    print: "Imprimir",
};

export default function PermissoesPage() {
    const fetchOpts = useAuthedFetch();
    const { hasPermission } = useAuth();
    const qc = useQueryClient();
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const { data: usersRes } = useQuery({
        queryKey: ["internal-users"],
        queryFn: () => apiClient.get<{ data: any[] }>("/auth/users", fetchOpts),
    });

    const { data: rolesRes } = useQuery({
        queryKey: ["roles"],
        queryFn: () => apiClient.get<{ data: any[] }>("/access/roles", fetchOpts),
    });

    const { data: permissionsRes } = useQuery({
        queryKey: ["permissions"],
        queryFn: () => apiClient.get<{ data: any[] }>("/access/permissions", fetchOpts),
    });

    const users = usersRes?.data ?? [];
    const roles = rolesRes?.data ?? [];
    const allPerms = permissionsRes?.data ?? [];

    const selectedUser = useMemo(() => users.find((u: any) => u.id === selectedUserId), [users, selectedUserId]);

    const selectedRoleId = selectedUser?.role?.id ?? null;

    const { data: roleDetailRes, isLoading: loadingRoleDetail } = useQuery({
        queryKey: ["role-detail", selectedRoleId],
        queryFn: () => apiClient.get<{ data: any }>(`/access/roles/${selectedRoleId}`, fetchOpts),
        enabled: !!selectedRoleId,
    });

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        const term = searchTerm.toLowerCase();
        return users.filter((u: any) =>
            u.name?.toLowerCase().includes(term) ||
            u.email?.toLowerCase().includes(term) ||
            u.sector?.toLowerCase().includes(term)
        );
    }, [users, searchTerm]);

    // Group permissions by screen
    const permsByScreen = useMemo(() => {
        const map = new Map<string, any[]>();
        allPerms.forEach((p: any) => {
            if (!map.has(p.screen)) map.set(p.screen, []);
            map.get(p.screen)!.push(p);
        });
        return map;
    }, [allPerms]);

    // Current role's permission IDs
    const rolePermIds = useMemo(() => {
        const detail = roleDetailRes?.data;
        if (!detail?.permissions) return new Set<string>();
        return new Set(detail.permissions.map((rp: any) => rp.screenPermission?.id ?? rp.screenPermissionId ?? rp.id));
    }, [roleDetailRes]);

    const changeRole = useMutation({
        mutationFn: (roleId: string) =>
            apiClient.put(`/auth/users/${selectedUserId}`, { roleId }, fetchOpts),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["internal-users"] });
            toast.success(TOASTS.roleUpdated);
        },
        onError: () => toast.error("Erro ao atualizar role"),
    });

    const assignPerms = useMutation({
        mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
            apiClient.post(`/access/roles/${roleId}/permissions`, { permissionIds }, fetchOpts),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["role-detail", selectedUser?.role?.id] });
            qc.invalidateQueries({ queryKey: ["roles"] });
            toast.success(TOASTS.permissionsUpdated);
        },
        onError: () => toast.error("Erro ao atualizar permissões"),
    });

    function togglePerm(permId: string) {
        const rId = selectedUser?.role?.id;
        if (!rId) return;
        const current = new Set(rolePermIds);
        if (current.has(permId)) current.delete(permId);
        else current.add(permId);
        assignPerms.mutate({
            roleId: rId,
            permissionIds: [...current] as string[],
        });
    }

    const inputCls = "w-full p-2.5 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm placeholder:text-[var(--zyllen-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30";

    if (!hasPermission("access.manage")) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <ShieldAlert size={48} className="text-[var(--zyllen-error)] mb-4" />
                <h1 className="text-xl font-bold text-white mb-2">{ACCESS_DENIED.title}</h1>
                <p className="text-[var(--zyllen-muted)]">{ACCESS_DENIED.description}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="text-[var(--zyllen-highlight)]" /> Permissões de Colaborador
                </h1>
                <p className="text-sm text-[var(--zyllen-muted)] mt-1">
                    {PAGE_DESCRIPTIONS.permissoes}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: User selector */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-white text-base flex items-center gap-2">
                            <Users size={18} /> Colaboradores
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" size={14} />
                            <input
                                className={`${inputCls} pl-9`}
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1 max-h-[500px] overflow-y-auto">
                            {filteredUsers.map((u: any) => (
                                <button
                                    key={u.id}
                                    onClick={() => setSelectedUserId(u.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                                        selectedUserId === u.id
                                            ? "bg-[var(--zyllen-highlight)]/10 border border-[var(--zyllen-highlight)]/30"
                                            : "hover:bg-white/5 border border-transparent"
                                    }`}
                                >
                                    <div className="flex items-center justify-center size-8 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] font-bold text-xs shrink-0">
                                        {u.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white truncate">{u.name}</p>
                                        <p className="text-xs text-[var(--zyllen-muted)] truncate">{u.email}</p>
                                    </div>
                                    {selectedUserId === u.id && (
                                        <ChevronRight size={14} className="text-[var(--zyllen-highlight)]" />
                                    )}
                                </button>
                            ))}
                            {filteredUsers.length === 0 && (
                                <p className="text-center text-sm text-[var(--zyllen-muted)] py-4">{EMPTY_STATES.collaborators}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Permissions panel */}
                <div className="lg:col-span-2 space-y-4">
                    {!selectedUser ? (
                        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                            <CardContent className="py-20 text-center">
                                <ShieldCheck size={40} className="mx-auto text-[var(--zyllen-muted)]/30 mb-3" />
                                <p className="text-[var(--zyllen-muted)]">{EMPTY_STATES.selectCollaborator}</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* User info + role select */}
                            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                                <CardContent className="py-4">
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="flex items-center justify-center size-10 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] font-bold">
                                                {selectedUser.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{selectedUser.name}</p>
                                                <p className="text-xs text-[var(--zyllen-muted)]">{selectedUser.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <label className="text-sm text-[var(--zyllen-muted)]">Role:</label>
                                            <select
                                                className="h-9 rounded-lg px-3 text-sm bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30"
                                                value={selectedUser.role?.id ?? ""}
                                                onChange={(e) => changeRole.mutate(e.target.value)}
                                            >
                                                {roles.map((r: any) => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Permission matrix */}
                            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                                <CardHeader>
                                    <CardTitle className="text-white text-base">
                                        Permissões da Role: <span className="text-[var(--zyllen-highlight)]">{selectedUser.role?.name}</span>
                                    </CardTitle>
                                    <p className="text-xs text-[var(--zyllen-muted)]">
                                        Alterações afetam todos os usuários com esta role
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    {loadingRoleDetail ? (
                                        <p className="text-center py-8 text-[var(--zyllen-muted)]">Carregando...</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {[...permsByScreen.entries()].map(([screen, perms]) => (
                                                <div key={screen} className="rounded-lg border border-[var(--zyllen-border)]/50 bg-[var(--zyllen-bg-dark)] p-4">
                                                    <h3 className="text-sm font-semibold text-white mb-3">
                                                        {SCREEN_LABELS[screen] ?? screen}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-2">
                                                        {perms.map((p: any) => {
                                                            const active = rolePermIds.has(p.id);
                                                            return (
                                                                <button
                                                                    key={p.id}
                                                                    onClick={() => togglePerm(p.id)}
                                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                                                        active
                                                                            ? "bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] border border-[var(--zyllen-highlight)]/30"
                                                                            : "bg-[var(--zyllen-bg)] text-[var(--zyllen-muted)] border border-[var(--zyllen-border)] hover:text-white"
                                                                    }`}
                                                                >
                                                                    {active ? <Check size={12} /> : <X size={12} />}
                                                                    {ACTION_LABELS[p.action] ?? p.action}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                            {permsByScreen.size === 0 && (
                                                <p className="text-center py-8 text-[var(--zyllen-muted)]">{EMPTY_STATES.permissions}</p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
