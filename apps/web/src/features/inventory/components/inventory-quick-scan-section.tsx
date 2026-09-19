"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { Badge } from "@web/components/ui/badge";
import { ArrowDownCircle, ArrowUpCircle, Search, Loader2, X, MapPin, RefreshCw, Zap, CheckCircle2 } from "lucide-react";

import type { InventoryController } from "../hooks/use-inventory-controller";

export function InventoryQuickScanSection({ controller }: { controller: InventoryController }) {
    const {
        bipeCode,
        setBipeCode,
        bipeSku,
        setBipeSku,
        bipeAsset,
        bipeScanning,
        bipeQty,
        setBipeQty,
        bipeMode,
        setBipeMode,
        bipeLocationId,
        setBipeLocationId,
        bipePin,
        setBipePin,
        bipeSuccess,
        bipeInputRef,
        bipeQtyRef,
        balances,
        locations,
        entryMut,
        exitMut,
        resetBipeSelection,
        handleBipeScan,
        handleBipeSubmit,
    } = controller;
    return ((
                <div className="space-y-4 max-w-lg">
                    {/* Scan input */}
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white flex items-center gap-2 text-base">
                                <Zap size={18} className="text-[var(--zyllen-highlight)]" /> Bipagem Rápida
                            </CardTitle>
                            <p className="text-xs text-[var(--zyllen-muted)]">Bipe a etiqueta (código de patrimônio) ou o código do item e pressione Enter</p>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                                    {bipeScanning && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--zyllen-muted)]" />}
                                    <input
                                        ref={bipeInputRef}
                                        autoFocus
                                        type="text"
                                        value={bipeCode}
                                        onChange={(e) => setBipeCode(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleBipeScan()}
                                        placeholder="Bipe a etiqueta ou digite o código..."
                                        className="w-full h-10 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-9 pr-9 text-sm font-mono placeholder:text-[var(--zyllen-muted)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                                    />
                                </div>
                                <Button variant="highlight" onClick={handleBipeScan} disabled={bipeScanning} className="shrink-0">
                                    {bipeScanning ? <Loader2 size={15} className="animate-spin" /> : "Buscar"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Success feedback */}
                    {bipeSuccess && (
                        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                            <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
                            <p className="text-emerald-300 font-medium">Registrado com sucesso!</p>
                        </div>
                    )}

                    {/* Patrimônio encontrado (etiqueta bipada) — ação sobre o item específico */}
                    {bipeAsset && !bipeSuccess && (
                        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-highlight)]/20">
                            <CardContent className="pt-5 space-y-4">
                                {/* Patrimônio info */}
                                <div className="rounded-lg bg-[var(--zyllen-highlight)]/5 border border-[var(--zyllen-highlight)]/10 px-4 py-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-xs font-mono text-[var(--zyllen-highlight)] font-bold">{bipeAsset.assetCode}</p>
                                            <p className="text-white font-semibold truncate mt-0.5">{bipeAsset.sku?.name}</p>
                                            <p className="text-xs text-[var(--zyllen-muted)] mt-0.5 flex items-center gap-1">
                                                <MapPin size={11} /> {bipeAsset.currentLocation?.name ?? "Sem local atual"}
                                            </p>
                                        </div>
                                        <Badge variant={bipeAsset.status === "ATIVO" ? "success" : bipeAsset.status === "EM_USO" ? "default" : "destructive"}>
                                            {bipeAsset.status === "ATIVO" ? "Ativo" : bipeAsset.status === "EM_USO" ? "Em Uso" : bipeAsset.status === "EM_MANUTENCAO" ? "Manutenção" : bipeAsset.status ?? "—"}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Ação: Entrada / Saída / Transferência */}
                                <div className="grid grid-cols-3 rounded-lg overflow-hidden border border-[var(--zyllen-border)]">
                                    <button
                                        onClick={() => setBipeMode("entry")}
                                        className={`flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${bipeMode === "entry" ? "bg-emerald-500/20 text-emerald-400" : "text-[var(--zyllen-muted)] hover:text-white"}`}
                                    >
                                        <ArrowDownCircle size={15} /> Entrada
                                    </button>
                                    <button
                                        onClick={() => setBipeMode("exit")}
                                        className={`flex items-center justify-center gap-1.5 py-2 text-sm font-medium border-x border-[var(--zyllen-border)] transition-colors ${bipeMode === "exit" ? "bg-rose-500/20 text-rose-400" : "text-[var(--zyllen-muted)] hover:text-white"}`}
                                    >
                                        <ArrowUpCircle size={15} /> Saída
                                    </button>
                                    <button
                                        onClick={() => setBipeMode("transfer")}
                                        className={`flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${bipeMode === "transfer" ? "bg-blue-500/20 text-blue-400" : "text-[var(--zyllen-muted)] hover:text-white"}`}
                                    >
                                        <RefreshCw size={15} /> Transf.
                                    </button>
                                </div>

                                {/* Local — entrada (destino) ou transferência (destino). Saída usa o local atual. */}
                                {bipeMode !== "exit" && (
                                    <div className="space-y-1.5">
                                        <Label className="text-[var(--zyllen-muted)] text-xs">
                                            {bipeMode === "entry" ? "Local de entrada" : "Transferir para"}
                                        </Label>
                                        <select
                                            value={bipeLocationId}
                                            onChange={(e) => setBipeLocationId(e.target.value)}
                                            className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm"
                                        >
                                            <option value="">Selecione o local...</option>
                                            {locations?.data?.filter((l: any) => bipeMode !== "transfer" || l.id !== bipeAsset.currentLocationId).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                {bipeMode === "exit" && (
                                    <p className="text-xs text-[var(--zyllen-muted)]">
                                        Saída a partir de <span className="text-white">{bipeAsset.currentLocation?.name ?? "—"}</span>
                                    </p>
                                )}

                                {/* PIN */}
                                <div className="space-y-1.5">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">PIN</Label>
                                    <Input
                                        type="password"
                                        maxLength={4}
                                        placeholder="••••"
                                        value={bipePin}
                                        onChange={(e) => setBipePin(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleBipeSubmit()}
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-center tracking-widest"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-1">
                                    <Button
                                        variant="highlight"
                                        className="flex-1"
                                        onClick={handleBipeSubmit}
                                        disabled={entryMut.isPending || exitMut.isPending}
                                    >
                                        {entryMut.isPending || exitMut.isPending ? (
                                            <><Loader2 size={15} className="animate-spin" /> Registrando...</>
                                        ) : (
                                            <><CheckCircle2 size={15} /> Confirmar {bipeMode === "entry" ? "Entrada" : bipeMode === "exit" ? "Saída" : "Transferência"}</>
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-white"
                                        onClick={() => { resetBipeSelection(); setBipeCode(""); bipeInputRef.current?.focus(); }}
                                    >
                                        <X size={15} />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Item (SKU) encontrado — entrada de itens novos por quantidade */}
                    {bipeSku && !bipeAsset && !bipeSuccess && (
                        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-highlight)]/20">
                            <CardContent className="pt-5 space-y-4">
                                {/* Item info */}
                                <div className="rounded-lg bg-[var(--zyllen-highlight)]/5 border border-[var(--zyllen-highlight)]/10 px-4 py-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-white font-semibold truncate">{bipeSku.name}</p>
                                            <p className="text-xs font-mono text-[var(--zyllen-highlight)] mt-0.5">{bipeSku.skuCode}</p>
                                            {bipeSku.barcode && <p className="text-xs text-[var(--zyllen-muted)] mt-0.5">Cód. barras: {bipeSku.barcode}</p>}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <Badge variant="default">Patrimônio</Badge>
                                            {balances?.data && (() => {
                                                const total = balances.data.filter((b: any) => b.sku?.id === bipeSku.id || b.skuId === bipeSku.id).reduce((s: number, b: any) => s + b.quantity, 0);
                                                return <p className="text-xs text-[var(--zyllen-muted)] mt-1">Estoque: <span className="text-white font-semibold">{total}</span> {bipeSku.unit ?? "UN"}</p>;
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Entry / Exit toggle */}
                                <div className="flex rounded-lg overflow-hidden border border-[var(--zyllen-border)]">
                                    <button
                                        onClick={() => setBipeMode("entry")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${bipeMode === "entry" ? "bg-emerald-500/20 text-emerald-400" : "text-[var(--zyllen-muted)] hover:text-white"}`}
                                    >
                                        <ArrowDownCircle size={15} /> Entrada
                                    </button>
                                    <div className="w-px bg-[var(--zyllen-border)]" />
                                    <button
                                        onClick={() => setBipeMode("exit")}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${bipeMode === "exit" ? "bg-rose-500/20 text-rose-400" : "text-[var(--zyllen-muted)] hover:text-white"}`}
                                    >
                                        <ArrowUpCircle size={15} /> Saída
                                    </button>
                                </div>

                                {/* Location */}
                                <div className="space-y-1.5">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">Local</Label>
                                    <select
                                        value={bipeLocationId}
                                        onChange={(e) => setBipeLocationId(e.target.value)}
                                        className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm"
                                    >
                                        <option value="">Selecione o local...</option>
                                        {locations?.data?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>

                                {/* Quantity stepper */}
                                <div className="space-y-1.5">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">Quantidade</Label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setBipeQty(Math.max(1, bipeQty - 1))}
                                            className="size-9 rounded-md border border-[var(--zyllen-border)] text-white text-lg flex items-center justify-center hover:bg-white/5 shrink-0"
                                        >−</button>
                                        <input
                                            ref={bipeQtyRef}
                                            type="number"
                                            min={1}
                                            value={bipeQty}
                                            onChange={(e) => setBipeQty(Math.max(1, +e.target.value))}
                                            onKeyDown={(e) => e.key === "Enter" && handleBipeSubmit()}
                                            className="flex-1 h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                                        />
                                        <button
                                            onClick={() => setBipeQty(bipeQty + 1)}
                                            className="size-9 rounded-md border border-[var(--zyllen-border)] text-white text-lg flex items-center justify-center hover:bg-white/5 shrink-0"
                                        >+</button>
                                    </div>
                                </div>

                                {/* PIN */}
                                <div className="space-y-1.5">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">PIN</Label>
                                    <Input
                                        type="password"
                                        maxLength={4}
                                        placeholder="••••"
                                        value={bipePin}
                                        onChange={(e) => setBipePin(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleBipeSubmit()}
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-center tracking-widest"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-1">
                                    <Button
                                        variant="highlight"
                                        className="flex-1"
                                        onClick={handleBipeSubmit}
                                        disabled={entryMut.isPending || exitMut.isPending}
                                    >
                                        {entryMut.isPending || exitMut.isPending ? (
                                            <><Loader2 size={15} className="animate-spin" /> Registrando...</>
                                        ) : (
                                            <><CheckCircle2 size={15} /> Confirmar {bipeMode === "entry" ? "Entrada" : "Saída"}</>
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-white"
                                        onClick={() => { setBipeSku(null); setBipeCode(""); bipeInputRef.current?.focus(); }}
                                    >
                                        <X size={15} />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            ));
}
