"use client";

import { Badge } from "@web/components/ui/badge";
import { Package, Hash } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@web/components/ui/dialog";
import { assetStateBadge } from "@web/features/inventory/utils/asset-state-badge";
import type { InventoryController } from "../hooks/use-inventory-controller";

export function InventoryAssetDetailSection({ controller }: { controller: InventoryController }) {
    const { detailSku, setDetailSku, detailAssets, loadingDetail } = controller;
    return (<Dialog open={!!detailSku} onOpenChange={(open) => { if (!open) setDetailSku(null); }}>
                <DialogContent className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-2xl" onClose={() => setDetailSku(null)}>
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Hash size={18} className="text-[var(--zyllen-highlight)]" />
                            Patrimônios — {detailSku?.name}
                            {detailSku?.skuCode && <span className="font-mono text-xs text-[var(--zyllen-muted)]">{detailSku.skuCode}</span>}
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {loadingDetail ? (
                            <div className="space-y-2">
                                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                            </div>
                        ) : detailAssets?.data?.length ? (
                            <div className="overflow-y-auto max-h-96">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--zyllen-border)]">
                                            <th className="text-left py-2 text-[var(--zyllen-muted)] font-medium">Código</th>
                                            <th className="text-left py-2 text-[var(--zyllen-muted)] font-medium">Status</th>
                                            <th className="text-left py-2 text-[var(--zyllen-muted)] font-medium hidden sm:table-cell">Local</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailAssets.data.map((a: any) => (
                                            <tr key={a.id} className="border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02]">
                                                <td className="py-2.5 font-mono text-[var(--zyllen-highlight)] text-xs">{a.assetCode}</td>
                                                <td className="py-2.5">
                                                    {(() => { const st = assetStateBadge(a); return <Badge variant={st.variant}>{st.label}</Badge>; })()}
                                                </td>
                                                <td className="py-2.5 text-[var(--zyllen-muted)] text-xs hidden sm:table-cell">{a.currentLocation?.name ?? "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Package size={32} className="mx-auto mb-2 text-[var(--zyllen-muted)]/50" />
                                <p className="text-[var(--zyllen-muted)] text-sm">Nenhum patrimônio encontrado para este item.</p>
                            </div>
                        )}
                    </DialogBody>
                </DialogContent>
            </Dialog>);
}
