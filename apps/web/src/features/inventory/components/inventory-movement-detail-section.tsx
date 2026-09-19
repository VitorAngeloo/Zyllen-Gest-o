"use client";

import { ShareAttachment } from '@web/components/media/share-attachment';
import { Badge } from "@web/components/ui/badge";
import { History, Camera, MapPin, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@web/components/ui/dialog";
import { API_BASE } from "@web/features/inventory/inventory.constants";
import type { InventoryController } from "../hooks/use-inventory-controller";

export function InventoryMovementDetailSection({ controller }: { controller: InventoryController }) {
    const { detailMovement, setDetailMovement } = controller;
    return (<Dialog open={!!detailMovement} onOpenChange={(open) => { if (!open) setDetailMovement(null); }}>
                <DialogContent className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-lg" onClose={() => setDetailMovement(null)}>
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <History size={18} className="text-[var(--zyllen-highlight)]" />
                            Detalhes da movimentação
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {detailMovement && (() => {
                            const m = detailMovement;
                            const isEntrada = !!m.toLocationId && !m.fromLocationId;
                            const isSaida = !m.toLocationId && !!m.fromLocationId;
                            const tipoLabel = m.type?.name ?? (isEntrada ? "Entrada" : isSaida ? "Saída" : "Transferência");
                            const rows: { label: string; value: React.ReactNode }[] = [
                                { label: "Data e hora", value: new Date(m.createdAt).toLocaleString("pt-BR") },
                                { label: "Item", value: <span><span className="font-mono text-[var(--zyllen-highlight)]">{m.sku?.skuCode}</span>{m.sku?.name ? ` — ${m.sku.name}` : ""}</span> },
                                ...(m.asset?.assetCode ? [{ label: "Patrimônio", value: <span className="font-mono text-white">{m.asset.assetCode}</span> }] : []),
                                { label: "Quantidade", value: <span className="text-white font-semibold">{m.qty}</span> },
                                { label: "Origem", value: m.fromLocation?.name ?? "—" },
                                { label: "Destino", value: m.toLocation?.name ?? "—" },
                                { label: "Responsável", value: m.createdBy?.name ?? "—" },
                                { label: "Motivo", value: m.reason ?? "—" },
                            ];
                            return (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={isSaida ? "destructive" : "success"}>{tipoLabel}</Badge>
                                        {m.fromLocation?.name && m.toLocation?.name && (
                                            <span className="text-xs text-[var(--zyllen-muted)] flex items-center gap-1">
                                                <MapPin size={11} /> {m.fromLocation.name} <ChevronRight size={12} /> {m.toLocation.name}
                                            </span>
                                        )}
                                    </div>

                                    <div className="divide-y divide-white/10 border-y border-white/10">
                                        {rows.map((r) => (
                                            <div key={r.label} className="grid gap-1 px-1 py-3 text-sm sm:grid-cols-[8rem_1fr] sm:gap-4">
                                                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">{r.label}</span>
                                                <span className="text-white sm:text-right">{r.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Anexos de mídia */}
                                    {m.mediaAttachments?.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-[var(--zyllen-muted)] flex items-center gap-1.5">
                                                <Camera size={13} /> Anexos ({m.mediaAttachments.length})
                                            </p>
                                            <div className="grid grid-cols-3 gap-2">
                                                {m.mediaAttachments.map((att: any) => {
                                                    const url = `${API_BASE}${att.filePath}`;
                                                    const isImage = att.mediaType === "IMAGE" || att.mimeType?.startsWith("image/");
                                                    return (
                                                        <div key={att.id}><a
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block overflow-hidden border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] transition-colors hover:border-[var(--zyllen-highlight)]/40"
                                                            title={att.fileName}
                                                        >
                                                            {isImage ? (
                                                                <img src={url} alt={att.fileName} className="h-20 w-full object-cover" />
                                                            ) : (
                                                                <video src={url} className="h-20 w-full object-cover" />
                                                            )}
                                                        </a>
                                                        <ShareAttachment kind="item" id={att.id} fileName={att.fileName} /></div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </DialogBody>
                </DialogContent>
            </Dialog>);
}
