"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Badge } from "@web/components/ui/badge";
import { ShieldCheck, Users, Key } from "lucide-react";

export default function AcessoPage() {
    const fetchOpts = useAuthedFetch();

    const { data: roles } = useQuery({
        queryKey: ["roles"],
        queryFn: () => apiClient.get<{ data: any[] }>("/access/roles", fetchOpts),
    });

    const { data: permissions } = useQuery({
        queryKey: ["permissions"],
        queryFn: () => apiClient.get<{ data: any[] }>("/access/permissions", fetchOpts),
    });

    const { data: users } = useQuery({
        queryKey: ["internal-users"],
        queryFn: () => apiClient.get<{ data: any[] }>("/auth/users", fetchOpts),
    });

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-[var(--zyllen-highlight)]" /> Acesso & Permissões
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Roles */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Key size={18} className="text-[var(--zyllen-highlight)]" /> Roles
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {roles?.data?.length ? (
                            <div className="space-y-2">
                                {roles.data.map((role: any) => (
                                    <div key={role.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                        <div>
                                            <p className="text-white text-sm font-medium">{role.name}</p>
                                            <p className="text-xs text-[var(--zyllen-muted)]">{role.description ?? ""}</p>
                                        </div>
                                        <Badge variant="outline" className="text-[var(--zyllen-highlight)] border-[var(--zyllen-highlight)]/30">
                                            {role._count?.permissions ?? role.permissions?.length ?? 0} perms
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[var(--zyllen-muted)] text-center py-4">Nenhuma role</p>
                        )}
                    </CardContent>
                </Card>

                {/* Users */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Users size={18} className="text-[var(--zyllen-highlight)]" /> Usuários Internos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {users?.data?.length ? (
                            <div className="space-y-2">
                                {users.data.map((u: any) => (
                                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                        <div className="flex items-center justify-center size-8 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] font-bold text-xs">
                                            {u.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate">{u.name}</p>
                                            <p className="text-xs text-[var(--zyllen-muted)] truncate">{u.email}</p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">{u.role?.name}</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[var(--zyllen-muted)] text-center py-4">Nenhum usuário</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Permissions Overview */}
            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                <CardHeader>
                    <CardTitle className="text-white">Todas as Permissões</CardTitle>
                </CardHeader>
                <CardContent>
                    {permissions?.data?.length ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {permissions.data.map((p: any) => (
                                <div key={p.id} className="p-2 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                    <p className="text-xs font-mono text-[var(--zyllen-highlight)]">{p.screen}.{p.action}</p>
                                    <p className="text-[10px] text-[var(--zyllen-muted)]">{p.description ?? ""}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[var(--zyllen-muted)] text-center py-4">Nenhuma permissão</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
