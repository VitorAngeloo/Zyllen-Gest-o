"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch, useAuth } from "@web/features/auth/context/auth-context";
import { Input } from "@web/components/ui/input";
import { Select } from "@web/components/ui/select";
import { PageHeader } from "@web/components/ui/page-header";
import { EmptyState, ListSectionHeader, WorkspaceBar, WorkspaceGroup } from "@web/components/ui/workspace";
import { toast } from "sonner";
import { ShieldCheck, Search, Check, X, ChevronRight, ShieldAlert } from "lucide-react";
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
    manage_roles: "Gerenciar perfis",
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
        onError: () => toast.error("Erro ao atualizar o perfil de acesso"),
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
            <PageHeader eyebrow="Gestão" title="Permissões de Colaborador" description={PAGE_DESCRIPTIONS.permissoes} />

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,2fr)]">
                <section className="space-y-4">
                    <ListSectionHeader title="Colaboradores" count={filteredUsers.length} description="Escolha uma pessoa para revisar seu perfil de acesso." />
                    <WorkspaceGroup label="Localizar colaborador">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" size={14} />
                            <Input className="pl-9" aria-label="Buscar colaborador" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </WorkspaceGroup>
                    <div className="max-h-[500px] divide-y divide-white/[0.07] overflow-y-auto border-y border-white/10 py-1">
                        {filteredUsers.map((u: any) => (
                            <button
                                key={u.id}
                                onClick={() => setSelectedUserId(u.id)}
                                className={`flex w-full items-center gap-3 border-l-2 px-3 py-3 text-left transition-colors ${selectedUserId === u.id ? "border-[var(--zyllen-highlight)] bg-[var(--zyllen-highlight)]/[0.06]" : "border-transparent hover:bg-white/[0.025]"}`}
                            >
                                <div className="flex size-8 shrink-0 items-center justify-center border border-white/10 bg-white/[0.035] text-xs font-semibold text-[var(--zyllen-highlight)]">{u.name?.charAt(0).toUpperCase()}</div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm text-white">{u.name}</p>
                                    <p className="truncate text-xs text-[var(--zyllen-muted)]">{u.email}</p>
                                </div>
                                {selectedUserId === u.id && <ChevronRight size={14} className="text-[var(--zyllen-highlight)]" />}
                            </button>
                        ))}
                        {filteredUsers.length === 0 && <p className="py-6 text-center text-sm text-[var(--zyllen-muted)]">{EMPTY_STATES.collaborators}</p>}
                    </div>
                </section>

                <div className="space-y-5">
                    {!selectedUser ? (
                        <EmptyState icon={<ShieldCheck size={24} />} title={EMPTY_STATES.selectCollaborator} description="A função e todas as permissões herdadas aparecerão neste painel." />
                    ) : (
                        <>
                            <WorkspaceBar>
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center border border-white/10 bg-white/[0.035] font-semibold text-[var(--zyllen-highlight)]">{selectedUser.name?.charAt(0).toUpperCase()}</div>
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-white">{selectedUser.name}</p>
                                        <p className="truncate text-xs text-[var(--zyllen-muted)]">{selectedUser.email}</p>
                                    </div>
                                </div>
                                <WorkspaceGroup label="Perfil de acesso" className="w-full sm:w-56">
                                    <Select value={selectedUser.role?.id ?? ""} onValueChange={(value) => changeRole.mutate(value)} aria-label="Perfil de acesso do colaborador">
                                        {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </Select>
                                </WorkspaceGroup>
                            </WorkspaceBar>

                            <section className="space-y-4">
                                <ListSectionHeader title={`Permissões de ${selectedUser.role?.name}`} description="Alterações afetam todas as pessoas que usam este perfil de acesso." />
                                {loadingRoleDetail ? (
                                    <p role="status" className="border-y border-white/10 py-8 text-sm text-[var(--zyllen-muted)]">Carregando permissões...</p>
                                ) : (
                                    <div className="divide-y divide-white/10 border-y border-white/10">
                                        {[...permsByScreen.entries()].map(([screen, perms]) => (
                                            <div key={screen} className="grid gap-3 py-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                                                <h3 className="text-sm font-semibold text-white">{SCREEN_LABELS[screen] ?? screen}</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {perms.map((p: any) => {
                                                        const active = rolePermIds.has(p.id);
                                                        return (
                                                            <button
                                                                key={p.id}
                                                                onClick={() => togglePerm(p.id)}
                                                                disabled={assignPerms.isPending}
                                                                aria-pressed={active}
                                                                className={`flex items-center gap-1.5 border px-3 py-2 text-xs font-medium transition-colors ${active ? "border-[var(--zyllen-highlight)]/40 bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)]" : "border-white/10 text-[var(--zyllen-muted)] hover:border-white/25 hover:text-white"}`}
                                                            >
                                                                {active ? <Check size={12} /> : <X size={12} />}
                                                                {ACTION_LABELS[p.action] ?? p.action}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                        {permsByScreen.size === 0 && <EmptyState title={EMPTY_STATES.permissions} />}
                                    </div>
                                )}
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
