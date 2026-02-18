"use client";
import { useState } from "react";
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
import { toast } from "sonner";
import { Building2, Users, Plus, Pencil, Trash2, UserPlus } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { EMPTY_STATES, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";

type Tab = "companies" | "users";

export default function ClientesPage() {
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("companies");

    // ─── Company form ───────────────────
    const [newCompany, setNewCompany] = useState({ name: "", cnpj: "", address: "", phone: "" });
    const [editCompany, setEditCompany] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

    // ─── User form ──────────────────────
    const [newUser, setNewUser] = useState({ name: "", email: "", password: "", companyId: "" });

    // ─── Queries ────────────────────────
    const { data: companies, isLoading: loadingCompanies } = useQuery({
        queryKey: ["companies"],
        queryFn: () => apiClient.get<{ data: any[] }>("/clients/companies", fetchOpts),
    });

    const { data: externalUsers, isLoading: loadingUsers } = useQuery({
        queryKey: ["external-users"],
        queryFn: () => apiClient.get<{ data: any[] }>("/clients/users", fetchOpts),
        enabled: tab === "users",
    });

    // ─── Mutations: Companies ───────────
    const createCompany = useMutation({
        mutationFn: (data: any) => apiClient.post("/clients/companies", data, fetchOpts),
        onSuccess: () => { toast.success("Empresa criada!"); qc.invalidateQueries({ queryKey: ["companies"] }); setNewCompany({ name: "", cnpj: "", address: "", phone: "" }); },
        onError: (e: any) => toast.error(e.message),
    });

    const updateCompany = useMutation({
        mutationFn: (data: any) => apiClient.put(`/clients/companies/${data.id}`, { name: data.name, cnpj: data.cnpj, address: data.address, phone: data.phone }, fetchOpts),
        onSuccess: () => { toast.success("Empresa atualizada!"); qc.invalidateQueries({ queryKey: ["companies"] }); setEditCompany(null); },
        onError: (e: any) => toast.error(e.message),
    });

    const deleteCompany = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/clients/companies/${id}`, fetchOpts),
        onSuccess: () => { toast.success("Empresa excluída!"); qc.invalidateQueries({ queryKey: ["companies"] }); setDeleteConfirm(null); },
        onError: (e: any) => toast.error(e.message),
    });

    // ─── Mutations: Users ───────────────
    const createUser = useMutation({
        mutationFn: (data: any) => apiClient.post("/clients/users", data, fetchOpts),
        onSuccess: () => { toast.success("Usuário externo criado!"); qc.invalidateQueries({ queryKey: ["external-users"] }); setNewUser({ name: "", email: "", password: "", companyId: "" }); },
        onError: (e: any) => toast.error(e.message),
    });

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

            {/* ═══ COMPANIES ═══ */}
            {tab === "companies" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-lg">
                        <CardHeader><CardTitle className="text-white">Nova Empresa</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={(e) => { e.preventDefault(); createCompany.mutate(newCompany); }} className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2 col-span-2">
                                        <Label className="text-[var(--zyllen-muted)]">Nome</Label>
                                        <Input value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} placeholder="Razão social..." required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">CNPJ</Label>
                                        <Input value={newCompany.cnpj} onChange={(e) => setNewCompany({ ...newCompany, cnpj: e.target.value })} placeholder="00.000.000/0000-00" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Telefone</Label>
                                        <Input value={newCompany.phone} onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })} placeholder="(00) 0000-0000" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label className="text-[var(--zyllen-muted)]">Endereço</Label>
                                        <Input value={newCompany.address} onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })} placeholder="Endereço completo" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                    </div>
                                </div>
                                <Button type="submit" variant="highlight" className="w-full" disabled={createCompany.isPending}>
                                    <Plus size={16} /> {createCompany.isPending ? "Criando..." : "Criar Empresa"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

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
                                                    {c.phone ? ` · ${c.phone}` : ""}
                                                </p>
                                                {c.address && <p className="text-xs text-[var(--zyllen-muted)]">{c.address}</p>}
                                            </div>
                                            <Badge variant="outline" className="text-[var(--zyllen-highlight)] border-[var(--zyllen-highlight)]/30">
                                                {c._count?.externalUsers ?? 0} users
                                            </Badge>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditCompany({ id: c.id, name: c.name, cnpj: c.cnpj || "", address: c.address || "", phone: c.phone || "" })} className="p-1 text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)]"><Pencil size={14} /></button>
                                                <button onClick={() => setDeleteConfirm(c)} className="p-1 text-[var(--zyllen-muted)] hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <div className="text-center py-12"><Building2 size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/50" /><p className="text-[var(--zyllen-muted)]">{EMPTY_STATES.companies}</p></div>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ EXTERNAL USERS ═══ */}
            {tab === "users" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-lg">
                        <CardHeader><CardTitle className="text-white flex items-center gap-2"><UserPlus size={18} /> Novo Usuário Externo</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={(e) => { e.preventDefault(); createUser.mutate(newUser); }} className="space-y-3">
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Nome</Label>
                                    <Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Nome completo" required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Email</Label>
                                    <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="email@empresa.com" required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Senha</Label>
                                    <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Mínimo 6 caracteres" required minLength={6} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Empresa</Label>
                                    <Select value={newUser.companyId} onValueChange={(v) => setNewUser({ ...newUser, companyId: v })} placeholder="Selecione a empresa..." className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" required>
                                        {companies?.data?.map((c: any) => <SelectOption key={c.id} value={c.id}>{c.name}</SelectOption>)}
                                    </Select>
                                </div>
                                <Button type="submit" variant="highlight" className="w-full" disabled={createUser.isPending}>
                                    <UserPlus size={16} /> {createUser.isPending ? "Criando..." : "Criar Usuário"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader><CardTitle className="text-white">Usuários Externos</CardTitle></CardHeader>
                        <CardContent>
                            {loadingUsers ? (
                                <div className="space-y-2">
                                    {[...Array(3)].map((_, i) => (
                                        <Skeleton key={i} className="h-14 w-full rounded-lg" />
                                    ))}
                                </div>
                            ) : externalUsers?.data?.length ? (
                                <div className="space-y-2">
                                    {externalUsers.data.map((u: any) => (
                                        <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                            <div className="flex items-center justify-center size-8 rounded-full bg-blue-400/20 text-blue-400 font-bold text-xs">
                                                {u.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate">{u.name}</p>
                                                <p className="text-xs text-[var(--zyllen-muted)] truncate">{u.email}</p>
                                            </div>
                                            <Badge variant="outline" className="text-xs">{u.company?.name}</Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : <div className="text-center py-12"><Users size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/50" /><p className="text-[var(--zyllen-muted)]">{EMPTY_STATES.externalUsers}</p></div>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ EDIT COMPANY ═══ */}
            <Dialog open={!!editCompany} onOpenChange={(o) => !o && setEditCompany(null)}>
                <DialogContent onClose={() => setEditCompany(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Editar Empresa</DialogTitle></DialogHeader>
                    <DialogBody>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Nome</Label>
                                <Input value={editCompany?.name || ""} onChange={(e) => setEditCompany({ ...editCompany, name: e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">CNPJ</Label>
                                <Input value={editCompany?.cnpj || ""} onChange={(e) => setEditCompany({ ...editCompany, cnpj: e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Telefone</Label>
                                <Input value={editCompany?.phone || ""} onChange={(e) => setEditCompany({ ...editCompany, phone: e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Endereço</Label>
                                <Input value={editCompany?.address || ""} onChange={(e) => setEditCompany({ ...editCompany, address: e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditCompany(null)}>Cancelar</Button>
                        <Button variant="highlight" onClick={() => updateCompany.mutate(editCompany)} disabled={updateCompany.isPending}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ DELETE CONFIRM ═══ */}
            <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
                <DialogContent onClose={() => setDeleteConfirm(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
                    <DialogBody>
                        <p className="text-[var(--zyllen-muted)]">
                            Excluir empresa <strong className="text-white">{deleteConfirm?.name}</strong>? Todos os usuários associados serão afetados.
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
