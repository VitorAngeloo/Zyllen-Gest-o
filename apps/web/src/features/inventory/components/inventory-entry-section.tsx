"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { ArrowDownCircle, Hash, X, Camera, Upload } from "lucide-react";
import { SkuSearchCombobox } from "@web/features/inventory/components/sku-search-combobox";
import type { InventoryController } from "../hooks/use-inventory-controller";
import { stockEntryLocation } from '../utils/inventory-form-options';

export function InventoryEntrySection({ controller }: { controller: InventoryController }) {
    const {
        entryForm,
        setEntryForm,
        createdAssetCodes,
        setCreatedAssetCodes,
        entryMediaFiles,
        entryMediaFilesInputRef,
        entryMediaCameraInputRef,
        canUploadMedia,
        entryMediaPreviews,
        appendEntryMedia,
        removeEntryMedia,
        skus,
        locations,
        entryMut,
        selectedEntrySku,
        entryLookingUp,
        isEntryReturn,
        handleEntrySubmit,
    } = controller;
    const internalLocations = (locations?.data ?? []).filter(stockEntryLocation);
    return ((
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-lg">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <ArrowDownCircle className="text-emerald-400" /> Entrada de Estoque
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            autoComplete="off"
                            onSubmit={handleEntrySubmit}
                            className="space-y-4"
                        >
                            {/* Código de patrimônio: preenchido = retorno de item existente */}
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">
                                    Código de Patrimônio <span className="text-xs font-normal">(em branco = item novo)</span>
                                </Label>
                                <Input
                                    autoComplete="off"
                                    value={entryForm.assetCode}
                                    onChange={(e) => setEntryForm({ ...entryForm, assetCode: e.target.value.toUpperCase() })}
                                    placeholder="Ex: CFP-00012 — para devolver um item já cadastrado"
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white font-mono"
                                />
                            </div>

                            {isEntryReturn ? (
                                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                                    <Hash size={14} className="text-amber-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-amber-300 text-sm font-medium">Retorno de patrimônio existente</p>
                                        <p className="text-amber-300/70 text-xs mt-0.5">
                                            O item volta ao estoque com o mesmo código, mantendo todo o histórico. Se o código não existir, a operação é barrada.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Item</Label>
                                        <SkuSearchCombobox skus={skus?.data ?? []} value={entryForm.skuId} onChange={(id) => { setEntryForm({ ...entryForm, skuId: id }); setCreatedAssetCodes([]); }} />
                                    </div>
                                    {entryForm.skuId && selectedEntrySku && (
                                        <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2.5">
                                            <Hash size={14} className="text-blue-400 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-blue-300 text-sm font-medium">Patrimônio rastreável individualmente</p>
                                                <p className="text-blue-300/70 text-xs mt-0.5">
                                                    {entryForm.quantity} {entryForm.quantity === 1 ? "código de patrimônio será criado" : "códigos de patrimônio serão criados"} automaticamente (formato SKY-XXXXX).
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            {createdAssetCodes.length > 0 && (
                                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 space-y-1">
                                    <p className="text-emerald-300 text-sm font-medium">{createdAssetCodes.length} patrimônio{createdAssetCodes.length > 1 ? "s criados" : " criado"} na última entrada</p>
                                    <div className="flex flex-wrap gap-1">
                                        {createdAssetCodes.map((code) => (
                                            <span key={code} className="font-mono text-xs bg-emerald-500/20 text-emerald-300 rounded px-1.5 py-0.5">{code}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Estoque Skyline de destino</Label>
                                <select value={entryForm.locationId} onChange={(e) => setEntryForm({ ...entryForm, locationId: e.target.value })} required className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                    <option value="">Selecione...</option>
                                    {internalLocations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {!isEntryReturn && (
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Quantidade (patrimônios)</Label>
                                        <Input autoComplete="off" type="number" min={1} value={entryForm.quantity} onChange={(e) => setEntryForm({ ...entryForm, quantity: +e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                    </div>
                                )}
                                <div className={`space-y-2 ${isEntryReturn ? "col-span-2" : ""}`}>
                                    <Label className="text-[var(--zyllen-muted)]">PIN</Label>
                                    <Input type="password" autoComplete="new-password" maxLength={4} placeholder="••••" value={entryForm.pin} onChange={(e) => setEntryForm({ ...entryForm, pin: e.target.value })} required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-center tracking-widest" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Motivo</Label>
                                <Input autoComplete="off" value={entryForm.reason} onChange={(e) => setEntryForm({ ...entryForm, reason: e.target.value })} placeholder="Compra, reposição..." className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Evento na timeline (opcional)</Label>
                                <Input autoComplete="off" value={entryForm.eventDescription} onChange={(e) => setEntryForm({ ...entryForm, eventDescription: e.target.value })} placeholder="Ex: Retornou ao almoxarifado em 19/09/2026" className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                <p className="text-[10px] text-[var(--zyllen-muted)]">O texto será anexado ao histórico do patrimônio.</p>
                            </div>
                            {canUploadMedia && !isEntryReturn && (
                                <div className="space-y-3">
                                    <Label className="text-[var(--zyllen-muted)]">Mídia (opcional)</Label>
                                    <div className="flex flex-wrap gap-2">
                                        <input
                                            ref={entryMediaFilesInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                                            multiple
                                            onChange={(e) => {
                                                appendEntryMedia(e.target.files);
                                                e.currentTarget.value = "";
                                            }}
                                            className="sr-only"
                                        />
                                        <input
                                            ref={entryMediaCameraInputRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={(e) => {
                                                appendEntryMedia(e.target.files);
                                                e.currentTarget.value = "";
                                            }}
                                            className="sr-only"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-[var(--zyllen-border)] text-white hover:bg-white/5 gap-2"
                                            onClick={() => entryMediaFilesInputRef.current?.click()}
                                        >
                                            <Upload size={14} /> Adicionar foto/vídeo
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="border-[var(--zyllen-border)] text-white hover:bg-white/5 gap-2"
                                            onClick={() => entryMediaCameraInputRef.current?.click()}
                                        >
                                            <Camera size={14} /> Tirar foto agora
                                        </Button>
                                    </div>
                                    {entryMediaPreviews.length > 0 && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {entryMediaPreviews.map((preview, index) => (
                                                <div key={`${preview.file.name}-${preview.file.lastModified}-${index}`} className="relative rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] p-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeEntryMedia(index)}
                                                        className="absolute top-1 right-1 z-10 flex items-center justify-center size-5 rounded-full bg-red-500 text-white hover:bg-red-400"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                    {preview.isImage ? (
                                                        <img src={preview.url} alt={preview.file.name} className="h-24 w-full object-cover rounded" />
                                                    ) : (
                                                        <video src={preview.url} className="h-24 w-full object-cover rounded" controls />
                                                    )}
                                                    <p className="text-[11px] text-[var(--zyllen-muted)] truncate mt-2">{preview.file.name}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <Button type="submit" variant="highlight" className="w-full" disabled={entryMut.isPending || entryLookingUp}>
                                {entryLookingUp ? "Verificando código..." : entryMut.isPending ? (entryMediaFiles.length ? "Enviando mídia..." : "Registrando...") : isEntryReturn ? "Devolver ao estoque" : entryForm.transferToId ? "Transferir" : "Registrar Entrada"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            ));
}
