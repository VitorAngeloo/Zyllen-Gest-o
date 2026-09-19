"use client";

import { ArrowDownCircle, CheckCircle2, Loader2, MapPin, Search, Trash2, X } from "lucide-react";
import { Button } from "@web/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import type { InventoryController } from "../hooks/use-inventory-controller";

export function InventoryBatchEntrySection({ controller }: { controller: InventoryController }) {
    const {
        batchEntryQueue, setBatchEntryQueue, batchEntryScan, setBatchEntryScan, batchEntryScanning,
        batchEntryResults, setBatchEntryResults, batchEntryLocationId, setBatchEntryLocationId,
        batchEntryStatus, setBatchEntryStatus, batchEntryReason, setBatchEntryReason,
        batchEntryEvent, setBatchEntryEvent, batchEntryPin, setBatchEntryPin, batchEntryScanRef,
        locations, batchEntryAddAsset, handleBatchEntryScan, batchEntryMut, handleBatchEntrySubmit,
    } = controller;
    const internalLocations = (locations?.data ?? []).filter((location: any) => location.kind === "INTERNAL");

    return <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
            <Card className="border-[var(--zyllen-border)] bg-[var(--zyllen-bg)]">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base text-white"><ArrowDownCircle size={18} className="text-emerald-400" /> Entrada em lote</CardTitle>
                    <p className="text-xs text-[var(--zyllen-muted)]">Bipe ou pesquise patrimônios existentes. A origem é identificada automaticamente pelo sistema.</p>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                            {batchEntryScanning && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--zyllen-muted)]" />}
                            <input ref={batchEntryScanRef} autoFocus value={batchEntryScan} onChange={event => setBatchEntryScan(event.target.value)} onKeyDown={event => event.key === "Enter" && handleBatchEntryScan()} placeholder="Bipe a etiqueta ou digite código/nome..." className="h-10 w-full rounded-md border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] pl-9 pr-9 text-sm text-white placeholder:font-sans placeholder:text-[var(--zyllen-muted)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50" />
                        </div>
                        <Button variant="highlight" onClick={handleBatchEntryScan} disabled={batchEntryScanning}>{batchEntryScanning ? <Loader2 size={15} className="animate-spin" /> : "Adicionar"}</Button>
                    </div>
                    {!!batchEntryResults.length && <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)]">
                        {batchEntryResults.map((asset: any) => <button key={asset.id} type="button" onClick={() => { if (batchEntryAddAsset(asset)) setBatchEntryResults(previous => previous.filter(item => item.id !== asset.id)); }} className="flex w-full items-center gap-3 border-b border-[var(--zyllen-border)]/30 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-[var(--zyllen-highlight)]/10">
                            <span className="w-24 shrink-0 font-mono text-xs text-[var(--zyllen-highlight)]">{asset.assetCode}</span>
                            <span className="min-w-0 flex-1 truncate text-xs text-white">{asset.sku?.name}</span>
                            <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--zyllen-muted)]"><MapPin size={10} /> {asset.currentLocation?.name ?? "Sem local"}</span>
                        </button>)}
                    </div>}
                </CardContent>
            </Card>

            <Card className="border-[var(--zyllen-border)] bg-[var(--zyllen-bg)]">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm text-white">Patrimônios para entrada ({batchEntryQueue.size})</CardTitle>
                    {!!batchEntryQueue.size && <button onClick={() => setBatchEntryQueue(new Map())} className="flex items-center gap-1 text-xs text-[var(--zyllen-muted)] hover:text-red-400"><Trash2 size={13} /> Limpar lista</button>}
                </CardHeader>
                <CardContent>
                    {!batchEntryQueue.size ? <p className="py-6 text-center text-sm text-[var(--zyllen-muted)]">Nenhum patrimônio adicionado.</p> : <div className="max-h-[420px] space-y-2 overflow-y-auto">
                        {[...batchEntryQueue.values()].map((asset: any) => <div key={asset.id} className="flex items-center gap-3 rounded-lg border border-[var(--zyllen-border)]/50 bg-[var(--zyllen-bg-dark)] p-2.5">
                            <span className="w-24 shrink-0 font-mono text-xs text-[var(--zyllen-highlight)]">{asset.assetCode}</span>
                            <span className="min-w-0 flex-1 truncate text-sm text-white">{asset.sku?.name}</span>
                            <span className="hidden shrink-0 items-center gap-1 text-xs text-[var(--zyllen-muted)] sm:flex"><MapPin size={10} /> {asset.currentLocation?.name ?? "Sem local"}</span>
                            <button onClick={() => setBatchEntryQueue(previous => { const next = new Map(previous); next.delete(asset.id); return next; })} className="text-[var(--zyllen-muted)] hover:text-red-400"><X size={15} /></button>
                        </div>)}
                    </div>}
                </CardContent>
            </Card>
        </div>

        <Card className="border-[var(--zyllen-highlight)]/20 bg-[var(--zyllen-bg)] lg:sticky lg:top-4">
            <CardHeader className="pb-3"><CardTitle className="text-sm text-white">Aplicar a todos ({batchEntryQueue.size})</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <label className="block space-y-2 text-sm text-[var(--zyllen-muted)]">Estoque Skyline de destino *
                    <select value={batchEntryLocationId} onChange={event => setBatchEntryLocationId(event.target.value)} className="h-9 w-full rounded-md border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] px-3 text-sm text-white"><option value="">Selecione...</option>{internalLocations.map((location: any) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
                </label>
                <label className="block space-y-2 text-sm text-[var(--zyllen-muted)]">Condição dos itens *
                    <select value={batchEntryStatus} onChange={event => setBatchEntryStatus(event.target.value as "ATIVO" | "EM_MANUTENCAO")} className="h-9 w-full rounded-md border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] px-3 text-sm text-white"><option value="ATIVO">Disponível</option><option value="EM_MANUTENCAO">Em manutenção</option></select>
                </label>
                <div className="space-y-2"><Label className="text-[var(--zyllen-muted)]">Motivo *</Label><Input aria-label="Motivo da entrada" value={batchEntryReason} onChange={event => setBatchEntryReason(event.target.value)} placeholder="Ex: retorno do projeto" className="border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] text-white" /></div>
                <div className="space-y-2"><Label className="text-[var(--zyllen-muted)]">Evento na timeline *</Label><Input aria-label="Evento na timeline" value={batchEntryEvent} onChange={event => setBatchEntryEvent(event.target.value)} placeholder="Ex: Retornou ao Almoxarifado Skyline em..." className="border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] text-white" /><p className="text-[10px] text-[var(--zyllen-muted)]">O texto será registrado na timeline de cada patrimônio.</p></div>
                <div className="space-y-2"><Label className="text-[var(--zyllen-muted)]">PIN *</Label><Input aria-label="PIN" type="password" maxLength={4} value={batchEntryPin} onChange={event => setBatchEntryPin(event.target.value)} onKeyDown={event => event.key === "Enter" && handleBatchEntrySubmit()} className="border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] text-center tracking-widest text-white" /></div>
                <Button variant="highlight" className="w-full" onClick={handleBatchEntrySubmit} disabled={batchEntryMut.isPending || !batchEntryQueue.size}>{batchEntryMut.isPending ? <><Loader2 size={15} className="animate-spin" /> Registrando...</> : <><CheckCircle2 size={15} /> Registrar entrada de {batchEntryQueue.size}</>}</Button>
            </CardContent>
        </Card>
    </div>;
}
