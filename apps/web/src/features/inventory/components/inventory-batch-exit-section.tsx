"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { Search, Loader2, TrendingDown, X, MapPin, CheckCircle2, Trash2 } from "lucide-react";

import type { InventoryController } from "../hooks/use-inventory-controller";
import { internalExitDestination } from '@zyllen/shared';
import { selectableExitReason } from '../utils/inventory-form-options';

export function InventoryBatchExitSection({ controller }: { controller: InventoryController }) {
    const {
        batchQueue,
        setBatchQueue,
        batchScan,
        setBatchScan,
        batchScanning,
        batchResults,
        setBatchResults,
        batchMotivo,
        setBatchMotivo,
        batchDetail,
        setBatchDetail,
        batchEvent,
        setBatchEvent,
        batchPin,
        setBatchPin,
        batchCompanyId,
        setBatchCompanyId,
        batchProjectId,
        setBatchProjectId,
        batchScanRef,
        custodyOptions,
        exitReasons,
        batchAddAsset,
        handleBatchScan,
        batchExitMut,
        handleBatchSubmit,
    } = controller;
    const companies = custodyOptions?.data?.companies ?? [];
    const projects = companies.find(company => company.id === batchCompanyId)?.projects ?? [];
    const internalDestination = internalExitDestination(batchMotivo);
    return ((
                <div className="grid lg:grid-cols-3 gap-4 items-start">
                    <div className="lg:col-span-2 space-y-4">
                        {/* Bipagem / busca */}
                        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-white flex items-center gap-2 text-base">
                                    <TrendingDown size={18} className="text-rose-400" /> Saída em Lote
                                </CardTitle>
                                <p className="text-xs text-[var(--zyllen-muted)]">Bipe a etiqueta, digite o código ou o nome do item e pressione Enter para adicionar à lista</p>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                                        {batchScanning && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--zyllen-muted)]" />}
                                        <input
                                            ref={batchScanRef}
                                            autoFocus
                                            type="text"
                                            autoComplete="off"
                                            value={batchScan}
                                            onChange={(e) => setBatchScan(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleBatchScan()}
                                            placeholder="Bipe a etiqueta ou digite código/nome..."
                                            className="w-full h-10 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-9 pr-9 text-sm font-mono placeholder:text-[var(--zyllen-muted)]/60 placeholder:font-sans focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                                        />
                                    </div>
                                    <Button variant="highlight" onClick={handleBatchScan} disabled={batchScanning} className="shrink-0">
                                        {batchScanning ? <Loader2 size={15} className="animate-spin" /> : "Adicionar"}
                                    </Button>
                                </div>

                                {/* Resultados da busca por nome */}
                                {batchResults.length > 0 && (
                                    <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)]">
                                        {batchResults.map((a: any) => (
                                            <button
                                                key={a.id}
                                                type="button"
                                                onClick={() => { if (batchAddAsset(a)) setBatchResults((prev) => prev.filter((r) => r.id !== a.id)); }}
                                                className="w-full text-left px-3 py-2.5 hover:bg-[var(--zyllen-highlight)]/10 transition-colors flex items-center gap-3 text-sm border-b border-[var(--zyllen-border)]/30 last:border-0"
                                            >
                                                <span className="font-mono text-[var(--zyllen-highlight)] text-xs w-24 shrink-0">{a.assetCode}</span>
                                                <span className="text-white text-xs truncate flex-1">{a.sku?.name}</span>
                                                <span className="text-[var(--zyllen-muted)] text-xs shrink-0 flex items-center gap-1">
                                                    <MapPin size={10} /> {a.currentLocation?.name ?? "—"}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Lista de itens adicionados */}
                        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                <CardTitle className="text-white text-sm">Itens para saída ({batchQueue.size})</CardTitle>
                                {batchQueue.size > 0 && (
                                    <button onClick={() => setBatchQueue(new Map())} className="text-xs text-[var(--zyllen-muted)] hover:text-red-400 flex items-center gap-1">
                                        <Trash2 size={13} /> Limpar lista
                                    </button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {batchQueue.size === 0 ? (
                                    <p className="text-[var(--zyllen-muted)] text-sm text-center py-6">Nenhum item na lista. Bipe ou busque acima para adicionar.</p>
                                ) : (
                                    <div className="space-y-2 max-h-[420px] overflow-y-auto">
                                        {[...batchQueue.values()].map((a: any) => (
                                            <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                                <span className="font-mono text-[var(--zyllen-highlight)] text-xs w-24 shrink-0">{a.assetCode}</span>
                                                <span className="text-white text-sm truncate flex-1">{a.sku?.name}</span>
                                                <span className="text-[var(--zyllen-muted)] text-xs shrink-0 hidden sm:flex items-center gap-1">
                                                    <MapPin size={10} /> {a.currentLocation?.name ?? "—"}
                                                </span>
                                                <button
                                                    onClick={() => setBatchQueue((prev) => { const n = new Map(prev); n.delete(a.id); return n; })}
                                                    className="text-[var(--zyllen-muted)] hover:text-red-400 shrink-0"
                                                >
                                                    <X size={15} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Campos finais — aplicam a todos de uma vez. Sticky com rolagem
                        interna para nunca cortar campos em telas baixas/zoom alto. */}
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-highlight)]/20 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white text-sm">Aplicar a todos ({batchQueue.size})</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {internalDestination && <p className="text-xs text-amber-200">Destino automático: {internalDestination.locationName}. Os patrimônios e suas timelines serão preservados.</p>}
                            {!internalDestination && <><div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Cliente *</Label>
                                <select aria-label="Cliente" value={batchCompanyId} onChange={(e) => { setBatchCompanyId(e.target.value); setBatchProjectId(""); }} className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                    <option value="">Selecione...</option>
                                    {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Projeto *</Label>
                                <select aria-label="Projeto" value={batchProjectId} onChange={(e) => setBatchProjectId(e.target.value)} disabled={!batchCompanyId} className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm disabled:opacity-50">
                                    <option value="">Selecione...</option>
                                    {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                                </select>
                            </div></>}
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Motivo da Saída *</Label>
                                <select
                                    aria-label="Motivo da saída"
                                    value={batchMotivo}
                                    onChange={(e) => setBatchMotivo(e.target.value)}
                                    className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm"
                                >
                                    <option value="">Selecione...</option>
                                    {exitReasons?.data?.filter((reason: { name: string }) => selectableExitReason(reason.name)).map((reason: { id: string; name: string }) => <option key={reason.id} value={reason.name}>{reason.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Detalhe (opcional)</Label>
                                <Input value={batchDetail} onChange={(e) => setBatchDetail(e.target.value)} placeholder="Complemento do motivo..." autoComplete="off" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Evento na timeline *</Label>
                                <Input aria-label="Evento na timeline" value={batchEvent} onChange={(e) => setBatchEvent(e.target.value)} placeholder="Ex: Enviado para a obra X" autoComplete="off" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                <p className="text-[10px] text-[var(--zyllen-muted)]">Digitado uma vez, entra na timeline de CADA item da lista.</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">PIN *</Label>
                                <Input aria-label="PIN" type="password" autoComplete="new-password" maxLength={4} placeholder="••••" value={batchPin} onChange={(e) => setBatchPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleBatchSubmit()} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-center tracking-widest" />
                            </div>
                            <Button
                                variant="highlight"
                                className="w-full"
                                onClick={handleBatchSubmit}
                                disabled={batchExitMut.isPending || batchQueue.size === 0}
                            >
                                {batchExitMut.isPending ? (
                                    <><Loader2 size={15} className="animate-spin" /> Registrando...</>
                                ) : (
                                    <><CheckCircle2 size={15} /> Dar saída em {batchQueue.size} {batchQueue.size === 1 ? "item" : "itens"}</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            ));
}
