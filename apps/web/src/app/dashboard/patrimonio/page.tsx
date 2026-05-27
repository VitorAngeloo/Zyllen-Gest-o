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
import { ScanBarcode, Search, Clock, MapPin, ChevronLeft, ChevronRight, Printer, RefreshCw, X, Filter, ArrowRight } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { EMPTY_STATES, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";
import Link from "next/link";

const STATUS_OPTIONS = [
    { value: "ATIVO", label: "Ativo" },
    { value: "EM_USO", label: "Em Uso" },
    { value: "EM_MANUTENCAO", label: "Em Manutenção" },
    { value: "BAIXADO", label: "Baixado" },
];

const statusVariant = (s: string): "success" | "warning" | "destructive" | "default" => {
    if (s === "ATIVO") return "success";
    if (s === "EM_MANUTENCAO") return "warning";
    if (s === "BAIXADO") return "destructive";
    return "default";
};

const statusLabel = (s: string) => STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;

const LIMIT = 20;

export default function PatrimonioPage() {
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();

    // Filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [locationFilter, setLocationFilter] = useState("");
    const [skuFilter, setSkuFilter] = useState("");
    const [page, setPage] = useState(1);

    // Selected asset detail
    const [selectedAsset, setSelectedAsset] = useState<any>(null);

    // Edit dialogs
    const [editStatusAsset, setEditStatusAsset] = useState<any>(null);
    const [editLocationAsset, setEditLocationAsset] = useState<any>(null);
    const [newStatus, setNewStatus] = useState("");
    const [newLocationId, setNewLocationId] = useState("");

    // Bipagem lookup
    const [bipCode, setBipCode] = useState("");

    const buildQuery = () => {
        const p = new URLSearchParams();
        if (search) p.set("search", search);
        if (statusFilter) p.set("status", statusFilter);
        if (locationFilter) p.set("locationId", locationFilter);
        if (skuFilter) p.set("skuId", skuFilter);
        p.set("page", String(page));
        p.set("limit", String(LIMIT));
        return p.toString();
    };

    const { data: assetsRes, isLoading } = useQuery({
        queryKey: ["assets", search, statusFilter, locationFilter, skuFilter, page],
        queryFn: () => apiClient.get<{ data: any[]; total: number }>(`/assets?${buildQuery()}`, fetchOpts),
    });

    const { data: locations } = useQuery({
        queryKey: ["locations"],
        queryFn: () => apiClient.get<{ data: any[] }>("/locations", fetchOpts),
    });

    const { data: skus } = useQuery({
        queryKey: ["skus"],
        queryFn: () => apiClient.get<{ data: any[] }>("/catalog/skus", fetchOpts),
    });

    const { data: timeline, isLoading: loadingTimeline } = useQuery({
        queryKey: ["timeline", selectedAsset?.id],
        queryFn: () => apiClient.get<{ data: any[] }>(`/assets/${selectedAsset.id}/timeline`, fetchOpts),
        enabled: !!selectedAsset?.id,
    });

    const statusMut = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            apiClient.put(`/assets/${id}/status`, { status }, fetchOpts),
        onSuccess: () => {
            toast.success("Status atualizado");
            qc.invalidateQueries({ queryKey: ["assets"] });
            if (selectedAsset?.id === editStatusAsset?.id) {
                setSelectedAsset((prev: any) => prev ? { ...prev, status: newStatus } : prev);
            }
            setEditStatusAsset(null);
        },
        onError: (e: any) => toast.error(e.message),
    });

    const locationMut = useMutation({
        mutationFn: ({ id, locationId }: { id: string; locationId: string | null }) =>
            apiClient.put(`/assets/${id}/location`, { locationId }, fetchOpts),
        onSuccess: () => {
            toast.success("Local atualizado");
            qc.invalidateQueries({ queryKey: ["assets"] });
            if (selectedAsset?.id === editLocationAsset?.id) {
                const loc = locations?.data?.find((l: any) => l.id === newLocationId) ?? null;
                setSelectedAsset((prev: any) => prev ? { ...prev, currentLocation: loc } : prev);
            }
            setEditLocationAsset(null);
        },
        onError: (e: any) => toast.error(e.message),
    });

    const handleBipLookup = async () => {
        const code = bipCode.trim();
        if (!code) return;
        try {
            const res = await apiClient.get<{ data: any }>(`/assets/lookup/${code}`, fetchOpts);
            setSelectedAsset(res.data);
            setBipCode("");
        } catch {
            toast.error("Patrimônio não encontrado");
        }
    };

    const total = assetsRes?.total ?? 0;
    const totalPages = Math.ceil(total / LIMIT);
    const hasFilters = !!(search || statusFilter || locationFilter || skuFilter);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ScanBarcode className="text-[var(--zyllen-highlight)]" /> Patrimônio
            </h1>
            <p className="text-sm text-[var(--zyllen-muted)]">{PAGE_DESCRIPTIONS.patrimonio}</p>

            {/* Bipagem */}
            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                <CardContent className="pt-5 pb-5">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                            <Input
                                value={bipCode}
                                onChange={(e) => setBipCode(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleBipLookup()}
                                placeholder="Bipar ou digitar código SKY-XXXXX..."
                                className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-10 font-mono"
                            />
                        </div>
                        <Button variant="highlight" onClick={handleBipLookup}>
                            <Search size={16} /> Buscar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Asset Detail Panel */}
            {selectedAsset && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-highlight)]/30 lg:col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <CardTitle className="text-[var(--zyllen-highlight)] font-mono text-lg">
                                {selectedAsset.assetCode}
                            </CardTitle>
                            <button onClick={() => setSelectedAsset(null)} className="text-[var(--zyllen-muted)] hover:text-white">
                                <X size={16} />
                            </button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-xs text-[var(--zyllen-muted)]">Item</p>
                                <p className="text-white font-medium">{selectedAsset.sku?.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--zyllen-muted)]">Código do item</p>
                                <p className="text-white font-mono text-sm">{selectedAsset.sku?.skuCode}</p>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-[var(--zyllen-muted)]">Status</p>
                                    <Badge variant={statusVariant(selectedAsset.status)} className="mt-0.5">
                                        {statusLabel(selectedAsset.status)}
                                    </Badge>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-[var(--zyllen-border)] text-white hover:bg-white/5 text-xs gap-1"
                                    onClick={() => { setEditStatusAsset(selectedAsset); setNewStatus(selectedAsset.status); }}
                                >
                                    <RefreshCw size={12} /> Alterar
                                </Button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-[var(--zyllen-muted)]">Local atual</p>
                                    <p className="text-white flex items-center gap-1 text-sm mt-0.5">
                                        <MapPin size={13} className="text-[var(--zyllen-muted)]" />
                                        {selectedAsset.currentLocation?.name ?? "Sem local"}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-[var(--zyllen-border)] text-white hover:bg-white/5 text-xs gap-1"
                                    onClick={() => { setEditLocationAsset(selectedAsset); setNewLocationId(selectedAsset.currentLocation?.id ?? ""); }}
                                >
                                    <ArrowRight size={12} /> Mover
                                </Button>
                            </div>
                            <Link href="/dashboard/etiquetas">
                                <Button variant="outline" className="w-full border-[var(--zyllen-border)] text-white hover:bg-[var(--zyllen-highlight)]/10 hover:text-[var(--zyllen-highlight)] hover:border-[var(--zyllen-highlight)]/30 gap-2 mt-1">
                                    <Printer size={14} /> Imprimir etiqueta
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Timeline */}
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Clock size={18} className="text-[var(--zyllen-highlight)]" /> Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingTimeline ? (
                                <div className="space-y-3">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="flex gap-4">
                                            <Skeleton className="size-2 rounded-full mt-2 shrink-0" />
                                            <Skeleton className="h-16 flex-1 rounded-lg" />
                                        </div>
                                    ))}
                                </div>
                            ) : timeline?.data?.length ? (
                                <div className="space-y-3 relative max-h-80 overflow-y-auto pr-1">
                                    <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--zyllen-border)]" />
                                    {timeline.data.map((event: any, idx: number) => (
                                        <div key={idx} className="flex gap-4 relative">
                                            <div className="size-2 rounded-full bg-[var(--zyllen-highlight)] mt-2 z-10 ring-4 ring-[var(--zyllen-bg)] shrink-0" />
                                            <div className="flex-1 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                                <div className="flex items-center justify-between flex-wrap gap-1">
                                                    <Badge variant="outline" className="text-xs">{event.type}</Badge>
                                                    <span className="text-xs text-[var(--zyllen-muted)]">
                                                        {new Date(event.date).toLocaleString("pt-BR")}
                                                    </span>
                                                </div>
                                                {event.description && (
                                                    <p className="text-sm text-white mt-1">{event.description}</p>
                                                )}
                                                {event.actor && (
                                                    <p className="text-xs text-[var(--zyllen-muted)] mt-0.5">Por {event.actor}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[var(--zyllen-muted)] text-center py-8">{EMPTY_STATES.assetTimeline}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filter Bar */}
            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                <CardContent className="pt-4 pb-4">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-[160px] space-y-1">
                            <Label className="text-xs text-[var(--zyllen-muted)]">Busca</Label>
                            <div className="relative">
                                <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                                <Input
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    placeholder="Código ou nome..."
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-8 h-8 text-sm"
                                />
                            </div>
                        </div>
                        <div className="min-w-[140px] space-y-1">
                            <Label className="text-xs text-[var(--zyllen-muted)]">Status</Label>
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                                className="w-full h-8 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-2 text-sm"
                            >
                                <option value="">Todos</option>
                                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div className="min-w-[160px] space-y-1">
                            <Label className="text-xs text-[var(--zyllen-muted)]">Local</Label>
                            <select
                                value={locationFilter}
                                onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
                                className="w-full h-8 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-2 text-sm"
                            >
                                <option value="">Todos</option>
                                {locations?.data?.map((l: any) => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="min-w-[180px] space-y-1">
                            <Label className="text-xs text-[var(--zyllen-muted)]">Item</Label>
                            <select
                                value={skuFilter}
                                onChange={(e) => { setSkuFilter(e.target.value); setPage(1); }}
                                className="w-full h-8 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-2 text-sm"
                            >
                                <option value="">Todos</option>
                                {skus?.data?.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        {hasFilters && (
                            <Button
                                variant="ghost"
                                className="text-[var(--zyllen-muted)] hover:text-white h-8 text-sm gap-1"
                                onClick={() => { setSearch(""); setStatusFilter(""); setLocationFilter(""); setSkuFilter(""); setPage(1); }}
                            >
                                <X size={14} /> Limpar filtros
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Assets Table */}
            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white">
                        Patrimônios{" "}
                        {total > 0 && (
                            <span className="text-[var(--zyllen-muted)] text-sm font-normal">({total} total)</span>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-6 w-16" />
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-6 w-16 ml-auto" />
                                </div>
                            ))}
                        </div>
                    ) : assetsRes?.data?.length ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--zyllen-border)]">
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Código</th>
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Item</th>
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Status</th>
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Local</th>
                                            <th className="text-right py-3 text-[var(--zyllen-muted)] font-medium">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assetsRes.data.map((a: any) => (
                                            <tr
                                                key={a.id}
                                                className={`border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02] cursor-pointer transition-colors ${selectedAsset?.id === a.id ? "bg-[var(--zyllen-highlight)]/5" : ""}`}
                                                onClick={() => setSelectedAsset(a)}
                                            >
                                                <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{a.assetCode}</td>
                                                <td className="py-3 text-white">{a.sku?.name}</td>
                                                <td className="py-3">
                                                    <Badge variant={statusVariant(a.status)}>{statusLabel(a.status)}</Badge>
                                                </td>
                                                <td className="py-3 text-[var(--zyllen-muted)]">{a.currentLocation?.name ?? "—"}</td>
                                                <td className="py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditStatusAsset(a); setNewStatus(a.status); }}
                                                            className="p-1.5 rounded text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)] hover:bg-[var(--zyllen-highlight)]/10 transition-colors"
                                                            title="Alterar status"
                                                        >
                                                            <RefreshCw size={13} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditLocationAsset(a); setNewLocationId(a.currentLocation?.id ?? ""); }}
                                                            className="p-1.5 rounded text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)] hover:bg-[var(--zyllen-highlight)]/10 transition-colors"
                                                            title="Mudar local"
                                                        >
                                                            <MapPin size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--zyllen-border)]">
                                    <p className="text-xs text-[var(--zyllen-muted)]">
                                        Página {page} de {totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page <= 1}
                                            className="border-[var(--zyllen-border)] text-white disabled:opacity-40 gap-1"
                                        >
                                            <ChevronLeft size={14} /> Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={page >= totalPages}
                                            className="border-[var(--zyllen-border)] text-white disabled:opacity-40 gap-1"
                                        >
                                            Próxima <ChevronRight size={14} />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <ScanBarcode size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/50" />
                            <p className="text-[var(--zyllen-muted)]">
                                {hasFilters ? "Nenhum patrimônio encontrado com os filtros aplicados." : EMPTY_STATES.assets}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Status Dialog */}
            <Dialog open={!!editStatusAsset} onOpenChange={(o) => !o && setEditStatusAsset(null)}>
                <DialogContent onClose={() => setEditStatusAsset(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader>
                        <DialogTitle>Alterar Status</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <p className="text-[var(--zyllen-muted)] text-sm mb-4">
                            Patrimônio:{" "}
                            <span className="font-mono text-[var(--zyllen-highlight)]">{editStatusAsset?.assetCode}</span>
                            {" "}— {editStatusAsset?.sku?.name}
                        </p>
                        <Select
                            value={newStatus}
                            onValueChange={setNewStatus}
                            className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                        >
                            {STATUS_OPTIONS.map((o) => (
                                <SelectOption key={o.value} value={o.value}>{o.label}</SelectOption>
                            ))}
                        </Select>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditStatusAsset(null)}>Cancelar</Button>
                        <Button
                            variant="highlight"
                            onClick={() => statusMut.mutate({ id: editStatusAsset.id, status: newStatus })}
                            disabled={statusMut.isPending}
                        >
                            {statusMut.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Location Dialog */}
            <Dialog open={!!editLocationAsset} onOpenChange={(o) => !o && setEditLocationAsset(null)}>
                <DialogContent onClose={() => setEditLocationAsset(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader>
                        <DialogTitle>Mudar Local</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <p className="text-[var(--zyllen-muted)] text-sm mb-4">
                            Patrimônio:{" "}
                            <span className="font-mono text-[var(--zyllen-highlight)]">{editLocationAsset?.assetCode}</span>
                            {" "}— {editLocationAsset?.sku?.name}
                        </p>
                        <select
                            value={newLocationId}
                            onChange={(e) => setNewLocationId(e.target.value)}
                            className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm"
                        >
                            <option value="">Sem local</option>
                            {locations?.data?.map((l: any) => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                        </select>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditLocationAsset(null)}>Cancelar</Button>
                        <Button
                            variant="highlight"
                            onClick={() => locationMut.mutate({ id: editLocationAsset.id, locationId: newLocationId || null })}
                            disabled={locationMut.isPending}
                        >
                            {locationMut.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
