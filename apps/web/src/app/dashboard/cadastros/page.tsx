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
import { toast } from "sonner";
import { Database, Layers, MapPin, Truck, Tag, Plus, Pencil, Trash2 } from "lucide-react";

type Tab = "categories" | "skus" | "locations" | "suppliers" | "movementTypes";

export default function CadastrosPage() {
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("categories");

    const { data: categories } = useQuery({
        queryKey: ["categories"],
        queryFn: () => apiClient.get<{ data: any[] }>("/catalog/categories", fetchOpts),
        enabled: tab === "categories",
    });
    const { data: skus } = useQuery({
        queryKey: ["skus"],
        queryFn: () => apiClient.get<{ data: any[] }>("/catalog/skus", fetchOpts),
        enabled: tab === "skus",
    });
    const { data: locations } = useQuery({
        queryKey: ["locations"],
        queryFn: () => apiClient.get<{ data: any[] }>("/locations", fetchOpts),
        enabled: tab === "locations",
    });
    const { data: suppliers } = useQuery({
        queryKey: ["suppliers"],
        queryFn: () => apiClient.get<{ data: any[] }>("/suppliers", fetchOpts),
        enabled: tab === "suppliers",
    });
    const { data: movementTypes } = useQuery({
        queryKey: ["movementTypes"],
        queryFn: () => apiClient.get<{ data: any[] }>("/inventory/movement-types", fetchOpts),
        enabled: tab === "movementTypes",
    });

    // Quick create forms
    const [newCat, setNewCat] = useState("");
    const [newLoc, setNewLoc] = useState({ name: "", address: "" });
    const [newSup, setNewSup] = useState({ name: "", cnpj: "" });

    const createCat = useMutation({
        mutationFn: (name: string) => apiClient.post("/catalog/categories", { name }, fetchOpts),
        onSuccess: () => { toast.success("Categoria criada!"); qc.invalidateQueries({ queryKey: ["categories"] }); setNewCat(""); },
        onError: (e: any) => toast.error(e.message),
    });
    const createLoc = useMutation({
        mutationFn: (data: any) => apiClient.post("/locations", data, fetchOpts),
        onSuccess: () => { toast.success("Local criado!"); qc.invalidateQueries({ queryKey: ["locations"] }); setNewLoc({ name: "", address: "" }); },
        onError: (e: any) => toast.error(e.message),
    });
    const createSup = useMutation({
        mutationFn: (data: any) => apiClient.post("/suppliers", data, fetchOpts),
        onSuccess: () => { toast.success("Fornecedor criado!"); qc.invalidateQueries({ queryKey: ["suppliers"] }); setNewSup({ name: "", cnpj: "" }); },
        onError: (e: any) => toast.error(e.message),
    });

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
                                        <div key={c.id} className="p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50 text-white text-sm">
                                            {c.name}
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-[var(--zyllen-muted)] text-center py-4">Nenhuma categoria</p>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {tab === "skus" && (
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
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {skus.data.map((s: any) => (
                                            <tr key={s.id} className="border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02]">
                                                <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{s.skuCode}</td>
                                                <td className="py-3 text-white">{s.name}</td>
                                                <td className="py-3 text-[var(--zyllen-muted)]">{s.category?.name}</td>
                                                <td className="py-3 text-[var(--zyllen-muted)]">{s.brand ?? "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <p className="text-[var(--zyllen-muted)] text-center py-8">Nenhum SKU</p>}
                    </CardContent>
                </Card>
            )}

            {tab === "locations" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-md">
                        <CardContent className="pt-6">
                            <form onSubmit={(e) => { e.preventDefault(); createLoc.mutate(newLoc); }} className="space-y-3">
                                <Input value={newLoc.name} onChange={(e) => setNewLoc({ ...newLoc, name: e.target.value })} placeholder="Nome do local..." required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                <div className="flex gap-2">
                                    <Input value={newLoc.address} onChange={(e) => setNewLoc({ ...newLoc, address: e.target.value })} placeholder="Endereço (opcional)" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
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
                                        <div key={l.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                            <MapPin size={16} className="text-[var(--zyllen-highlight)]" />
                                            <div>
                                                <p className="text-white text-sm font-medium">{l.name}</p>
                                                {l.address && <p className="text-xs text-[var(--zyllen-muted)]">{l.address}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-[var(--zyllen-muted)] text-center py-4">Nenhum local</p>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {tab === "suppliers" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-md">
                        <CardContent className="pt-6">
                            <form onSubmit={(e) => { e.preventDefault(); createSup.mutate(newSup); }} className="space-y-3">
                                <Input value={newSup.name} onChange={(e) => setNewSup({ ...newSup, name: e.target.value })} placeholder="Nome do fornecedor..." required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                <div className="flex gap-2">
                                    <Input value={newSup.cnpj} onChange={(e) => setNewSup({ ...newSup, cnpj: e.target.value })} placeholder="CNPJ" required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
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
                                        <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                            <Truck size={16} className="text-[var(--zyllen-highlight)]" />
                                            <div>
                                                <p className="text-white text-sm font-medium">{s.name}</p>
                                                <p className="text-xs text-[var(--zyllen-muted)] font-mono">{s.cnpj}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-[var(--zyllen-muted)] text-center py-4">Nenhum fornecedor</p>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {tab === "movementTypes" && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader><CardTitle className="text-white">Tipos de Movimentação</CardTitle></CardHeader>
                    <CardContent>
                        {movementTypes?.data?.length ? (
                            <div className="space-y-2">
                                {movementTypes.data.map((t: any) => (
                                    <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                        <span className="text-white text-sm">{t.name}</span>
                                        <Badge variant={t.requiresApproval ? "warning" : "success"}>
                                            {t.requiresApproval ? "Requer Aprovação" : "Automático"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-[var(--zyllen-muted)] text-center py-4">Nenhum tipo</p>}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
