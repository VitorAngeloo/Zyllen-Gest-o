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
import { Textarea } from "@web/components/ui/textarea";
import { Select, SelectOption } from "@web/components/ui/select";
import { toast } from "sonner";
import { Printer, Tag, History, FileText, Plus, Pencil, Trash2, Search } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { EMPTY_STATES, TOASTS, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";

type Tab = "print" | "history" | "templates";

export default function EtiquetasPage() {
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("print");

    // Print form
    const [assetCode, setAssetCode] = useState("");
    const [labelData, setLabelData] = useState<any>(null);

    // Template form
    const [newTemplate, setNewTemplate] = useState({ name: "", layout: "" });
    const [editTemplate, setEditTemplate] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

    // ─── Queries ────────────────────────
    const { data: history, isLoading: loadingHistory } = useQuery({
        queryKey: ["label-history"],
        queryFn: () => apiClient.get<{ data: any[] }>("/labels/history", fetchOpts),
        enabled: tab === "history",
    });

    const { data: templates, isLoading: loadingTemplates } = useQuery({
        queryKey: ["label-templates"],
        queryFn: () => apiClient.get<{ data: any[] }>("/labels/templates", fetchOpts),
        enabled: tab === "templates",
    });

    const { data: assets, isLoading: loadingAssets } = useQuery({
        queryKey: ["assets"],
        queryFn: () => apiClient.get<{ data: any[] }>("/assets", fetchOpts),
        enabled: tab === "print",
    });

    // ─── Lookup asset for label ─────────
    const handleLookup = async (code?: string) => {
        const searchCode = (code ?? assetCode).trim();
        if (!searchCode) return;
        try {
            const res = await apiClient.get<{ data: any }>(`/assets/lookup/${searchCode}`, fetchOpts);
            if (res.data) {
                const labelRes = await apiClient.get<any>(`/labels/data/${res.data.id}`, fetchOpts);
                setLabelData({ asset: res.data, ...labelRes });
            }
        } catch {
            toast.error("Patrimônio não encontrado");
            setLabelData(null);
        }
    };

    // ─── Mutations ──────────────────────
    const printMut = useMutation({
        mutationFn: (assetId: string) => apiClient.post("/labels/print", { assetId }, fetchOpts),
        onSuccess: () => { toast.success(TOASTS.printRegistered); qc.invalidateQueries({ queryKey: ["label-history"] }); },
        onError: (e: any) => toast.error(e.message),
    });

    const createTemplate = useMutation({
        mutationFn: (data: any) => apiClient.post("/labels/templates", data, fetchOpts),
        onSuccess: () => { toast.success("Template criado!"); qc.invalidateQueries({ queryKey: ["label-templates"] }); setNewTemplate({ name: "", layout: "" }); },
        onError: (e: any) => toast.error(e.message),
    });

    const updateTemplate = useMutation({
        mutationFn: (data: any) => apiClient.put(`/labels/templates/${data.id}`, { name: data.name, layout: data.layout }, fetchOpts),
        onSuccess: () => { toast.success("Template atualizado!"); qc.invalidateQueries({ queryKey: ["label-templates"] }); setEditTemplate(null); },
        onError: (e: any) => toast.error(e.message),
    });

    const deleteTemplate = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/labels/templates/${id}`, fetchOpts),
        onSuccess: () => { toast.success("Template excluído!"); qc.invalidateQueries({ queryKey: ["label-templates"] }); setDeleteConfirm(null); },
        onError: (e: any) => toast.error(e.message),
    });

    const tabs = [
        { key: "print", label: "Imprimir", icon: Printer },
        { key: "history", label: "Histórico", icon: History },
        { key: "templates", label: "Templates", icon: FileText },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Tag className="text-[var(--zyllen-highlight)]" /> Etiquetas
            </h1>
            <p className="text-sm text-[var(--zyllen-muted)] mt-1">{PAGE_DESCRIPTIONS.etiquetas}</p>

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

            {/* ═══ PRINT ═══ */}
            {tab === "print" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardContent className="pt-6">
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                                    <Input
                                        value={assetCode}
                                        onChange={(e) => setAssetCode(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                                        placeholder="Bipar ou digitar código do patrimônio..."
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-10 font-mono"
                                    />
                                </div>
                                <Button variant="highlight" onClick={() => handleLookup()}>
                                    <Search size={16} /> Buscar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {labelData && (
                        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-highlight)]/20">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Tag size={18} className="text-[var(--zyllen-highlight)]" />
                                    Dados da Etiqueta
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <p className="text-xs text-[var(--zyllen-muted)]">Código</p>
                                        <p className="text-white font-mono text-lg">{labelData.asset?.assetCode}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--zyllen-muted)]">Item</p>
                                        <p className="text-white">{labelData.asset?.sku?.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--zyllen-muted)]">SKU</p>
                                        <p className="text-white font-mono text-sm">{labelData.asset?.sku?.skuCode}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--zyllen-muted)]">Local</p>
                                        <p className="text-white">{labelData.asset?.currentLocation?.name ?? "Sem local"}</p>
                                    </div>
                                </div>

                                {/* Preview border box */}
                                <div className="border-2 border-dashed border-[var(--zyllen-border)] rounded-lg p-6 text-center mb-4">
                                    <p className="text-[var(--zyllen-muted)] text-sm mb-2">Preview da Etiqueta</p>
                                    <div className="inline-block bg-white text-black rounded p-4 text-left">
                                        <p className="font-bold text-lg">{labelData.asset?.assetCode}</p>
                                        <p className="text-sm">{labelData.asset?.sku?.name}</p>
                                        <p className="text-xs text-gray-500 font-mono">{labelData.asset?.sku?.skuCode}</p>
                                    </div>
                                </div>

                                <Button
                                    variant="highlight"
                                    className="w-full"
                                    onClick={() => printMut.mutate(labelData.asset.id)}
                                    disabled={printMut.isPending}
                                >
                                    <Printer size={16} /> {printMut.isPending ? "Registrando..." : "Registrar Impressão"}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Quick print from list */}
                    {!labelData && assets?.data?.length ? (
                        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                            <CardHeader><CardTitle className="text-white">Patrimônios disponíveis</CardTitle></CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--zyllen-border)]">
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Código</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Item</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Status</th>
                                                <th className="text-right py-3 text-[var(--zyllen-muted)] font-medium">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assets.data.map((a: any) => (
                                                <tr key={a.id} className="border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02]">
                                                    <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{a.assetCode}</td>
                                                    <td className="py-3 text-white">{a.sku?.name}</td>
                                                    <td className="py-3"><Badge variant={a.status === "ATIVO" ? "success" : "warning"}>{a.status}</Badge></td>
                                                    <td className="py-3 text-right">
                                                        <Button size="sm" variant="ghost" onClick={() => { setAssetCode(a.assetCode); handleLookup(a.assetCode); }}>
                                                            <Printer size={14} />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
            )}

            {/* ═══ HISTORY ═══ */}
            {tab === "history" && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader><CardTitle className="text-white">Histórico de Impressões</CardTitle></CardHeader>
                    <CardContent>
                        {loadingHistory ? (
                            <div className="space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <Skeleton className="h-4 w-28" />
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                ))}
                            </div>
                        ) : history?.data?.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--zyllen-border)]">
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Data</th>
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Patrimônio</th>
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Impresso por</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.data.map((h: any) => (
                                            <tr key={h.id} className="border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02]">
                                                <td className="py-3 text-[var(--zyllen-muted)] text-xs">{new Date(h.printedAt).toLocaleString("pt-BR")}</td>
                                                <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{h.asset?.assetCode}</td>
                                                <td className="py-3 text-white">{h.printedBy?.name}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <div className="text-center py-12"><History size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/50" /><p className="text-[var(--zyllen-muted)]">{EMPTY_STATES.printHistory}</p></div>}
                    </CardContent>
                </Card>
            )}

            {/* ═══ TEMPLATES ═══ */}
            {tab === "templates" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-lg">
                        <CardHeader><CardTitle className="text-white">Novo Template</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={(e) => { e.preventDefault(); createTemplate.mutate(newTemplate); }} className="space-y-3">
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Nome</Label>
                                    <Input value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="Nome do template..." required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Layout (JSON)</Label>
                                    <Textarea value={newTemplate.layout} onChange={(e) => setNewTemplate({ ...newTemplate, layout: e.target.value })} placeholder='{"width": 80, "height": 40, "fields": [...]}' required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white font-mono text-xs min-h-[120px]" />
                                </div>
                                <Button type="submit" variant="highlight" className="w-full" disabled={createTemplate.isPending}>
                                    <Plus size={16} /> {createTemplate.isPending ? "Criando..." : "Criar Template"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader><CardTitle className="text-white">Templates</CardTitle></CardHeader>
                        <CardContent>
                            {templates?.data?.length ? (
                                <div className="space-y-2">
                                    {templates.data.map((t: any) => (
                                        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50 group">
                                            <div>
                                                <p className="text-white text-sm font-medium">{t.name}</p>
                                                <p className="text-xs text-[var(--zyllen-muted)] font-mono truncate max-w-md">{t.layout}</p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditTemplate({ id: t.id, name: t.name, layout: t.layout })} className="p-1 text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)]"><Pencil size={14} /></button>
                                                <button onClick={() => setDeleteConfirm(t)} className="p-1 text-[var(--zyllen-muted)] hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-[var(--zyllen-muted)] text-center py-4">{EMPTY_STATES.templates}</p>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ EDIT TEMPLATE ═══ */}
            <Dialog open={!!editTemplate} onOpenChange={(o) => !o && setEditTemplate(null)}>
                <DialogContent onClose={() => setEditTemplate(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Editar Template</DialogTitle></DialogHeader>
                    <DialogBody>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Nome</Label>
                                <Input value={editTemplate?.name || ""} onChange={(e) => setEditTemplate({ ...editTemplate, name: e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Layout (JSON)</Label>
                                <Textarea value={editTemplate?.layout || ""} onChange={(e) => setEditTemplate({ ...editTemplate, layout: e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white font-mono text-xs min-h-[120px]" />
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditTemplate(null)}>Cancelar</Button>
                        <Button variant="highlight" onClick={() => updateTemplate.mutate(editTemplate)} disabled={updateTemplate.isPending}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ DELETE CONFIRM ═══ */}
            <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
                <DialogContent onClose={() => setDeleteConfirm(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
                    <DialogBody>
                        <p className="text-[var(--zyllen-muted)]">
                            Excluir template <strong className="text-white">{deleteConfirm?.name}</strong>?
                        </p>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => deleteTemplate.mutate(deleteConfirm.id)}>Excluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
