"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch, useAuth } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Input } from "@web/components/ui/input";
import { Button } from "@web/components/ui/button";
import { Label } from "@web/components/ui/label";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import {
    ArrowLeft, UserCircle, Mail, Building, Calendar, ShieldCheck,
    Pencil, RotateCw, Headset, Wrench, FileText, Clock,
    CheckCircle2, AlertCircle, XCircle, Save, X, Trash2,
} from "lucide-react";
import { EMPTY_STATES } from "@web/lib/brand-voice";

interface UserDetail {
    id: string;
    name: string;
    email: string;
    sector: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    role: { id: string; name: string };
    activity: {
        assignedTickets: any[];
        maintenanceOpened: any[];
        maintenanceClosed: any[];
        auditLogs: any[];
    };
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
    LOGIN: "Login",
    USER_CREATED: "Usuário criado",
    MAINTENANCE_OPENED: "OS aberta",
    MAINTENANCE_CLOSED: "OS encerrada",
    MAINTENANCE_UPDATED: "OS atualizada",
    STOCK_MOVEMENT: "Movimento de estoque",
    APPROVAL_ACTION: "Ação de aprovação",
};

export default function ColaboradorDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const fetchOpts = useAuthedFetch();
    const { hasPermission } = useAuth();
    const qc = useQueryClient();
    const canManage = hasPermission("access.manage");

    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [activeTab, setActiveTab] = useState<"info" | "tickets" | "maintenance" | "logs">("info");

    const { data: userRes, isLoading } = useQuery({
        queryKey: ["user-detail", id],
        queryFn: () => apiClient.get<{ data: UserDetail }>(`/auth/users/${id}`, fetchOpts),
        enabled: !!id,
    });

    const { data: rolesRes } = useQuery({
        queryKey: ["roles"],
        queryFn: () => apiClient.get<{ data: any[] }>("/access/roles", fetchOpts),
    });

    const updateUser = useMutation({
        mutationFn: (data: any) => apiClient.put(`/auth/users/${id}`, data, fetchOpts),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["user-detail", id] });
            qc.invalidateQueries({ queryKey: ["internal-users"] });
            setEditing(false);
            toast.success("Colaborador atualizado");
        },
        onError: (err: any) => toast.error(err.message || "Erro ao atualizar"),
    });

    const resetPin = useMutation({
        mutationFn: () => apiClient.post(`/auth/users/${id}/reset-pin`, {}, fetchOpts),
        onSuccess: (res: any) => toast.success(`Novo PIN: ${res?.data?.pin ?? "—"}`, { duration: 10000 }),
        onError: () => toast.error("Erro ao resetar PIN"),
    });

    const deleteUser = useMutation({
        mutationFn: () => apiClient.delete(`/auth/users/${id}`, fetchOpts),
        onSuccess: () => {
            toast.success("Colaborador excluído");
            qc.invalidateQueries({ queryKey: ["internal-users"] });
            router.push("/dashboard/colaboradores");
        },
        onError: (err: any) => toast.error(err.message || "Erro ao excluir"),
    });

    const handleDelete = () => {
        if (confirm(`Tem certeza que deseja excluir "${user?.name}"?\n\nSe o usuário possui registros vinculados, desative-o ao invés de excluir.`)) {
            deleteUser.mutate();
        }
    };

    const user = userRes?.data;
    const roles = rolesRes?.data ?? [];

    if (isLoading) {
        return (
            <div className="text-center py-20 text-[var(--zyllen-muted)]">Carregando...</div>
        );
    }

    if (!user) {
        return (
            <div className="text-center py-20">
                <p className="text-[var(--zyllen-muted)]">Colaborador não encontrado</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/colaboradores")}>
                    Voltar
                </Button>
            </div>
        );
    }

    const inputCls = "bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50 focus-visible:ring-[var(--zyllen-highlight)]/30 focus-visible:border-[var(--zyllen-highlight)]";

    const startEdit = () => {
        setEditForm({
            name: user.name,
            email: user.email,
            sector: user.sector ?? "",
            description: user.description ?? "",
            roleId: user.role.id,
            isActive: user.isActive,
            password: "",
            pin: "",
        });
        setEditing(true);
    };

    const saveEdit = () => {
        const payload: any = {};
        if (editForm.name !== user.name) payload.name = editForm.name;
        if (editForm.email !== user.email) payload.email = editForm.email;
        if (editForm.sector !== (user.sector ?? "")) payload.sector = editForm.sector;
        if (editForm.description !== (user.description ?? "")) payload.description = editForm.description;
        if (editForm.roleId !== user.role.id) payload.roleId = editForm.roleId;
        if (editForm.isActive !== user.isActive) payload.isActive = editForm.isActive;
        if (editForm.password) payload.password = editForm.password;
        if (editForm.pin) payload.pin = editForm.pin;

        if (Object.keys(payload).length === 0) {
            setEditing(false);
            return;
        }
        updateUser.mutate(payload);
    };

    const TABS = [
        { key: "info" as const, label: "Informações", icon: UserCircle },
        { key: "tickets" as const, label: `Chamados (${user.activity.assignedTickets.length})`, icon: Headset },
        { key: "maintenance" as const, label: `Manutenção (${user.activity.maintenanceOpened.length + user.activity.maintenanceClosed.length})`, icon: Wrench },
        { key: "logs" as const, label: `Atividades (${user.activity.auditLogs.length})`, icon: FileText },
    ];

    return (
        <div className="space-y-6">
            {/* Back + header */}
            <div className="flex items-center gap-4">
                <button onClick={() => router.push("/dashboard/colaboradores")}
                    className="flex items-center gap-1 text-sm text-[var(--zyllen-muted)] hover:text-white transition-colors">
                    <ArrowLeft size={16} /> Voltar
                </button>
            </div>

            {/* User header card */}
            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center size-16 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] font-bold text-2xl">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-bold text-white">{user.name}</h1>
                                <Badge variant={user.isActive ? "outline" : "destructive"}>
                                    {user.isActive ? "Ativo" : "Inativo"}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-[var(--zyllen-muted)]">
                                <span className="flex items-center gap-1"><Mail size={12} /> {user.email}</span>
                                <span className="flex items-center gap-1"><ShieldCheck size={12} /> {user.role.name}</span>
                                {user.sector && <span className="flex items-center gap-1"><Building size={12} /> {user.sector}</span>}
                                <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(user.createdAt).toLocaleDateString("pt-BR")}</span>
                            </div>
                        </div>
                        {canManage && !editing && (
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={startEdit}>
                                    <Pencil size={14} className="mr-1" /> Editar
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => { if (confirm("Resetar PIN?")) resetPin.mutate(); }}>
                                    <RotateCw size={14} className="mr-1" /> Reset PIN
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                    onClick={handleDelete}
                                    disabled={deleteUser.isPending}
                                >
                                    <Trash2 size={14} className="mr-1" /> Excluir
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-[var(--zyllen-border)]">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab.key
                                ? "border-[var(--zyllen-highlight)] text-[var(--zyllen-highlight)]"
                                : "border-transparent text-[var(--zyllen-muted)] hover:text-white"
                        }`}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === "info" && (
                <div className="space-y-4">
                    {editing ? (
                        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-highlight)]/30">
                            <CardHeader>
                                <CardTitle className="text-white text-lg">Editar Colaborador</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Nome</Label>
                                        <Input className={inputCls} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Email</Label>
                                        <Input className={inputCls} type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Nova Senha</Label>
                                        <Input className={inputCls} type="password" placeholder="Deixe vazio para manter" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Novo PIN (4 dígitos)</Label>
                                        <Input className={inputCls} placeholder="Deixe vazio para manter" value={editForm.pin} onChange={(e) => setEditForm({ ...editForm, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} maxLength={4} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Role</Label>
                                        <select className={`w-full h-10 rounded-md px-3 text-sm ${inputCls}`} value={editForm.roleId} onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}>
                                            {roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Setor</Label>
                                        <Input className={inputCls} placeholder="Ex: TI, RH" value={editForm.sector} onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="text-[var(--zyllen-muted)]">Descrição</Label>
                                        <textarea
                                            className="w-full rounded-md p-3 text-sm min-h-[80px] bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30"
                                            value={editForm.description}
                                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                                            <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} className="rounded" />
                                            Usuário Ativo
                                        </label>
                                    </div>
                                    <div className="md:col-span-2 flex gap-3">
                                        <Button variant="highlight" onClick={saveEdit} disabled={updateUser.isPending}>
                                            <Save size={14} className="mr-1" /> {updateUser.isPending ? "Salvando..." : "Salvar"}
                                        </Button>
                                        <Button variant="outline" onClick={() => setEditing(false)}>
                                            <X size={14} className="mr-1" /> Cancelar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                            <CardContent className="py-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InfoRow label="Nome" value={user.name} />
                                    <InfoRow label="Email" value={user.email} />
                                    <InfoRow label="Role" value={user.role.name} />
                                    <InfoRow label="Setor" value={user.sector || "—"} />
                                    <InfoRow label="Cadastrado em" value={new Date(user.createdAt).toLocaleDateString("pt-BR")} />
                                    <InfoRow label="Última atualização" value={new Date(user.updatedAt).toLocaleDateString("pt-BR")} />
                                    <div className="md:col-span-2">
                                        <InfoRow label="Descrição" value={user.description || "Sem descrição"} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {activeTab === "tickets" && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <CardTitle className="text-white text-base">Chamados Atribuídos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {user.activity.assignedTickets.length === 0 ? (
                            <p className="text-center py-8 text-[var(--zyllen-muted)]">{EMPTY_STATES.collabTickets}</p>
                        ) : (
                            <div className="space-y-2">
                                {user.activity.assignedTickets.map((t: any) => (
                                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                        <StatusIcon status={t.status} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">{t.title}</p>
                                            <p className="text-xs text-[var(--zyllen-muted)]">
                                                {t.company?.name} · {t.externalUser?.name} · {new Date(t.createdAt).toLocaleDateString("pt-BR")}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] shrink-0">{t.status}</Badge>
                                        <Badge variant="outline" className="text-[10px] shrink-0">{t.priority}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {activeTab === "maintenance" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader>
                            <CardTitle className="text-white text-base">OS Abertas por este colaborador</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {user.activity.maintenanceOpened.length === 0 ? (
                                <p className="text-center py-8 text-[var(--zyllen-muted)]">{EMPTY_STATES.collabMaintenanceOpen}</p>
                            ) : (
                                <div className="space-y-2">
                                    {user.activity.maintenanceOpened.map((os: any) => (
                                        <div key={os.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                            <Wrench size={16} className="text-[var(--zyllen-highlight)]" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">{os.asset?.sku?.name} — {os.asset?.assetCode}</p>
                                                <p className="text-xs text-[var(--zyllen-muted)]">{new Date(os.createdAt).toLocaleDateString("pt-BR")}</p>
                                            </div>
                                            <Badge variant="outline" className="text-[10px]">{os.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader>
                            <CardTitle className="text-white text-base">OS Encerradas por este colaborador</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {user.activity.maintenanceClosed.length === 0 ? (
                                <p className="text-center py-8 text-[var(--zyllen-muted)]">{EMPTY_STATES.collabMaintenanceClosed}</p>
                            ) : (
                                <div className="space-y-2">
                                    {user.activity.maintenanceClosed.map((os: any) => (
                                        <div key={os.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                            <CheckCircle2 size={16} className="text-[var(--zyllen-success)]" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">{os.asset?.sku?.name} — {os.asset?.assetCode}</p>
                                                <p className="text-xs text-[var(--zyllen-muted)]">{os.updatedAt ? new Date(os.updatedAt).toLocaleDateString("pt-BR") : ""}</p>
                                            </div>
                                            <Badge variant="outline" className="text-[10px]">{os.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === "logs" && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <CardTitle className="text-white text-base">Histórico de Atividades</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {user.activity.auditLogs.length === 0 ? (
                            <p className="text-center py-8 text-[var(--zyllen-muted)]">{EMPTY_STATES.collabActivities}</p>
                        ) : (
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {user.activity.auditLogs.map((log: any) => {
                                    let details: any = {};
                                    try { details = JSON.parse(log.details ?? "{}"); } catch { /* ignore */ }
                                    return (
                                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                            <div className="size-8 rounded-full bg-[var(--zyllen-highlight)]/10 flex items-center justify-center shrink-0">
                                                <FileText size={14} className="text-[var(--zyllen-highlight)]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white">
                                                    {AUDIT_ACTION_LABELS[log.action] ?? log.action}
                                                </p>
                                                <p className="text-xs text-[var(--zyllen-muted)]">
                                                    {log.entityType} · {new Date(log.createdAt).toLocaleString("pt-BR")}
                                                </p>
                                                {Object.keys(details).length > 0 && (
                                                    <p className="text-xs text-[var(--zyllen-muted)]/70 mt-1 font-mono">
                                                        {Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-[var(--zyllen-muted)] mb-1">{label}</p>
            <p className="text-sm text-white">{value}</p>
        </div>
    );
}

function StatusIcon({ status }: { status: string }) {
    switch (status) {
        case "OPEN": return <AlertCircle size={16} className="text-[var(--zyllen-warning)]" />;
        case "IN_PROGRESS": return <Clock size={16} className="text-[var(--zyllen-info)]" />;
        case "RESOLVED":
        case "CLOSED": return <CheckCircle2 size={16} className="text-[var(--zyllen-success)]" />;
        default: return <AlertCircle size={16} className="text-[var(--zyllen-muted)]" />;
    }
}
