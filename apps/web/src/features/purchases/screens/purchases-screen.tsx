"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { PageHeader } from "@web/components/ui/page-header";
import { Select, SelectOption } from "@web/components/ui/select";
import { Skeleton } from "@web/components/ui/skeleton";
import { EmptyState, ListSectionHeader, RecordList, RecordRow } from "@web/components/ui/workspace";
import { useAuthedFetch } from "@web/features/auth/context/auth-context";
import { apiClient } from "@web/lib/api-client";
import { EMPTY_STATES, PAGE_DESCRIPTIONS, TOASTS } from "@web/lib/brand-voice";
import { ChevronRight, Package, Plus, ShoppingCart, TruckIcon, X } from "lucide-react";
import { toast } from "sonner";

export default function ComprasPage() {
    const fetchOpts = useAuthedFetch();
    const queryClient = useQueryClient();
    const [showCreate, setShowCreate] = useState(false);
    const [selectedPO, setSelectedPO] = useState<any>(null);
    const [form, setForm] = useState({ supplierId: "", skuId: "", qtyOrdered: 1 });
    const [recvForm, setRecvForm] = useState<{ locationId: string; items: Record<string, number> }>({ locationId: "", items: {} });

    const { data: pos, isLoading: loadingPOs } = useQuery({
        queryKey: ["purchases"],
        queryFn: () => apiClient.get<{ data: any[] }>("/purchases", fetchOpts),
    });
    const { data: detail, isLoading: loadingDetail } = useQuery({
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
        onSuccess: () => {
            toast.success(TOASTS.orderCreated);
            queryClient.invalidateQueries({ queryKey: ["purchases"] });
            setShowCreate(false);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const receivePO = useMutation({
        mutationFn: (data: any) => apiClient.post(`/purchases/${selectedPO.id}/receive`, data, fetchOpts),
        onSuccess: () => {
            toast.success(TOASTS.receiptConfirmed);
            queryClient.invalidateQueries({ queryKey: ["purchases"] });
            queryClient.invalidateQueries({ queryKey: ["purchase", selectedPO?.id] });
        },
        onError: (error: any) => toast.error(error.message),
    });

    const statusColor: Record<string, "default" | "warning" | "success" | "destructive" | "secondary"> = {
        DRAFT: "secondary",
        SENT: "default",
        PARTIAL: "warning",
        COMPLETED: "success",
        CANCELLED: "destructive",
    };

    return (
        <div className="space-y-8">
            <PageHeader
                eyebrow="Estoque e patrimônio"
                title="Compras"
                description={PAGE_DESCRIPTIONS.compras}
                actions={(
                    <Button variant="highlight" onClick={() => setShowCreate((open) => !open)}>
                        {showCreate ? <X size={16} /> : <Plus size={16} />}
                        {showCreate ? "Fechar formulário" : "Novo pedido"}
                    </Button>
                )}
            />

            {showCreate && (
                <Card className="max-w-2xl border-[var(--zyllen-highlight)]/25 bg-[var(--zyllen-bg)]">
                    <CardHeader>
                        <CardTitle className="text-white">Novo pedido de compra</CardTitle>
                        <p className="text-sm text-[var(--zyllen-muted)]">Informe o fornecedor, o item e a quantidade inicial do pedido.</p>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                createPO.mutate({ supplierId: form.supplierId, items: [{ skuId: form.skuId, qtyOrdered: form.qtyOrdered }] });
                            }}
                            className="grid gap-4 sm:grid-cols-2"
                        >
                            <div className="space-y-2">
                                <Label>Fornecedor</Label>
                                <Select value={form.supplierId} onValueChange={(supplierId) => setForm({ ...form, supplierId })} required aria-label="Fornecedor do pedido">
                                    <SelectOption value="">Selecione...</SelectOption>
                                    {suppliers?.data?.map((supplier: any) => <SelectOption key={supplier.id} value={supplier.id}>{supplier.name}</SelectOption>)}
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Item</Label>
                                <Select value={form.skuId} onValueChange={(skuId) => setForm({ ...form, skuId })} required aria-label="Item do pedido">
                                    <SelectOption value="">Selecione...</SelectOption>
                                    {skus?.data?.map((sku: any) => <SelectOption key={sku.id} value={sku.id}>{sku.skuCode} — {sku.name}</SelectOption>)}
                                </Select>
                            </div>
                            <div className="space-y-2 sm:max-w-40">
                                <Label htmlFor="purchase-quantity">Quantidade</Label>
                                <Input
                                    id="purchase-quantity"
                                    type="number"
                                    min={1}
                                    value={form.qtyOrdered}
                                    onChange={(event) => setForm({ ...form, qtyOrdered: Number(event.target.value) })}
                                />
                            </div>
                            <div className="flex items-end sm:justify-end">
                                <Button type="submit" variant="highlight" disabled={createPO.isPending}>
                                    {createPO.isPending ? "Criando pedido..." : "Criar pedido"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-8 lg:grid-cols-[minmax(17rem,.8fr)_minmax(0,1.7fr)]">
                <section className="space-y-4" aria-label="Pedidos de compra">
                    <ListSectionHeader
                        title="Pedidos de compra"
                        count={pos?.data?.length ?? 0}
                        description="Selecione um pedido para acompanhar itens e recebimentos."
                    />

                    {loadingPOs ? (
                        <div className="divide-y divide-white/10 border-y border-white/10">
                            {[...Array(4)].map((_, index) => (
                                <div key={index} className="space-y-2 px-3 py-4">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-3 w-40" />
                                </div>
                            ))}
                        </div>
                    ) : pos?.data?.length ? (
                        <RecordList>
                            {pos.data.map((po: any) => (
                                <RecordRow
                                    key={po.id}
                                    onClick={() => setSelectedPO(po)}
                                    aria-pressed={selectedPO?.id === po.id}
                                    className={selectedPO?.id === po.id ? "bg-[var(--zyllen-highlight)]/[0.055] before:scale-y-100" : undefined}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-mono text-sm font-semibold text-white">{po.number}</p>
                                            <p className="mt-1 truncate text-xs text-[var(--zyllen-muted)]">{po.supplier?.name ?? "Fornecedor não informado"}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <Badge variant={statusColor[po.status] ?? "default"} className="text-[10px]">{po.status}</Badge>
                                            <ChevronRight size={14} className="text-white/25" aria-hidden="true" />
                                        </div>
                                    </div>
                                </RecordRow>
                            ))}
                        </RecordList>
                    ) : (
                        <EmptyState
                            icon={<ShoppingCart size={28} />}
                            title="Nenhum pedido de compra"
                            description={EMPTY_STATES.purchases}
                            action={<Button variant="outline" size="sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Criar pedido</Button>}
                        />
                    )}
                </section>

                <section className="min-w-0 space-y-6" aria-label="Detalhes do pedido">
                    {selectedPO && loadingDetail ? (
                        <div className="space-y-4 border-y border-white/10 py-5">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : selectedPO && detail?.data ? (
                        <>
                            <ListSectionHeader
                                title={detail.data.number}
                                description={detail.data.supplier?.name ? `Fornecedor: ${detail.data.supplier.name}` : "Detalhes e recebimentos deste pedido."}
                                actions={<Badge variant={statusColor[detail.data.status] ?? "default"}>{detail.data.status}</Badge>}
                            />

                            <div className="space-y-3">
                                <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Itens do pedido</h3>
                                <div className="divide-y divide-white/10 border-y border-white/10">
                                    {detail.data.items?.map((item: any) => (
                                        <div key={item.id} className="flex items-center justify-between gap-4 px-3 py-4 sm:px-4">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-white">{item.sku?.name}</p>
                                                <p className="mt-0.5 font-mono text-xs text-[var(--zyllen-muted)]">{item.sku?.skuCode}</p>
                                            </div>
                                            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-white">{item.qtyOrdered} un</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {detail.data.receivings?.length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Recebimentos</h3>
                                    <div className="divide-y divide-white/10 border-y border-white/10">
                                        {detail.data.receivings.map((receiving: any) => (
                                            <div key={receiving.id} className="space-y-3 px-3 py-4 sm:px-4">
                                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--zyllen-muted)]">
                                                    <span className="tabular-nums">{new Date(receiving.receivedAt).toLocaleString("pt-BR")}</span>
                                                    <span>por {receiving.receivedBy?.name}</span>
                                                </div>
                                                {receiving.items?.map((receivedItem: any) => (
                                                    <div key={receivedItem.id} className="flex items-center justify-between gap-3">
                                                        <span className="text-sm text-white">{receivedItem.sku?.name}</span>
                                                        <Badge variant="success">{receivedItem.qtyReceived} un</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!['COMPLETED', 'CANCELLED'].includes(detail.data.status) && (
                                <Card className="border-[var(--zyllen-highlight)]/20 bg-[var(--zyllen-bg)]">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-white">
                                            <TruckIcon size={16} className="text-[var(--zyllen-highlight)]" /> Registrar recebimento
                                        </CardTitle>
                                        <p className="text-sm text-[var(--zyllen-muted)]">Escolha o destino e informe somente as quantidades recebidas agora.</p>
                                    </CardHeader>
                                    <CardContent>
                                        <form
                                            onSubmit={(event) => {
                                                event.preventDefault();
                                                const items = Object.entries(recvForm.items)
                                                    .filter(([, quantity]) => quantity > 0)
                                                    .map(([skuId, qtyReceived]) => ({ skuId, qtyReceived }));
                                                if (!items.length) {
                                                    toast.error("Informe ao menos 1 item");
                                                    return;
                                                }
                                                receivePO.mutate({ locationId: recvForm.locationId, items });
                                            }}
                                            className="space-y-4"
                                        >
                                            <div className="max-w-md space-y-2">
                                                <Label>Local de destino</Label>
                                                <Select value={recvForm.locationId} onValueChange={(locationId) => setRecvForm({ ...recvForm, locationId })} required aria-label="Local de destino do recebimento">
                                                    <SelectOption value="">Selecione...</SelectOption>
                                                    {locations?.data?.map((location: any) => <SelectOption key={location.id} value={location.id}>{location.name}</SelectOption>)}
                                                </Select>
                                            </div>
                                            <div className="divide-y divide-white/10 border-y border-white/10">
                                                {detail.data.items.map((item: any) => (
                                                    <div key={item.skuId} className="flex items-center gap-4 py-3">
                                                        <Label htmlFor={`receive-${item.skuId}`} className="min-w-0 flex-1 truncate text-sm text-white">{item.sku?.name}</Label>
                                                        <Input
                                                            id={`receive-${item.skuId}`}
                                                            aria-label={`Quantidade recebida de ${item.sku?.name ?? "item"}`}
                                                            type="number"
                                                            min={0}
                                                            value={recvForm.items[item.skuId] ?? 0}
                                                            onChange={(event) => setRecvForm({ ...recvForm, items: { ...recvForm.items, [item.skuId]: Number(event.target.value) } })}
                                                            className="w-24 text-center"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-end">
                                                <Button type="submit" variant="highlight" disabled={receivePO.isPending}>
                                                    {receivePO.isPending ? "Confirmando..." : "Confirmar recebimento"}
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    ) : (
                        <EmptyState
                            icon={<Package size={28} />}
                            title="Selecione um pedido"
                            description={EMPTY_STATES.purchaseDetail}
                        />
                    )}
                </section>
            </div>
        </div>
    );
}
