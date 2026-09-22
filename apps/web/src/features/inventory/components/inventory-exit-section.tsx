"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { Badge } from "@web/components/ui/badge";
import { ArrowUpCircle, Hash, Loader2, X, MapPin } from "lucide-react";
import { SkuSearchCombobox } from "@web/features/inventory/components/sku-search-combobox";
import type { InventoryController } from "../hooks/use-inventory-controller";
import { internalExitDestination } from '@zyllen/shared';
import { selectableExitReason } from '../utils/inventory-form-options';

export function InventoryExitSection({ controller }: { controller: InventoryController }) {
    const {
        exitSkuId,
        setExitSkuId,
        exitAsset,
        setExitAsset,
        exitCodeQuery,
        setExitCodeQuery,
        exitCodeOpen,
        setExitCodeOpen,
        exitNewPin,
        setExitNewPin,
        exitNewMotivo,
        setExitNewMotivo,
        exitNewReason,
        setExitNewReason,
        exitNewEvent,
        setExitNewEvent,
        exitCompanyId,
        setExitCompanyId,
        exitProjectId,
        setExitProjectId,
        exitCodeRef,
        exitCodeInputRef,
        skus,
        exitReasons,
        custodyOptions,
        loadingExitSkuAssets,
        exitOptions,
        exitMut,
        selectExitAsset,
        handleExitCodeEnter,
        handleExitSubmit,
    } = controller;
    const companies = custodyOptions?.data?.companies ?? [];
    const projects = companies.find(company => company.id === exitCompanyId)?.projects ?? [];
    const internalDestination = internalExitDestination(exitNewMotivo);
    return ((
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-lg">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <ArrowUpCircle className="text-rose-400" /> Saída de Patrimônio
                        </CardTitle>
                        <p className="text-xs text-[var(--zyllen-muted)] mt-1">Selecione o item para filtrar os códigos, ou bipe o código diretamente</p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleExitSubmit} autoComplete="off" className="space-y-4">

                            {/* Opção 1: Filtro por item (opcional) */}
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">
                                    Item <span className="text-xs font-normal">(opcional — para filtrar patrimônios)</span>
                                </Label>
                                <SkuSearchCombobox
                                    skus={skus?.data ?? []}
                                    value={exitSkuId}
                                    onChange={(id) => { setExitSkuId(id); setExitAsset(null); setExitCodeQuery(""); }}
                                    required={false}
                                />
                            </div>

                            {/* Caixa de patrimônio — filtro + bipe */}
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)] flex items-center gap-1.5">
                                    <Hash size={13} /> Código de Patrimônio
                                    <span className="text-[var(--zyllen-highlight)] text-xs font-normal">— bipe ou pesquise</span>
                                </Label>
                                <div ref={exitCodeRef} className="relative">
                                    {exitAsset ? (
                                        <div className="flex items-center gap-2 h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                            <span className="font-mono text-[var(--zyllen-highlight)] text-xs">{exitAsset.assetCode}</span>
                                            <span className="truncate flex-1 text-[var(--zyllen-muted)] text-xs">{exitAsset.sku?.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => { setExitAsset(null); setExitCodeQuery(""); setTimeout(() => exitCodeInputRef.current?.focus(), 50); }}
                                                className="text-[var(--zyllen-muted)] hover:text-white ml-1"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                                            <input
                                                ref={exitCodeInputRef}
                                                type="text"
                                                autoComplete="off"
                                                value={exitCodeQuery}
                                                onChange={(e) => { setExitCodeQuery(e.target.value); setExitCodeOpen(true); }}
                                                onFocus={() => { if (exitSkuId || exitCodeQuery.length >= 2) setExitCodeOpen(true); }}
                                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleExitCodeEnter(); } }}
                                                placeholder={exitSkuId ? "Filtrar por código..." : "Digite ou bipe o código (ex: CFP-00012)"}
                                                className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-8 pr-8 text-sm font-mono placeholder:text-[var(--zyllen-muted)]/60 placeholder:font-sans focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                                            />
                                            {exitSkuId && loadingExitSkuAssets && (
                                                <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--zyllen-muted)]" />
                                            )}
                                        </div>
                                    )}

                                    {/* Dropdown de códigos */}
                                    {exitCodeOpen && !exitAsset && (exitSkuId || exitCodeQuery.length >= 2) && (
                                        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] shadow-xl">
                                            {loadingExitSkuAssets ? (
                                                <div className="px-3 py-4 text-center text-[var(--zyllen-muted)] text-sm flex items-center justify-center gap-2">
                                                    <Loader2 size={14} className="animate-spin" /> Carregando...
                                                </div>
                                            ) : exitOptions.length > 0 ? exitOptions.map((a: any) => (
                                                <button
                                                    key={a.id}
                                                    type="button"
                                                    onClick={() => selectExitAsset(a)}
                                                    className="w-full text-left px-3 py-2.5 hover:bg-[var(--zyllen-highlight)]/10 transition-colors flex items-center gap-3 text-sm border-b border-[var(--zyllen-border)]/30 last:border-0"
                                                >
                                                    <span className="font-mono text-[var(--zyllen-highlight)] text-xs w-24 shrink-0">{a.assetCode}</span>
                                                    <span className="text-white text-xs truncate flex-1">{a.sku?.name}</span>
                                                    <span className="text-[var(--zyllen-muted)] text-xs shrink-0 flex items-center gap-1">
                                                        <MapPin size={10} /> {a.currentLocation?.name ?? "Sem local"}
                                                    </span>
                                                </button>
                                            )) : (
                                                <div className="px-3 py-4 text-center text-[var(--zyllen-muted)] text-sm">Nenhum patrimônio encontrado</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {!exitSkuId && !exitAsset && exitCodeQuery.length < 2 && (
                                    <p className="text-xs text-[var(--zyllen-muted)]/60">Selecione um item acima para ver os códigos, ou comece a digitar/bipar</p>
                                )}
                            </div>

                            {/* Card do patrimônio selecionado */}
                            {exitAsset && (
                                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="space-y-0.5">
                                            <p className="font-mono text-rose-300 text-sm font-semibold">{exitAsset.assetCode}</p>
                                            <p className="text-white text-sm">{exitAsset.sku?.name}</p>
                                            {exitAsset.currentLocation ? (
                                                <p className="text-[var(--zyllen-muted)] text-xs flex items-center gap-1">
                                                    <MapPin size={11} /> Local atual: <span className="text-white">{exitAsset.currentLocation.name}</span>
                                                </p>
                                            ) : (
                                                <p className="text-amber-400 text-xs">Sem local definido — edite o patrimônio antes</p>
                                            )}
                                        </div>
                                        <Badge variant={exitAsset.status === "ATIVO" ? "success" : "default"}>
                                            {exitAsset.status === "ATIVO" ? "Ativo" : exitAsset.status === "EM_USO" ? "Em Uso" : exitAsset.status ?? "—"}
                                        </Badge>
                                    </div>
                                </div>
                            )}

                            {internalDestination && <p className="text-xs text-amber-200">Destino automático: {internalDestination.locationName}. O item sairá do almoxarifado e manterá o histórico.</p>}
                            {!internalDestination && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Cliente *</Label>
                                    <select aria-label="Cliente" value={exitCompanyId} onChange={(e) => { setExitCompanyId(e.target.value); setExitProjectId(""); }} required className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                        <option value="">Selecione...</option>
                                        {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Projeto *</Label>
                                    <select aria-label="Projeto" value={exitProjectId} onChange={(e) => setExitProjectId(e.target.value)} required disabled={!exitCompanyId} className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm disabled:opacity-50">
                                        <option value="">Selecione...</option>
                                        {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                                    </select>
                                </div>
                            </div>}

                            {/* Motivo + Detalhe + PIN */}
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Motivo da Saída</Label>
                                <select
                                    aria-label="Motivo da saída"
                                    value={exitNewMotivo}
                                    onChange={(e) => setExitNewMotivo(e.target.value)}
                                    required
                                    className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm"
                                >
                                    <option value="">Selecione...</option>
                                    {exitReasons?.data?.filter((reason: { name: string }) => selectableExitReason(reason.name)).map((reason: { id: string; name: string }) => <option key={reason.id} value={reason.name}>{reason.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Detalhe (opcional)</Label>
                                <Input
                                    aria-label="Detalhe da saída"
                                    value={exitNewReason}
                                    onChange={(e) => setExitNewReason(e.target.value)}
                                    placeholder="Detalhes adicionais..."
                                    autoComplete="off"
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Evento na timeline *</Label>
                                <Input aria-label="Evento na timeline" autoComplete="off" required maxLength={2000} value={exitNewEvent} onChange={event => setExitNewEvent(event.target.value)} placeholder="Ex: Enviado para a sala do projeto" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                <p className="text-[10px] text-[var(--zyllen-muted)]">Este texto será registrado no histórico do patrimônio.</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">PIN</Label>
                                <Input
                                    aria-label="PIN"
                                    type="password"
                                    autoComplete="new-password"
                                    maxLength={4}
                                    placeholder="••••"
                                    value={exitNewPin}
                                    onChange={(e) => setExitNewPin(e.target.value)}
                                    required
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-center tracking-widest"
                                />
                            </div>

                            <Button
                                type="submit"
                                variant="highlight"
                                className="w-full"
                                disabled={exitMut.isPending || !exitAsset || !exitAsset?.currentLocationId}
                            >
                                {exitMut.isPending ? "Registrando..." : "Registrar Saída"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            ));
}
