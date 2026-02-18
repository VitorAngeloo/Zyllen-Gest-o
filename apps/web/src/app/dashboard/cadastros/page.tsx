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
import { Database, Layers, MapPin, Truck, Tag, Plus, Pencil, Trash2, X } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { EMPTY_STATES, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";

type Tab = "categories" | "skus" | "locations" | "suppliers" | "movementTypes";

export default function CadastrosPage() {
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("categories");

    // ─── Queries ────────────────────────
    const { data: categories, isLoading: loadingCats } = useQuery({
        queryKey: ["categories"],
        queryFn: () => apiClient.get<{ data: any[] }>("/catalog/categories", fetchOpts),
        enabled: tab === "categories" || tab === "skus",
    });
    const { data: skus, isLoading: loadingSkus } = useQuery({
        queryKey: ["skus"],
        queryFn: () => apiClient.get<{ data: any[] }>("/catalog/skus", fetchOpts),
        enabled: tab === "skus",
    });
    const { data: locations, isLoading: loadingLocs } = useQuery({
        queryKey: ["locations"],
        queryFn: () => apiClient.get<{ data: any[] }>("/locations", fetchOpts),
        enabled: tab === "locations",
    });
    const { data: suppliers, isLoading: loadingSups } = useQuery({
        queryKey: ["suppliers"],
        queryFn: () => apiClient.get<{ data: any[] }>("/suppliers", fetchOpts),
        enabled: tab === "suppliers",
    });
    const { data: movementTypes, isLoading: loadingMts } = useQuery({
        queryKey: ["movementTypes"],
        queryFn: () => apiClient.get<{ data: any[] }>("/inventory/movement-types", fetchOpts),
        enabled: tab === "movementTypes",
    });

    // ─── Create forms ──────────────────
    const [newCat, setNewCat] = useState("");
    const [newLoc, setNewLoc] = useState({ name: "", description: "" });
    const [newSup, setNewSup] = useState({ name: "", cnpj: "", contact: "" });
    const [newSku, setNewSku] = useState({ name: "", brand: "", barcode: "", categoryId: "" });
    const [newMt, setNewMt] = useState({ name: "", requiresApproval: false, isFinalWriteOff: false, setsAssetStatus: "", defaultToLocationId: "" });

    // ─── Edit dialogs ──────────────────
    const [editCat, setEditCat] = useState<any>(null);
    const [editLoc, setEditLoc] = useState<any>(null);
    const [editSup, setEditSup] = useState<any>(null);
    const [editSku, setEditSku] = useState<any>(null);
    const [editMt, setEditMt] = useState<any>(null);

    // ─── Delete confirm ────────────────
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);

    // ─── Mutations: Categories ─────────
    const createCat = useMutation({
        mutationFn: (name: string) => apiClient.post("/catalog/categories", { name }, fetchOpts),
        onSuccess: () => { toast.success("Categoria criada!"); qc.invalidateQueries({ queryKey: ["categories"] }); setNewCat(""); },
        onError: (e: any) => toast.error(e.message),
    });
    const updateCat = useMutation({
        mutationFn: (data: any) => apiClient.put(`/catalog/categories/${data.id}`, { name: data.name }, fetchOpts),
        onSuccess: () => { toast.success("Categoria atualizada!"); qc.invalidateQueries({ queryKey: ["categories"] }); setEditCat(null); },
        onError: (e: any) => toast.error(e.message),
    });
    const deleteCat = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/catalog/categories/${id}`, fetchOpts),
        onSuccess: () => { toast.success("Categoria excluída!"); qc.invalidateQueries({ queryKey: ["categories"] }); setDeleteConfirm(null); },
        onError: (e: any) => toast.error(e.message),
    });

    // ─── Mutations: SKUs ───────────────
    const createSku = useMutation({
        mutationFn: (data: any) => apiClient.post("/catalog/skus", data, fetchOpts),
        onSuccess: () => { toast.success("SKU criado!"); qc.invalidateQueries({ queryKey: ["skus"] }); setNewSku({ name: "", brand: "", barcode: "", categoryId: "" }); },
        onError: (e: any) => toast.error(e.message),
    });
    const updateSku = useMutation({
        mutationFn: (data: any) => apiClient.put(`/catalog/skus/${data.id}`, { name: data.name, brand: data.brand, barcode: data.barcode, categoryId: data.categoryId }, fetchOpts),
        onSuccess: () => { toast.success("SKU atualizado!"); qc.invalidateQueries({ queryKey: ["skus"] }); setEditSku(null); },
        onError: (e: any) => toast.error(e.message),
    });
    const deleteSku = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/catalog/skus/${id}`, fetchOpts),
        onSuccess: () => { toast.success("SKU excluído!"); qc.invalidateQueries({ queryKey: ["skus"] }); setDeleteConfirm(null); },
        onError: (e: any) => toast.error(e.message),
    });

    // ─── Mutations: Locations ──────────
    const createLoc = useMutation({
        mutationFn: (data: any) => apiClient.post("/locations", data, fetchOpts),
        onSuccess: () => { toast.success("Local criado!"); qc.invalidateQueries({ queryKey: ["locations"] }); setNewLoc({ name: "", description: "" }); },
        onError: (e: any) => toast.error(e.message),
    });
    const updateLoc = useMutation({
        mutationFn: (data: any) => apiClient.put(`/locations/${data.id}`, { name: data.name, description: data.description }, fetchOpts),
        onSuccess: () => { toast.success("Local atualizado!"); qc.invalidateQueries({ queryKey: ["locations"] }); setEditLoc(null); },
        onError: (e: any) => toast.error(e.message),
    });
    const deleteLoc = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/locations/${id}`, fetchOpts),
        onSuccess: () => { toast.success("Local excluído!"); qc.invalidateQueries({ queryKey: ["locations"] }); setDeleteConfirm(null); },
        onError: (e: any) => toast.error(e.message),
    });

    // ─── Mutations: Suppliers ──────────
    const createSup = useMutation({
        mutationFn: (data: any) => apiClient.post("/suppliers", data, fetchOpts),
        onSuccess: () => { toast.success("Fornecedor criado!"); qc.invalidateQueries({ queryKey: ["suppliers"] }); setNewSup({ name: "", cnpj: "", contact: "" }); },
        onError: (e: any) => toast.error(e.message),
    });
    const updateSup = useMutation({
        mutationFn: (data: any) => apiClient.put(`/suppliers/${data.id}`, { name: data.name, cnpj: data.cnpj, contact: data.contact }, fetchOpts),
        onSuccess: () => { toast.success("Fornecedor atualizado!"); qc.invalidateQueries({ queryKey: ["suppliers"] }); setEditSup(null); },
        onError: (e: any) => toast.error(e.message),
    });
    const deleteSup = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/suppliers/${id}`, fetchOpts),
        onSuccess: () => { toast.success("Fornecedor excluído!"); qc.invalidateQueries({ queryKey: ["suppliers"] }); setDeleteConfirm(null); },
        onError: (e: any) => toast.error(e.message),
    });

    // ─── Mutations: Movement Types ─────
    const createMt = useMutation({
        mutationFn: (data: any) => apiClient.post("/inventory/movement-types", data, fetchOpts),
        onSuccess: () => { toast.success("Tipo criado!"); qc.invalidateQueries({ queryKey: ["movementTypes"] }); setNewMt({ name: "", requiresApproval: false, isFinalWriteOff: false, setsAssetStatus: "", defaultToLocationId: "" }); },
        onError: (e: any) => toast.error(e.message),
    });
    const updateMt = useMutation({
        mutationFn: (data: any) => apiClient.put(`/inventory/movement-types/${data.id}`, { name: data.name, requiresApproval: data.requiresApproval, isFinalWriteOff: data.isFinalWriteOff, setsAssetStatus: data.setsAssetStatus || null, defaultToLocationId: data.defaultToLocationId || null }, fetchOpts),
        onSuccess: () => { toast.success("Tipo atualizado!"); qc.invalidateQueries({ queryKey: ["movementTypes"] }); setEditMt(null); },
        onError: (e: any) => toast.error(e.message),
    });
    const deleteMt = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/inventory/movement-types/${id}`, fetchOpts),
        onSuccess: () => { toast.success("Tipo excluído!"); qc.invalidateQueries({ queryKey: ["movementTypes"] }); setDeleteConfirm(null); },
        onError: (e: any) => toast.error(e.message),
    });

    const handleDelete = () => {
        if (!deleteConfirm) return;
        const { type, id } = deleteConfirm;
        if (type === "category") deleteCat.mutate(id);
        else if (type === "sku") deleteSku.mutate(id);
        else if (type === "location") deleteLoc.mutate(id);
        else if (type === "supplier") deleteSup.mutate(id);
        else if (type === "movementType") deleteMt.mutate(id);
    };

    const tabs = [
        { key: "categories", label: "Categorias", icon: Layers },
        { key: "skus", label: "SKUs", icon: Tag },
        { key: "locations", label: "Locais", icon: MapPin },
        { key: "suppliers", label: "Fornecedores", icon: Truck },
        { key: "movementTypes", label: "Tipos de Mov.", icon: Database },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Database className="text-[var(--zyllen-highlight)]" /> Cadastros
            </h1>
            <p className="text-sm text-[var(--zyllen-muted)] mt-1">{PAGE_DESCRIPTIONS.cadastros}</p>

            <div className="flex gap-1 bg-[var(--zyllen-bg)] rounded-xl p-1 border border-[var(--zyllen-border)] w-fit flex-wrap">
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

            {/* ═══ CATEGORIES ═══ */}
            {tab === "categories" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-md">
                        <CardContent className="pt-6">
                            <form onSubmit={(e) => { e.preventDefault(); createCat.mutate(newCat); }} className="flex gap-2">
                                <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nome da categoria..." required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                <Button type="submit" variant="highlight" disabled={createCat.isPending}><Plus size={16} /></Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardContent className="pt-6">
                            {categories?.data?.length ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {categories.data.map((c: any) => (
                                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50 text-white text-sm group">
                                            <span>{c.name}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditCat({ id: c.id, name: c.name })} className="p-1 hover:text-[var(--zyllen-highlight)]"><Pencil size={14} /></button>
                                                <button onClick={() => setDeleteConfirm({ type: "category", id: c.id, name: c.name })} className="p-1 hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-[var(--zyllen-muted)] text-center py-4">{EMPTY_STATES.categories}</p>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ SKUS ═══ */}
            {tab === "skus" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader><CardTitle className="text-white">Novo SKU</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={(e) => { e.preventDefault(); createSku.mutate(newSku); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Nome</Label>
                                    <Input value={newSku.name} onChange={(e) => setNewSku({ ...newSku, name: e.target.value })} placeholder="Nome do item..." required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Categoria</Label>
                                    <Select value={newSku.categoryId} onValueChange={(v) => setNewSku({ ...newSku, categoryId: v })} placeholder="Selecione..." className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" required>
                                        {categories?.data?.map((c: any) => <SelectOption key={c.id} value={c.id}>{c.name}</SelectOption>)}
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Marca</Label>
                                    <Input value={newSku.brand} onChange={(e) => setNewSku({ ...newSku, brand: e.target.value })} placeholder="Opcional" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Código de barras</Label>
                                    <Input value={newSku.barcode} onChange={(e) => setNewSku({ ...newSku, barcode: e.target.value })} placeholder="Opcional" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                </div>
                                <div className="md:col-span-2">
                                    <Button type="submit" variant="highlight" disabled={createSku.isPending} className="w-full">
                                        <Plus size={16} /> {createSku.isPending ? "Criando..." : "Criar SKU"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader><CardTitle className="text-white">SKUs Cadastrados</CardTitle></CardHeader>
                        <CardContent>
                            {skus?.data?.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--zyllen-border)]">
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Código</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Nome</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Categoria</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Marca</th>
                                                <th className="text-right py-3 text-[var(--zyllen-muted)] font-medium">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {skus.data.map((s: any) => (
                                                <tr key={s.id} className="border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02]">
                                                    <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{s.skuCode}</td>
                                                    <td className="py-3 text-white">{s.name}</td>
                                                    <td className="py-3 text-[var(--zyllen-muted)]">{s.category?.name}</td>
                                                    <td className="py-3 text-[var(--zyllen-muted)]">{s.brand ?? "—"}</td>
                                                    <td className="py-3 text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <button onClick={() => setEditSku({ id: s.id, name: s.name, brand: s.brand || "", barcode: s.barcode || "", categoryId: s.categoryId || s.category?.id || "" })} className="p-1 text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)]"><Pencil size={14} /></button>
                                                            <button onClick={() => setDeleteConfirm({ type: "sku", id: s.id, name: s.name })} className="p-1 text-[var(--zyllen-muted)] hover:text-red-400"><Trash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <p className="text-[var(--zyllen-muted)] text-center py-8">{EMPTY_STATES.skus}</p>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ LOCATIONS ═══ */}
            {tab === "locations" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-md">
                        <CardContent className="pt-6">
                            <form onSubmit={(e) => { e.preventDefault(); createLoc.mutate(newLoc); }} className="space-y-3">
                                <Input value={newLoc.name} onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })} placeholder="Nome do local..." required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                <div className="flex gap-2">
                                    <Input value={newLoc.description} onChange={(e) => setNewLoc({ ...newLoc, description: e.target.value })} placeholder="Descrição (opcional)" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                    <Button type="submit" variant="highlight" disabled={createLoc.isPending}><Plus size={16} /></Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardContent className="pt-6">
                            {locations?.data?.length ? (
                                <div className="space-y-2">
                                    {locations.data.map((l: any) => (
                                        <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50 group">
                                            <MapPin size={16} className="text-[var(--zyllen-highlight)]" />
                                            <div className="flex-1">
                                                <p className="text-white text-sm font-medium">{l.name}</p>
                                                {l.description && <p className="text-xs text-[var(--zyllen-muted)]">{l.description}</p>}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditLoc({ id: l.id, name: l.name, description: l.description || "" })} className="p-1 text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)]"><Pencil size={14} /></button>
                                                <button onClick={() => setDeleteConfirm({ type: "location", id: l.id, name: l.name })} className="p-1 text-[var(--zyllen-muted)] hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-[var(--zyllen-muted)] text-center py-4">{EMPTY_STATES.locations}</p>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ SUPPLIERS ═══ */}
            {tab === "suppliers" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-md">
                        <CardContent className="pt-6">
                            <form onSubmit={(e) => { e.preventDefault(); createSup.mutate(newSup); }} className="space-y-3">
                                <Input value={newSup.name} onChange={(e) => setNewSup({ ...newSup, name: e.target.value })} placeholder="Nome do fornecedor..." required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                <Input value={newSup.cnpj} onChange={(e) => setNewSup({ ...newSup, cnpj: e.target.value })} placeholder="CNPJ" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                <div className="flex gap-2">
                                    <Input value={newSup.contact} onChange={(e) => setNewSup({ ...newSup, contact: e.target.value })} placeholder="Contato (opcional)" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                    <Button type="submit" variant="highlight" disabled={createSup.isPending}><Plus size={16} /></Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardContent className="pt-6">
                            {suppliers?.data?.length ? (
                                <div className="space-y-2">
                                    {suppliers.data.map((s: any) => (
                                        <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50 group">
                                            <Truck size={16} className="text-[var(--zyllen-highlight)]" />
                                            <div className="flex-1">
                                                <p className="text-white text-sm font-medium">{s.name}</p>
                                                <p className="text-xs text-[var(--zyllen-muted)] font-mono">{s.cnpj}{s.contact ? ` · ${s.contact}` : ""}</p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditSup({ id: s.id, name: s.name, cnpj: s.cnpj || "", contact: s.contact || "" })} className="p-1 text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)]"><Pencil size={14} /></button>
                                                <button onClick={() => setDeleteConfirm({ type: "supplier", id: s.id, name: s.name })} className="p-1 text-[var(--zyllen-muted)] hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-[var(--zyllen-muted)] text-center py-4">{EMPTY_STATES.suppliers}</p>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ MOVEMENT TYPES ═══ */}
            {tab === "movementTypes" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-md">
                        <CardHeader><CardTitle className="text-white">Novo Tipo de Movimentação</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={(e) => { e.preventDefault(); createMt.mutate(newMt); }} className="space-y-3">
                                <Input value={newMt.name} onChange={(e) => setNewMt({ ...newMt, name: e.target.value })} placeholder="Nome do tipo..." required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] cursor-pointer">
                                        <input type="checkbox" checked={newMt.requiresApproval} onChange={(e) => setNewMt({ ...newMt, requiresApproval: e.target.checked })} className="accent-[var(--zyllen-highlight)]" />
                                        Requer Aprovação
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] cursor-pointer">
                                        <input type="checkbox" checked={newMt.isFinalWriteOff} onChange={(e) => setNewMt({ ...newMt, isFinalWriteOff: e.target.checked })} className="accent-[var(--zyllen-highlight)]" />
                                        Baixa Final
                                    </label>
                                </div>
                                <Button type="submit" variant="highlight" disabled={createMt.isPending} className="w-full">
                                    <Plus size={16} /> {createMt.isPending ? "Criando..." : "Criar Tipo"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader><CardTitle className="text-white">Tipos de Movimentação</CardTitle></CardHeader>
                        <CardContent>
                            {movementTypes?.data?.length ? (
                                <div className="space-y-2">
                                    {movementTypes.data.map((t: any) => (
                                        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50 group">
                                            <div className="flex items-center gap-3">
                                                <span className="text-white text-sm">{t.name}</span>
                                                <Badge variant={t.requiresApproval ? "warning" : "success"}>
                                                    {t.requiresApproval ? "Requer Aprovação" : "Automático"}
                                                </Badge>
                                                {t.isFinalWriteOff && <Badge variant="destructive">Baixa</Badge>}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditMt({ id: t.id, name: t.name, requiresApproval: t.requiresApproval, isFinalWriteOff: t.isFinalWriteOff, setsAssetStatus: t.setsAssetStatus || "", defaultToLocationId: t.defaultToLocationId || "" })} className="p-1 text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)]"><Pencil size={14} /></button>
                                                <button onClick={() => setDeleteConfirm({ type: "movementType", id: t.id, name: t.name })} className="p-1 text-[var(--zyllen-muted)] hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-[var(--zyllen-muted)] text-center py-4">{EMPTY_STATES.movementTypes}</p>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ EDIT DIALOGS ═══ */}
            {/* Edit Category */}
            <Dialog open={!!editCat} onOpenChange={(o) => !o && setEditCat(null)}>
                <DialogContent onClose={() => setEditCat(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Editar Categoria</DialogTitle></DialogHeader>
                    <DialogBody>
                        <Input value={editCat?.name || ""} onChange={(e) => setEditCat({ ...editCat, name: e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditCat(null)}>Cancelar</Button>
                        <Button variant="highlight" onClick={() => updateCat.mutate(editCat)} disabled={updateCat.isPending}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit SKU */}
            <Dialog open={!!editSku} onOpenChange={(o) => !o && setEditSku(null)}>
                <DialogContent onClose={() => setEditSku(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Editar SKU</DialogTitle></DialogHeader>
                    <DialogBody>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Nome</Label>
                                <Input value={editSku?.name || ""} onChange={(e) => setEditSku({ ...editSku, name: e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Categoria</Label>
                                <Select value={editSku?.categoryId || ""} onValueChange={(v) => setEditSku({ ...editSku, categoryId: v })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white">
                                    {categories?.data?.map((c: any) => <SelectOption key={c.id} value={c.id}>{c.name}</SelectOption>)}
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Marca</Label>
                                <Input value={editSku?.brand || ""} onChange={(e) => setEditSku({ ...editSku, brand: e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Código de barras</Label>
                                <Input value={editSku?.barcode || ""} onChange={(e) => setEditSku({ ...editSku, barcode: e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditSku(null)}>Cancelar</Button>
                        <Button variant="highlight" onClick={() => updateSku.mutate(editSku)} disabled={updateSku.isPending}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Location */}
            <Dialog open={!!editLoc} onOpenChange={(o) => !o && setEditLoc(null)}>
                <DialogContent onClose={() => setEditLoc(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Editar Local</DialogTitle></DialogHeader>
                    <DialogBody>
                        <div className="space-y-4">
                            <Input value={editLoc?.name || ""} onChange={(e) => setEditLoc({ ...editLoc, name: e.target.value })} placeholder="Nome" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            <Input value={editLoc?.description || ""} onChange={(e) => setEditLoc({ ...editLoc, description: e.target.value })} placeholder="Descrição" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditLoc(null)}>Cancelar</Button>
                        <Button variant="highlight" onClick={() => updateLoc.mutate(editLoc)} disabled={updateLoc.isPending}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Supplier */}
            <Dialog open={!!editSup} onOpenChange={(o) => !o && setEditSup(null)}>
                <DialogContent onClose={() => setEditSup(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Editar Fornecedor</DialogTitle></DialogHeader>
                    <DialogBody>
                        <div className="space-y-4">
                            <Input value={editSup?.name || ""} onChange={(e) => setEditSup({ ...editSup, name: e.target.value })} placeholder="Nome" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            <Input value={editSup?.cnpj || ""} onChange={(e) => setEditSup({ ...editSup, cnpj: e.target.value })} placeholder="CNPJ" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            <Input value={editSup?.contact || ""} onChange={(e) => setEditSup({ ...editSup, contact: e.target.value })} placeholder="Contato" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditSup(null)}>Cancelar</Button>
                        <Button variant="highlight" onClick={() => updateSup.mutate(editSup)} disabled={updateSup.isPending}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Movement Type */}
            <Dialog open={!!editMt} onOpenChange={(o) => !o && setEditMt(null)}>
                <DialogContent onClose={() => setEditMt(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Editar Tipo de Movimentação</DialogTitle></DialogHeader>
                    <DialogBody>
                        <div className="space-y-4">
                            <Input value={editMt?.name || ""} onChange={(e) => setEditMt({ ...editMt, name: e.target.value })} placeholder="Nome" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] cursor-pointer">
                                    <input type="checkbox" checked={editMt?.requiresApproval || false} onChange={(e) => setEditMt({ ...editMt, requiresApproval: e.target.checked })} className="accent-[var(--zyllen-highlight)]" />
                                    Requer Aprovação
                                </label>
                                <label className="flex items-center gap-2 text-sm text-[var(--zyllen-muted)] cursor-pointer">
                                    <input type="checkbox" checked={editMt?.isFinalWriteOff || false} onChange={(e) => setEditMt({ ...editMt, isFinalWriteOff: e.target.checked })} className="accent-[var(--zyllen-highlight)]" />
                                    Baixa Final
                                </label>
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditMt(null)}>Cancelar</Button>
                        <Button variant="highlight" onClick={() => updateMt.mutate(editMt)} disabled={updateMt.isPending}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ DELETE CONFIRMATION ═══ */}
            <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
                <DialogContent onClose={() => setDeleteConfirm(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
                    <DialogBody>
                        <p className="text-[var(--zyllen-muted)]">
                            Tem certeza que deseja excluir <strong className="text-white">{deleteConfirm?.name}</strong>? Esta ação não pode ser desfeita.
                        </p>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
