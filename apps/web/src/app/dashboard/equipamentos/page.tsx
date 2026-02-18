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
import { Package, Layers, MapPin, Plus, Pencil, Trash2, Search, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { EMPTY_STATES, TOASTS, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";

type Tab = "estoque" | "categorias" | "locais";

interface EquipmentItem {
    id: string;
    skuCode: string;
    name: string;
    description?: string;
    brand?: string;
    barcode?: string;
    category: { id: string; name: string };
    totalAssets: number;
    totalStock: number;
    locations: { locationId: string; locationName: string; quantity: number }[];
    createdAt: string;
}

export default function EquipamentosPage() {
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("estoque");
    const [search, setSearch] = useState("");
    const [expandedSku, setExpandedSku] = useState<string | null>(null);

    // ─── Queries ──────────────────────────────────
    const { data: equipment, isLoading: loadingEquipment } = useQuery({
        queryKey: ["equipment-summary", search],
        queryFn: () => apiClient.get<{ data: EquipmentItem[]; total: number }>(`/assets/summary${search ? `?search=${encodeURIComponent(search)}` : ""}`, fetchOpts),
        enabled: tab === "estoque",
    });
    const { data: categories, isLoading: loadingCats } = useQuery({
        queryKey: ["categories"],
        queryFn: () => apiClient.get<{ data: any[] }>("/catalog/categories", fetchOpts),
        enabled: tab === "categorias" || tab === "estoque",
    });
    const { data: locations, isLoading: loadingLocs } = useQuery({
        queryKey: ["locations"],
        queryFn: () => apiClient.get<{ data: any[] }>("/locations", fetchOpts),
        enabled: tab === "locais" || tab === "estoque",
    });

    // ─── Equipment Registration Form ──────────────
    const [newEquip, setNewEquip] = useState({
        name: "", description: "", brand: "", barcode: "", categoryId: "", locationId: "", quantity: 1,
    });

    // ─── Category Form ────────────────────────────
    const [newCat, setNewCat] = useState("");
    const [editCat, setEditCat] = useState<any>(null);

    // ─── Location Form ────────────────────────────
    const [newLoc, setNewLoc] = useState({ name: "", description: "" });
    const [editLoc, setEditLoc] = useState<any>(null);

    // ─── Delete confirm ───────────────────────────
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);

    // ─── Detail dialog ────────────────────────────
    const [detailSku, setDetailSku] = useState<EquipmentItem | null>(null);

    // ═══ MUTATIONS ═══

    // Bulk Equipment Registration
    const registerEquip = useMutation({
        mutationFn: (data: typeof newEquip) => apiClient.post("/assets/bulk", {
            ...data,
            quantity: Number(data.quantity),
        }, fetchOpts),
        onSuccess: (res: any) => {
            toast.success(TOASTS.equipmentRegistered(res.data?.assetsCreated ?? 0));
            qc.invalidateQueries({ queryKey: ["equipment-summary"] });
            qc.invalidateQueries({ queryKey: ["skus"] });
            qc.invalidateQueries({ queryKey: ["assets"] });
            setNewEquip({ name: "", description: "", brand: "", barcode: "", categoryId: "", locationId: "", quantity: 1 });
        },
        onError: (e: any) => toast.error(e.message),
    });

    // Categories
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

    // Locations
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

    const handleDelete = () => {
        if (!deleteConfirm) return;
        const { type, id } = deleteConfirm;
        if (type === "category") deleteCat.mutate(id);
        else if (type === "location") deleteLoc.mutate(id);
    };

    const tabs = [
        { key: "estoque", label: "Estoque", icon: Package },
        { key: "categorias", label: "Categorias", icon: Layers },
        { key: "locais", label: "Locais", icon: MapPin },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Package className="text-[var(--zyllen-highlight)]" /> Equipamentos
            </h1>
            <p className="text-sm text-[var(--zyllen-muted)] mt-1">{PAGE_DESCRIPTIONS.equipamentos}</p>

            {/* Tabs */}
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

            {/* ═══ ESTOQUE TAB ═══ */}
            {tab === "estoque" && (
                <div className="space-y-6">
                    {/* Registration Form */}
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Plus size={18} className="text-[var(--zyllen-highlight)]" /> Cadastrar Equipamento
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    registerEquip.mutate(newEquip);
                                }}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                            >
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Nome do Equipamento *</Label>
                                    <Input
                                        value={newEquip.name}
                                        onChange={(e) => setNewEquip({ ...newEquip, name: e.target.value })}
                                        placeholder="Ex: Monitor Dell 24''"
                                        required
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Descrição</Label>
                                    <Input
                                        value={newEquip.description}
                                        onChange={(e) => setNewEquip({ ...newEquip, description: e.target.value })}
                                        placeholder="Breve descrição do produto..."
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Categoria *</Label>
                                    <Select
                                        value={newEquip.categoryId}
                                        onValueChange={(v) => setNewEquip({ ...newEquip, categoryId: v })}
                                        placeholder="Selecione..."
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                        required
                                    >
                                        {categories?.data?.map((c: any) => (
                                            <SelectOption key={c.id} value={c.id}>{c.name}</SelectOption>
                                        ))}
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Local *</Label>
                                    <Select
                                        value={newEquip.locationId}
                                        onValueChange={(v) => setNewEquip({ ...newEquip, locationId: v })}
                                        placeholder="Selecione..."
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                        required
                                    >
                                        {locations?.data?.map((l: any) => (
                                            <SelectOption key={l.id} value={l.id}>{l.name}</SelectOption>
                                        ))}
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Quantidade *</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={newEquip.quantity}
                                        onChange={(e) => setNewEquip({ ...newEquip, quantity: parseInt(e.target.value) || 1 })}
                                        required
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Código de Barras</Label>
                                    <Input
                                        value={newEquip.barcode}
                                        onChange={(e) => setNewEquip({ ...newEquip, barcode: e.target.value })}
                                        placeholder="Código de barras original"
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Marca</Label>
                                    <Input
                                        value={newEquip.brand}
                                        onChange={(e) => setNewEquip({ ...newEquip, brand: e.target.value })}
                                        placeholder="Opcional"
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    />
                                </div>
                                <div className="flex items-end lg:col-span-2">
                                    <Button type="submit" variant="highlight" disabled={registerEquip.isPending} className="w-full">
                                        <Plus size={16} /> {registerEquip.isPending ? "Cadastrando..." : "Cadastrar Equipamento"}
                                    </Button>
                                </div>
                            </form>
                            <p className="text-xs text-[var(--zyllen-muted)] mt-3">
                                * O sistema gera automaticamente o código SKU e os códigos de patrimônio (SKY-XXXXX) para cada unidade.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Search */}
                    <div className="relative max-w-md">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nome, SKU, descrição ou código de barras..."
                            className="pl-9 bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] text-white"
                        />
                    </div>

                    {/* Equipment Table */}
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader>
                            <CardTitle className="text-white">Equipamentos Cadastrados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingEquipment ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-14 w-full rounded-lg" />
                                    ))}
                                </div>
                            ) : equipment?.data?.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--zyllen-border)]">
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">SKU</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Nome</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium hidden md:table-cell">Descrição</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium hidden lg:table-cell">Categoria</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium hidden lg:table-cell">Marca</th>
                                                <th className="text-center py-3 text-[var(--zyllen-muted)] font-medium">Patrimônios</th>
                                                <th className="text-center py-3 text-[var(--zyllen-muted)] font-medium">Estoque</th>
                                                <th className="text-center py-3 text-[var(--zyllen-muted)] font-medium">Locais</th>
                                                <th className="text-right py-3 text-[var(--zyllen-muted)] font-medium">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {equipment.data.map((item) => (
                                                <>
                                                    <tr
                                                        key={item.id}
                                                        className="border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02] cursor-pointer"
                                                        onClick={() => setExpandedSku(expandedSku === item.id ? null : item.id)}
                                                    >
                                                        <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{item.skuCode}</td>
                                                        <td className="py-3 text-white font-medium">{item.name}</td>
                                                        <td className="py-3 text-[var(--zyllen-muted)] hidden md:table-cell text-xs max-w-[200px] truncate">{item.description || "—"}</td>
                                                        <td className="py-3 hidden lg:table-cell">
                                                            <Badge variant="secondary">{item.category?.name}</Badge>
                                                        </td>
                                                        <td className="py-3 text-[var(--zyllen-muted)] hidden lg:table-cell">{item.brand || "—"}</td>
                                                        <td className="py-3 text-center">
                                                            <Badge variant="outline">{item.totalAssets}</Badge>
                                                        </td>
                                                        <td className="py-3 text-center">
                                                            <Badge variant="success">{item.totalStock}</Badge>
                                                        </td>
                                                        <td className="py-3 text-center">
                                                            <Badge variant="outline">{item.locations.length}</Badge>
                                                        </td>
                                                        <td className="py-3 text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setDetailSku(item); }}
                                                                    className="p-1 text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)]"
                                                                    title="Detalhes"
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                                {expandedSku === item.id ? (
                                                                    <ChevronUp size={14} className="mt-1 text-[var(--zyllen-muted)]" />
                                                                ) : (
                                                                    <ChevronDown size={14} className="mt-1 text-[var(--zyllen-muted)]" />
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {/* Expanded row: location distribution */}
                                                    {expandedSku === item.id && (
                                                        <tr key={`${item.id}-detail`}>
                                                            <td colSpan={9} className="p-0">
                                                                <div className="bg-[var(--zyllen-bg-dark)] border-t border-[var(--zyllen-border)]/30 px-6 py-4">
                                                                    <p className="text-xs text-[var(--zyllen-muted)] font-medium mb-3 uppercase tracking-wider">
                                                                        Distribuição por Local
                                                                    </p>
                                                                    {item.locations.length > 0 ? (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                                                            {item.locations.map((loc) => (
                                                                                <div
                                                                                    key={loc.locationId}
                                                                                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg)] border border-[var(--zyllen-border)]/50"
                                                                                >
                                                                                    <div className="flex items-center gap-2">
                                                                                        <MapPin size={14} className="text-[var(--zyllen-highlight)]" />
                                                                                        <span className="text-white text-sm">{loc.locationName}</span>
                                                                                    </div>
                                                                                    <Badge variant="success">{loc.quantity} un.</Badge>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-[var(--zyllen-muted)] text-sm">{EMPTY_STATES.equipmentStock}</p>
                                                                    )}
                                                                    {item.barcode && (
                                                                        <p className="text-xs text-[var(--zyllen-muted)] mt-3">
                                                                            Código de barras: <span className="font-mono text-white">{item.barcode}</span>
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-[var(--zyllen-muted)] text-center py-8">
                                    {EMPTY_STATES.equipment}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ CATEGORIAS TAB ═══ */}
            {tab === "categorias" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-md">
                        <CardContent className="pt-6">
                            <form onSubmit={(e) => { e.preventDefault(); createCat.mutate(newCat); }} className="flex gap-2">
                                <Input
                                    value={newCat}
                                    onChange={(e) => setNewCat(e.target.value)}
                                    placeholder="Nome da categoria..."
                                    required
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                />
                                <Button type="submit" variant="highlight" disabled={createCat.isPending}>
                                    <Plus size={16} />
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader><CardTitle className="text-white">Categorias</CardTitle></CardHeader>
                        <CardContent>
                            {loadingCats ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                                </div>
                            ) : categories?.data?.length ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                    {categories.data.map((c: any) => (
                                        <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50 text-white text-sm group">
                                            <div>
                                                <span>{c.name}</span>
                                                {c._count?.skuItems !== undefined && (
                                                    <span className="text-xs text-[var(--zyllen-muted)] ml-2">({c._count.skuItems} SKUs)</span>
                                                )}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditCat({ id: c.id, name: c.name })} className="p-1 hover:text-[var(--zyllen-highlight)]"><Pencil size={14} /></button>
                                                <button onClick={() => setDeleteConfirm({ type: "category", id: c.id, name: c.name })} className="p-1 hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[var(--zyllen-muted)] text-center py-4">{EMPTY_STATES.equipmentCategories}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ LOCAIS TAB ═══ */}
            {tab === "locais" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-md">
                        <CardContent className="pt-6">
                            <form onSubmit={(e) => { e.preventDefault(); createLoc.mutate(newLoc); }} className="space-y-3">
                                <Input
                                    value={newLoc.name}
                                    onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })}
                                    placeholder="Nome do local..."
                                    required
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                />
                                <div className="flex gap-2">
                                    <Input
                                        value={newLoc.description}
                                        onChange={(e) => setNewLoc({ ...newLoc, description: e.target.value })}
                                        placeholder="Descrição (opcional)"
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    />
                                    <Button type="submit" variant="highlight" disabled={createLoc.isPending}>
                                        <Plus size={16} />
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader><CardTitle className="text-white">Locais</CardTitle></CardHeader>
                        <CardContent>
                            {loadingLocs ? (
                                <div className="space-y-2">
                                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                                </div>
                            ) : locations?.data?.length ? (
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
                            ) : (
                                <p className="text-[var(--zyllen-muted)] text-center py-4">{EMPTY_STATES.equipmentLocations}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ DETAIL DIALOG ═══ */}
            <Dialog open={!!detailSku} onOpenChange={(o) => !o && setDetailSku(null)}>
                <DialogContent onClose={() => setDetailSku(null)} className="border-[var(--zyllen-border)] max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Equipamento</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {detailSku && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-[var(--zyllen-muted)] text-xs">Código SKU</p>
                                        <p className="text-[var(--zyllen-highlight)] font-mono font-bold">{detailSku.skuCode}</p>
                                    </div>
                                    <div>
                                        <p className="text-[var(--zyllen-muted)] text-xs">Categoria</p>
                                        <p className="text-white">{detailSku.category?.name}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[var(--zyllen-muted)] text-xs">Nome</p>
                                        <p className="text-white font-medium">{detailSku.name}</p>
                                    </div>
                                    {detailSku.description && (
                                        <div className="col-span-2">
                                            <p className="text-[var(--zyllen-muted)] text-xs">Descrição</p>
                                            <p className="text-white">{detailSku.description}</p>
                                        </div>
                                    )}
                                    {detailSku.brand && (
                                        <div>
                                            <p className="text-[var(--zyllen-muted)] text-xs">Marca</p>
                                            <p className="text-white">{detailSku.brand}</p>
                                        </div>
                                    )}
                                    {detailSku.barcode && (
                                        <div>
                                            <p className="text-[var(--zyllen-muted)] text-xs">Código de Barras</p>
                                            <p className="text-white font-mono">{detailSku.barcode}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[var(--zyllen-muted)] text-xs">Total Patrimônios</p>
                                        <p className="text-white font-bold text-lg">{detailSku.totalAssets}</p>
                                    </div>
                                    <div>
                                        <p className="text-[var(--zyllen-muted)] text-xs">Total em Estoque</p>
                                        <p className="text-[var(--zyllen-highlight)] font-bold text-lg">{detailSku.totalStock}</p>
                                    </div>
                                </div>

                                {/* Location distribution */}
                                <div>
                                    <p className="text-xs text-[var(--zyllen-muted)] font-medium mb-2 uppercase tracking-wider">
                                        Distribuição por Local
                                    </p>
                                    {detailSku.locations.length > 0 ? (
                                        <div className="space-y-2">
                                            {detailSku.locations.map((loc) => (
                                                <div
                                                    key={loc.locationId}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <MapPin size={14} className="text-[var(--zyllen-highlight)]" />
                                                        <span className="text-white text-sm">{loc.locationName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-2 bg-[var(--zyllen-border)] rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-[var(--zyllen-highlight)] rounded-full"
                                                                style={{ width: `${Math.min(100, (loc.quantity / detailSku.totalStock) * 100)}%` }}
                                                            />
                                                        </div>
                                                        <Badge variant="success">{loc.quantity} un.</Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[var(--zyllen-muted)] text-sm">{EMPTY_STATES.equipmentStock}</p>
                                    )}
                                </div>

                                <p className="text-xs text-[var(--zyllen-muted)]">
                                    Cadastrado em: {new Date(detailSku.createdAt).toLocaleDateString("pt-BR")}
                                </p>
                            </div>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDetailSku(null)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ EDIT CATEGORY DIALOG ═══ */}
            <Dialog open={!!editCat} onOpenChange={(o) => !o && setEditCat(null)}>
                <DialogContent onClose={() => setEditCat(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Editar Categoria</DialogTitle></DialogHeader>
                    <DialogBody>
                        <Input
                            value={editCat?.name || ""}
                            onChange={(e) => setEditCat({ ...editCat, name: e.target.value })}
                            className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                        />
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditCat(null)}>Cancelar</Button>
                        <Button variant="highlight" onClick={() => updateCat.mutate(editCat)} disabled={updateCat.isPending}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ EDIT LOCATION DIALOG ═══ */}
            <Dialog open={!!editLoc} onOpenChange={(o) => !o && setEditLoc(null)}>
                <DialogContent onClose={() => setEditLoc(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Editar Local</DialogTitle></DialogHeader>
                    <DialogBody>
                        <div className="space-y-4">
                            <Input
                                value={editLoc?.name || ""}
                                onChange={(e) => setEditLoc({ ...editLoc, name: e.target.value })}
                                placeholder="Nome"
                                className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                            />
                            <Input
                                value={editLoc?.description || ""}
                                onChange={(e) => setEditLoc({ ...editLoc, description: e.target.value })}
                                placeholder="Descrição"
                                className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                            />
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditLoc(null)}>Cancelar</Button>
                        <Button variant="highlight" onClick={() => updateLoc.mutate(editLoc)} disabled={updateLoc.isPending}>Salvar</Button>
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
