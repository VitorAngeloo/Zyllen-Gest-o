"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
    UserCircle, Mail, Building, Calendar, ShieldCheck,
    Pencil, Save, X, Headset, Wrench, FileText, Clock,
    CheckCircle2, AlertCircle, Key, ArrowLeft, Users,
} from "lucide-react";
import { EMPTY_STATES, TOASTS } from "@web/lib/brand-voice";

interface ProfileData {
    id: string;
    name: string;
    email: string;
    sector: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    role: { id: string; name: string };
    permissions: string[];
    activity: {
        assignedTickets: any[];
        maintenanceOpened: any[];
        maintenanceClosed: any[];
        auditLogs: any[];
    };
}

export default function PerfilPage() {
    const fetchOpts = useAuthedFetch();
    const router = useRouter();
    const qc = useQueryClient();
    const { user: authUser } = useAuth();

    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", currentPassword: "", newPassword: "", pin: "" });
    const [activeTab, setActiveTab] = useState<"info" | "tickets" | "maintenance" | "logs">("info");

    const { data: profileRes, isLoading } = useQuery({
        queryKey: ["my-profile"],
        queryFn: () => apiClient.get<{ data: ProfileData }>("/auth/me/profile", fetchOpts),
    });

    const updateProfile = useMutation({
        mutationFn: (data: any) => apiClient.put("/auth/me/profile", data, fetchOpts),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["my-profile"] });
            setEditing(false);
            toast.success(TOASTS.profileUpdated);
        },
        onError: (err: any) => toast.error(err.message || "Erro ao atualizar perfil"),
    });

    const profile = profileRes?.data;

    if (isLoading) {
        return <div className="text-center py-20 text-[var(--zyllen-muted)]">Carregando...</div>;
    }

    if (!profile) {
        return <div className="text-center py-20 text-[var(--zyllen-muted)]">Erro ao carregar perfil</div>;
    }

    const inputCls = "bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white placeholder:text-[var(--zyllen-muted)]/50 focus-visible:ring-[var(--zyllen-highlight)]/30 focus-visible:border-[var(--zyllen-highlight)]";

    const startEdit = () => {
        setEditForm({ name: profile.name, currentPassword: "", newPassword: "", pin: "" });
        setEditing(true);
    };

    const saveEdit = () => {
        const payload: any = {};
        if (editForm.name && editForm.name !== profile.name) payload.name = editForm.name;
        if (editForm.newPassword) {
            if (!editForm.currentPassword) {
                toast.error("Informe a senha atual para alterar a senha");
                return;
            }
            payload.currentPassword = editForm.currentPassword;
            payload.password = editForm.newPassword;
        }
        if (editForm.pin) {
            if (!editForm.currentPassword) {
                toast.error("Informe a senha atual para alterar o PIN");
                return;
            }
            payload.currentPassword = editForm.currentPassword;
            payload.pin = editForm.pin;
        }
        if (Object.keys(payload).length === 0) {
            setEditing(false);
            return;
        }
        updateProfile.mutate(payload);
    };

    const TABS = [
        { key: "info" as const, label: "Meu Perfil", icon: UserCircle },
        { key: "tickets" as const, label: `Chamados (${profile.activity.assignedTickets.length})`, icon: Headset },
        { key: "maintenance" as const, label: `Manutenção (${profile.activity.maintenanceOpened.length + profile.activity.maintenanceClosed.length})`, icon: Wrench },
        { key: "logs" as const, label: `Atividades (${profile.activity.auditLogs.length})`, icon: FileText },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-1 text-sm text-[var(--zyllen-muted)] hover:text-white transition-colors">
                    <ArrowLeft size={16} /> Dashboard
                </button>
                <span className="text-[var(--zyllen-border)]">|</span>
                <button onClick={() => router.push("/dashboard/colaboradores")}
                    className="flex items-center gap-1 text-sm text-[var(--zyllen-muted)] hover:text-white transition-colors">
                    <Users size={16} /> Colaboradores
                </button>
            </div>

            {/* Header card */}
            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                <CardContent className="py-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center size-16 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] font-bold text-2xl">
                            {profile.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-white">{profile.name}</h1>
                            <div className="flex items-center gap-4 mt-1 text-sm text-[var(--zyllen-muted)]">
                                <span className="flex items-center gap-1"><Mail size={12} /> {profile.email}</span>
                                <span className="flex items-center gap-1"><ShieldCheck size={12} /> {profile.role.name}</span>
                                {profile.sector && <span className="flex items-center gap-1"><Building size={12} /> {profile.sector}</span>}
                                <span className="flex items-center gap-1"><Calendar size={12} /> Desde {new Date(profile.createdAt).toLocaleDateString("pt-BR")}</span>
                            </div>
                        </div>
                        {!editing && (
                            <Button variant="outline" size="sm" onClick={startEdit}>
                                <Pencil size={14} className="mr-1" /> Editar Perfil
                            </Button>
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

            {/* Info tab */}
            {activeTab === "info" && (
                <div className="space-y-4">
                    {editing ? (
                        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-highlight)]/30">
                            <CardHeader>
                                <CardTitle className="text-white text-lg">Editar Perfil</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Nome</Label>
                                        <Input className={inputCls} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Email</Label>
                                        <Input className={inputCls} value={profile.email} disabled />
                                        <p className="text-xs text-[var(--zyllen-muted)]">Contate um admin para alterar</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Nova Senha</Label>
                                        <Input className={inputCls} type="password" placeholder="Deixe vazio para manter" value={editForm.newPassword} onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Novo PIN (4 dígitos)</Label>
                                        <Input className={inputCls} placeholder="Deixe vazio para manter" value={editForm.pin} onChange={(e) => setEditForm({ ...editForm, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} maxLength={4} />
                                    </div>
                                    <div className="md:col-span-2 flex gap-3">
                                        <Button variant="highlight" onClick={saveEdit} disabled={updateProfile.isPending}>
                                            <Save size={14} className="mr-1" /> {updateProfile.isPending ? "Salvando..." : "Salvar"}
                                        </Button>
                                        <Button variant="outline" onClick={() => setEditing(false)}>
                                            <X size={14} className="mr-1" /> Cancelar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                                <CardHeader><CardTitle className="text-white text-base">Dados Pessoais</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <InfoRow label="Nome" value={profile.name} />
                                    <InfoRow label="Email" value={profile.email} />
                                    <InfoRow label="Setor" value={profile.sector || "—"} />
                                    <InfoRow label="Descrição" value={profile.description || "—"} />
                                </CardContent>
                            </Card>
                            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                                <CardHeader><CardTitle className="text-white text-base">Acesso</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <InfoRow label="Role" value={profile.role.name} />
                                    <InfoRow label="Status" value={profile.isActive ? "Ativo" : "Inativo"} />
                                    <InfoRow label="Membro desde" value={new Date(profile.createdAt).toLocaleDateString("pt-BR")} />
                                    <div>
                                        <p className="text-xs text-[var(--zyllen-muted)] mb-2">Permissões</p>
                                        <div className="flex flex-wrap gap-1">
                                            {(profile.permissions ?? []).map((p) => (
                                                <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Summary cards */}
                    {!editing && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <SummaryCard icon={Headset} label="Chamados" count={profile.activity.assignedTickets.length} color="var(--zyllen-info)" />
                            <SummaryCard icon={Wrench} label="OS Abertas" count={profile.activity.maintenanceOpened.length} color="var(--zyllen-warning)" />
                            <SummaryCard icon={CheckCircle2} label="OS Encerradas" count={profile.activity.maintenanceClosed.length} color="var(--zyllen-success)" />
                            <SummaryCard icon={FileText} label="Atividades" count={profile.activity.auditLogs.length} color="var(--zyllen-highlight)" />
                        </div>
                    )}
                </div>
            )}

            {/* Tickets tab */}
            {activeTab === "tickets" && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader><CardTitle className="text-white text-base">Meus Chamados</CardTitle></CardHeader>
                    <CardContent>
                        {profile.activity.assignedTickets.length === 0 ? (
                            <p className="text-center py-8 text-[var(--zyllen-muted)]">{EMPTY_STATES.profileTickets}</p>
                        ) : (
                            <div className="space-y-2">
                                {profile.activity.assignedTickets.map((t: any) => (
                                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                        <StatusIcon status={t.status} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">{t.title}</p>
                                            <p className="text-xs text-[var(--zyllen-muted)]">
                                                {t.company?.name} · {new Date(t.createdAt).toLocaleDateString("pt-BR")}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                                        <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Maintenance tab */}
            {activeTab === "maintenance" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader><CardTitle className="text-white text-base">OS Abertas por mim</CardTitle></CardHeader>
                        <CardContent>
                            {profile.activity.maintenanceOpened.length === 0 ? (
                                <p className="text-center py-8 text-[var(--zyllen-muted)]">{EMPTY_STATES.profileMaintenance}</p>
                            ) : (
                                <div className="space-y-2">
                                    {profile.activity.maintenanceOpened.map((os: any) => (
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
                        <CardHeader><CardTitle className="text-white text-base">OS Encerradas por mim</CardTitle></CardHeader>
                        <CardContent>
                            {profile.activity.maintenanceClosed.length === 0 ? (
                                <p className="text-center py-8 text-[var(--zyllen-muted)]">{EMPTY_STATES.profileMaintenance}</p>
                            ) : (
                                <div className="space-y-2">
                                    {profile.activity.maintenanceClosed.map((os: any) => (
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

            {/* Logs tab */}
            {activeTab === "logs" && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader><CardTitle className="text-white text-base">Minhas Atividades</CardTitle></CardHeader>
                    <CardContent>
                        {profile.activity.auditLogs.length === 0 ? (
                            <p className="text-center py-8 text-[var(--zyllen-muted)]">{EMPTY_STATES.profileActivities}</p>
                        ) : (
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {profile.activity.auditLogs.map((log: any) => {
                                    let details: any = {};
                                    try { details = JSON.parse(log.details ?? "{}"); } catch { /* */ }
                                    return (
                                        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                            <div className="size-8 rounded-full bg-[var(--zyllen-highlight)]/10 flex items-center justify-center shrink-0">
                                                <FileText size={14} className="text-[var(--zyllen-highlight)]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white">{log.action}</p>
                                                <p className="text-xs text-[var(--zyllen-muted)]">
                                                    {log.entityType} · {new Date(log.createdAt).toLocaleString("pt-BR")}
                                                </p>
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
            <p className="text-xs text-[var(--zyllen-muted)] mb-0.5">{label}</p>
            <p className="text-sm text-white">{value}</p>
        </div>
    );
}

function SummaryCard({ icon: Icon, label, count, color }: { icon: any; label: string; count: number; color: string }) {
    return (
        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
            <CardContent className="py-4 flex items-center gap-3">
                <div className="size-10 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
                    <Icon size={20} style={{ color }} />
                </div>
                <div>
                    <p className="text-lg font-bold text-white">{count}</p>
                    <p className="text-xs text-[var(--zyllen-muted)]">{label}</p>
                </div>
            </CardContent>
        </Card>
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
