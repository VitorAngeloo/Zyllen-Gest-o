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
import { ShoppingCart, Plus, Package, TruckIcon } from "lucide-react";

export default function ComprasPage() {
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [selectedPO, setSelectedPO] = useState<any>(null);
    const [form, setForm] = useState({ supplierId: "", skuId: "", qtyOrdered: 1 });
    const [recvForm, setRecvForm] = useState({ locationId: "", items: [{ skuId: "", qtyReceived: 1 }] });

    const { data: pos } = useQuery({
        queryKey: ["purchases"],
        queryFn: () => apiClient.get<{ data: any[] }>("/purchases", fetchOpts),
    });
    const { data: detail } = useQuery({
        queryKey: ["purchase", selectedPO?.id],
        queryFn: () => apiClient.get<{ data: any }>(`/purchases/${selectedPO.id}`, fetchOpts),
        enabled: !!selectedPO?.id,
    });
    const { data: suppliers } = useQuery({
        queryKey: ["suppliers"],
        queryFn: () => apiClient.get<{ data: any[] }>("/suppliers", fetchOpts),
        enabled: showCreate,
    });
    const { data: skus } = useQuery({
        queryKey: ["skus"],
        queryFn: () => apiClient.get<{ data: any[] }>("/catalog/skus", fetchOpts),
    });
    const { data: locations } = useQuery({
        queryKey: ["locations"],
        queryFn: () => apiClient.get<{ data: any[] }>("/locations", fetchOpts),
    });

    const createPO = useMutation({
        mutationFn: (data: any) => apiClient.post("/purchases", data, fetchOpts),
        onSuccess: () => { toast.success("Pedido criado!"); qc.invalidateQueries({ queryKey: ["purchases"] }); setShowCreate(false); },
        onError: (e: any) => toast.error(e.message),
    });

    const receivePO = useMutation({
        mutationFn: (data: any) => apiClient.post(`/purchases/${selectedPO.id}/receive`, data, fetchOpts),
        onSuccess: () => { toast.success("Recebimento registrado!"); qc.invalidateQueries({ queryKey: ["purchases"] }); qc.invalidateQueries({ queryKey: ["purchase", selectedPO?.id] }); },
        onError: (e: any) => toast.error(e.message),
    });

    const statusColor: Record<string, "default" | "warning" | "success" | "destructive" | "secondary"> = {
        DRAFT: "secondary", SENT: "default", PARTIAL: "warning", COMPLETED: "success", CANCELLED: "destructive",
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <ShoppingCart className="text-[var(--zyllen-highlight)]" /> Compras
                </h1>
                <Button variant="highlight" onClick={() => setShowCreate(!showCreate)}>
                    <Plus size={16} /> Novo Pedido
                </Button>
            </div>

            {showCreate && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-highlight)]/20 max-w-lg">
                    <CardHeader><CardTitle className="text-white">Novo Pedido de Compra</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={(e) => { e.preventDefault(); createPO.mutate({ supplierId: form.supplierId, items: [{ skuId: form.skuId, qtyOrdered: form.qtyOrdered }] }); }} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Fornecedor</Label>
                                <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} required className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                    <option value="">Selecione...</option>
                                    {suppliers?.data?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Item (SKU)</Label>
                                <select value={form.skuId} onChange={(e) => setForm({ ...form, skuId: e.target.value })} required className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                    <option value="">Selecione...</option>
                                    {skus?.data?.map((s: any) => <option key={s.id} value={s.id}>{s.skuCode} — {s.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Quantidade</Label>
                                <Input type="number" min={1} value={form.qtyOrdered} onChange={(e) => setForm({ ...form, qtyOrdered: +e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            <Button type="submit" variant="highlight" className="w-full" disabled={createPO.isPending}>Criar Pedido</Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* PO list */}
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] lg:col-span-1">
                    <CardHeader><CardTitle className="text-white text-sm">Pedidos de Compra</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {pos?.data?.map((po: any) => (
                            <div
                                key={po.id}
                                onClick={() => setSelectedPO(po)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedPO?.id === po.id
                                        ? "border-[var(--zyllen-highlight)]/30 bg-[var(--zyllen-highlight)]/5"
                                        : "border-[var(--zyllen-border)]/50 bg-[var(--zyllen-bg-dark)] hover:border-[var(--zyllen-border)]"
                                    }`}
                            >
                                <p className="text-white text-sm font-mono">{po.number}</p>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-[var(--zyllen-muted)]">{po.supplier?.name}</span>
                                    <Badge variant={statusColor[po.status] ?? "default"} className="text-[10px]">{po.status}</Badge>
                                </div>
                            </div>
                        ))}
                        {!pos?.data?.length && <p className="text-[var(--zyllen-muted)] text-center py-4 text-sm">Nenhum pedido</p>}
                    </CardContent>
                </Card>

                {/* PO detail */}
                {selectedPO && detail?.data ? (
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-white font-mono">{detail.data.number}</CardTitle>
                                <Badge variant={statusColor[detail.data.status] ?? "default"}>{detail.data.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-[var(--zyllen-muted)] mb-2">Itens do Pedido</h3>
                                {detail.data.items?.map((item: any) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50 mb-2">
                                        <div>
                                            <span className="text-white text-sm">{item.sku?.name}</span>
                                            <span className="text-xs text-[var(--zyllen-muted)] ml-2 font-mono">{item.sku?.skuCode}</span>
                                        </div>
                                        <span className="text-white font-semibold">{item.qtyOrdered} un</span>
                                    </div>
                                ))}
                            </div>

                            {/* Receivings */}
                            {detail.data.receivings?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-[var(--zyllen-muted)] mb-2">Recebimentos</h3>
                                    {detail.data.receivings.map((r: any) => (
                                        <div key={r.id} className="p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50 mb-2">
                                            <div className="flex items-center justify-between text-xs text-[var(--zyllen-muted)]">
                                                <span>{new Date(r.receivedAt).toLocaleString("pt-BR")}</span>
                                                <span>por {r.receivedBy?.name}</span>
                                            </div>
                                            {r.items?.map((ri: any) => (
                                                <div key={ri.id} className="flex items-center justify-between mt-1">
                                                    <span className="text-sm text-white">{ri.sku?.name}</span>
                                                    <Badge variant="success">{ri.qtyReceived} un</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Receive form */}
                            {!["COMPLETED", "CANCELLED"].includes(detail.data.status) && (
                                <div className="border-t border-[var(--zyllen-border)] pt-4">
                                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                        <TruckIcon size={14} className="text-[var(--zyllen-highlight)]" /> Registrar Recebimento
                                    </h3>
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            const items = detail.data.items.map((item: any) => ({
                                                skuId: item.skuId,
                                                qtyReceived: +(document.getElementById(`recv-${item.skuId}`) as HTMLInputElement)?.value || 0,
                                            })).filter((i: any) => i.qtyReceived > 0);
                                            receivePO.mutate({ locationId: recvForm.locationId, items });
                                        }}
                                        className="space-y-3"
                                    >
                                        <div className="space-y-2">
                                            <Label className="text-[var(--zyllen-muted)]">Local de Destino</Label>
                                            <select value={recvForm.locationId} onChange={(e) => setRecvForm({ ...recvForm, locationId: e.target.value })} required className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                                <option value="">Selecione...</option>
                                                {locations?.data?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                            </select>
                                        </div>
                                        {detail.data.items.map((item: any) => (
                                            <div key={item.skuId} className="flex items-center gap-3">
                                                <span className="text-sm text-white flex-1">{item.sku?.name}</span>
                                                <Input
                                                    id={`recv-${item.skuId}`}
                                                    type="number"
                                                    min={0}
                                                    defaultValue={0}
                                                    className="w-24 bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-center"
                                                />
                                            </div>
                                        ))}
                                        <Button type="submit" variant="highlight" className="w-full" disabled={receivePO.isPending}>Confirmar Recebimento</Button>
                                    </form>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="lg:col-span-2 flex items-center justify-center text-[var(--zyllen-muted)] text-sm">
                        Selecione um pedido para ver os detalhes
                    </div>
                )}
            </div>
        </div>
    );
}
