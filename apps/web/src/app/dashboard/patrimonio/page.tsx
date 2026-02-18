"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Badge } from "@web/components/ui/badge";
import { ScanBarcode, Search, Clock, MapPin, Tag, ArrowRight } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { EMPTY_STATES, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";

export default function PatrimonioPage() {
    const fetchOpts = useAuthedFetch();
    const [searchCode, setSearchCode] = useState("");
    const [selectedAsset, setSelectedAsset] = useState<any>(null);

    const { data: assets, isLoading: loadingAssets } = useQuery({
        queryKey: ["assets"],
        queryFn: () => apiClient.get<{ data: any[] }>("/assets", fetchOpts),
    });

    const { data: timeline, isLoading: loadingTimeline } = useQuery({
        queryKey: ["timeline", selectedAsset?.id],
        queryFn: () => apiClient.get<{ data: any[] }>(`/assets/${selectedAsset.id}/timeline`, fetchOpts),
        enabled: !!selectedAsset?.id,
    });

    const handleLookup = async () => {
        if (!searchCode.trim()) return;
        try {
            const res = await apiClient.get<{ data: any }>(`/assets/lookup/${searchCode.trim()}`, fetchOpts);
            setSelectedAsset(res.data);
        } catch {
            setSelectedAsset(null);
        }
    };

    const statusColor: Record<string, "success" | "warning" | "destructive" | "default"> = {
        ATIVO: "success",
        EM_MANUTENCAO: "warning",
        INATIVO: "destructive",
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ScanBarcode className="text-[var(--zyllen-highlight)]" /> Patrimônio
            </h1>
            <p className="text-sm text-[var(--zyllen-muted)] mt-1">{PAGE_DESCRIPTIONS.patrimonio}</p>

            {/* Bipagem Search */}
            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                            <Input
                                value={searchCode}
                                onChange={(e) => setSearchCode(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                                placeholder="Bipar ou digitar código SKY-XXXXX..."
                                className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-10 font-mono"
                            />
                        </div>
                        <Button variant="highlight" onClick={handleLookup}>
                            <Search size={16} /> Buscar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Asset Detail */}
            {selectedAsset && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-highlight)]/20 lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-[var(--zyllen-highlight)] font-mono text-lg">
                                {selectedAsset.assetCode}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-xs text-[var(--zyllen-muted)]">Item</p>
                                <p className="text-white font-medium">{selectedAsset.sku?.name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--zyllen-muted)]">SKU</p>
                                <p className="text-white font-mono text-sm">{selectedAsset.sku?.skuCode}</p>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--zyllen-muted)]">Status</p>
                                <Badge variant={statusColor[selectedAsset.status] ?? "default"}>{selectedAsset.status}</Badge>
                            </div>
                            <div>
                                <p className="text-xs text-[var(--zyllen-muted)]">Local Atual</p>
                                <p className="text-white flex items-center gap-1"><MapPin size={14} /> {selectedAsset.currentLocation?.name ?? "Sem local"}</p>
                            </div>
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
                                            <Skeleton className="size-2 rounded-full mt-2" />
                                            <Skeleton className="h-16 flex-1 rounded-lg" />
                                        </div>
                                    ))}
                                </div>
                            ) : timeline?.data?.length ? (
                                <div className="space-y-3 relative">
                                    <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--zyllen-border)]" />
                                    {timeline.data.map((event: any, idx: number) => (
                                        <div key={idx} className="flex gap-4 relative">
                                            <div className="size-2 rounded-full bg-[var(--zyllen-highlight)] mt-2 z-10 ring-4 ring-[var(--zyllen-bg)]" />
                                            <div className="flex-1 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                                <div className="flex items-center justify-between">
                                                    <Badge variant="outline" className="text-xs">{event.type}</Badge>
                                                    <span className="text-xs text-[var(--zyllen-muted)]">
                                                        {new Date(event.date).toLocaleString("pt-BR")}
                                                    </span>
                                                </div>
                                                {event.description && (
                                                    <p className="text-sm text-white mt-1">{event.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[var(--zyllen-muted)] text-center py-4">{EMPTY_STATES.assetTimeline}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Assets List */}
            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                <CardHeader>
                    <CardTitle className="text-white">Todos os Patrimônios</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingAssets ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-6 w-16" />
                                    <Skeleton className="h-4 w-20" />
                                </div>
                            ))}
                        </div>
                    ) : assets?.data?.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--zyllen-border)]">
                                        <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Código</th>
                                        <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Item</th>
                                        <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Status</th>
                                        <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Local</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assets.data.map((a: any) => (
                                        <tr
                                            key={a.id}
                                            className="border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02] cursor-pointer"
                                            onClick={() => setSelectedAsset(a)}
                                        >
                                            <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{a.assetCode}</td>
                                            <td className="py-3 text-white">{a.sku?.name}</td>
                                            <td className="py-3"><Badge variant={statusColor[a.status] ?? "default"}>{a.status}</Badge></td>
                                            <td className="py-3 text-[var(--zyllen-muted)]">{a.currentLocation?.name ?? "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <ScanBarcode size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/50" />
                            <p className="text-[var(--zyllen-muted)]">{EMPTY_STATES.assets}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
