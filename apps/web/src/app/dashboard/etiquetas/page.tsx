"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { Badge } from "@web/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@web/components/ui/dialog";
import { Textarea } from "@web/components/ui/textarea";
import { Select, SelectOption } from "@web/components/ui/select";
import { toast } from "sonner";
import { Printer, Tag, History, FileText, Plus, Pencil, Trash2, Search, Download, Layers, X, CheckSquare, Package } from "lucide-react";
import QRCode from "react-qr-code";
import { Skeleton } from "@web/components/ui/skeleton";
import { EMPTY_STATES, TOASTS, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";
import { buildLabelZplFromTemplate, buildBatchZplFromTemplate } from "@web/lib/label-zpl";
import { DEFAULT_TEMPLATE, type LabelData } from "@web/lib/label-template";
import { LabelPreview } from "@web/components/etiquetas/label-preview";
import { sendZpl, getZebraPrintUrl, setZebraPrintUrl } from "@web/lib/zebra-print";

type Tab = "print" | "consumables" | "batch" | "history" | "templates";

type LabelDataContractV1 = {
    contractVersion: "v1";
    layoutVersion: "1";
    templateId: string | null;
    assetId: string;
    assetCode: string;
    skuId: string;
    skuCode: string;
    skuName: string;
    description: string;
    brand?: string | null;
    barcode?: string | null;
    barcodeValue: string;
    qrContent: string;
    category: string;
    location: string;
    status: string;
};

type SelectedLabelData = {
    asset: any;
    contract: LabelDataContractV1;
};

export default function EtiquetasPage() {
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("print");

    // Print form
    const [assetCode, setAssetCode] = useState("");
    const [labelData, setLabelData] = useState<SelectedLabelData | null>(null);

    // Consumables tab state
    const [consumableSearch, setConsumableSearch] = useState("");
    const [selectedSku, setSelectedSku] = useState<any>(null);
    const [consumableCopies, setConsumableCopies] = useState(1);

    // Batch state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [batchSearch, setBatchSearch] = useState("");
    const [batchLabelData, setBatchLabelData] = useState<any[] | null>(null);
    const [printColumns, setPrintColumns] = useState(2);
    const [labelWidth, setLabelWidth] = useState(50);
    const [labelHeight, setLabelHeight] = useState(30);

    // URL do Zebra Browser Print (vazio = localhost; pode ser um túnel)
    const [printerUrl, setPrinterUrl] = useState("");
    // Deslocamento fino da impressão em mm (calibragem de posição na etiqueta)
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    useEffect(() => {
        setPrinterUrl(getZebraPrintUrl());
        const sx = Number(localStorage.getItem("labelOffsetX"));
        const sy = Number(localStorage.getItem("labelOffsetY"));
        if (!Number.isNaN(sx)) setOffsetX(sx);
        if (!Number.isNaN(sy)) setOffsetY(sy);
    }, []);
    const savePrinterUrl = (v: string) => { setPrinterUrl(v); setZebraPrintUrl(v); };
    const saveOffsetX = (v: number) => { setOffsetX(v); localStorage.setItem("labelOffsetX", String(v)); };
    const saveOffsetY = (v: number) => { setOffsetY(v); localStorage.setItem("labelOffsetY", String(v)); };

    // Template form
    const [newTemplate, setNewTemplate] = useState({ name: "", layout: "" });
    const [editTemplate, setEditTemplate] = useState<any>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

    // ─── Queries ────────────────────────
    const { data: history, isLoading: loadingHistory } = useQuery({
        queryKey: ["label-history"],
        queryFn: () => apiClient.get<{ data: any[] }>("/labels/history", fetchOpts),
        enabled: tab === "history",
    });

    const { data: templates, isLoading: loadingTemplates } = useQuery({
        queryKey: ["label-templates"],
        queryFn: () => apiClient.get<{ data: any[] }>("/labels/templates", fetchOpts),
        enabled: tab === "templates",
    });

    const { data: assets, isLoading: loadingAssets } = useQuery({
        queryKey: ["assets"],
        queryFn: () => apiClient.get<{ data: any[] }>("/assets", fetchOpts),
        enabled: tab === "print",
    });

    const { data: allAssets, isLoading: loadingAllAssets } = useQuery({
        queryKey: ["assets-batch"],
        queryFn: () => apiClient.get<{ data: any[]; total: number }>("/assets?limit=100", fetchOpts),
        enabled: tab === "batch",
    });

    const { data: skusRaw } = useQuery({
        queryKey: ["skus"],
        queryFn: () => apiClient.get<{ data: any[] }>("/catalog/skus", fetchOpts),
        enabled: tab === "consumables",
    });
    const consumableSkus = skusRaw?.data?.filter((s: any) => s.trackingMode === "CONSUMABLE") ?? [];

    // ─── Lookup asset for label ─────────
    const handleLookup = async (code?: string) => {
        const searchCode = (code ?? assetCode).trim();
        if (!searchCode) return;
        try {
            const res = await apiClient.get<{ data: any }>(`/assets/lookup/${searchCode}`, fetchOpts);
            if (res.data) {
                const labelRes = await apiClient.get<{ data: LabelDataContractV1 }>(`/labels/data/${res.data.id}`, fetchOpts);
                setLabelData({ asset: res.data, contract: labelRes.data });
            }
        } catch {
            toast.error("Patrimônio não encontrado");
            setLabelData(null);
        }
    };

    // ─── Mutations ──────────────────────
    const printMut = useMutation({
        mutationFn: (assetId: string) => apiClient.post("/labels/print", { assetId }, fetchOpts),
        onSuccess: () => { toast.success(TOASTS.printRegistered); qc.invalidateQueries({ queryKey: ["label-history"] }); },
        onError: (e: any) => toast.error(e.message),
    });

    const batchPrintMut = useMutation({
        mutationFn: (assetIds: string[]) => apiClient.post<{ data: { count: number; labelData: any[] } }>("/labels/print-batch", { assetIds }, fetchOpts),
        onSuccess: (result: any) => {
            setBatchLabelData(result.data.labelData);
            toast.success(`${result.data.count} impressões registradas`);
            qc.invalidateQueries({ queryKey: ["label-history"] });
            setSelectedIds(new Set());
            setTimeout(() => handleBatchPrint(result.data.labelData), 300);
        },
        onError: (e: any) => toast.error(e.message),
    });

    const openPrintWindow = (labelsHtml: string, columns: number) => {
        const origin = window.location.origin;
        const fixedHtml = labelsHtml.replace(/src="\/brand\//g, `src="${origin}/brand/`);
        const popup = window.open("", "_blank", "width=900,height=700");
        if (!popup) {
            toast.error("Habilite popups para este site para imprimir etiquetas.");
            return;
        }
        const pageW = labelWidth * columns;
        const qrPx = Math.max(Math.round((labelHeight - 8) * 3.78), 20);
        popup.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Etiquetas</title>
<style>
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: white; font-family: Arial, sans-serif; }
@page { size: ${pageW}mm ${labelHeight}mm; margin: 0; }
.sheet { display: grid; grid-template-columns: repeat(${columns}, ${labelWidth}mm); gap: 0; width: ${pageW}mm; }
.sheet > div { width: ${labelWidth}mm !important; height: ${labelHeight}mm !important; overflow: hidden !important; padding: 1.5mm !important; border: none !important; border-radius: 0 !important; background: white !important; }
.sheet > div > div:first-child { margin-bottom: 0.5mm !important; padding-bottom: 0.5mm !important; }
.sheet > div img { height: 8px !important; width: auto !important; }
.sheet > div svg { width: ${qrPx}px !important; height: ${qrPx}px !important; }
.sheet p { margin: 0 !important; line-height: 1.2 !important; }
</style>
</head>
<body>
<div class="sheet">${fixedHtml}</div>
<script>
window.addEventListener('afterprint', function() { window.close(); });
window.onload = function() { setTimeout(function() { window.print(); }, 250); };
</script>
</body>
</html>`);
        popup.document.close();
    };

    // ─── Impressão ZPL direta (Zebra Browser Print) ─────────────────────
    // Template ativo = template padrão com o tamanho de etiqueta escolhido.
    // (Na Fase 3/4 isso virá do template selecionado pelo usuário.)
    const activeTemplate = { ...DEFAULT_TEMPLATE, widthMm: labelWidth, heightMm: labelHeight };
    const printOpts = { offsetXMm: offsetX, offsetYMm: offsetY };

    // Impressão unitária: gera ZPL a partir do template e envia para a ZD220.
    // Se falhar, mostra o erro real e cai para a impressão HTML do navegador.
    const handleSinglePrint = async () => {
        if (!labelData) return;
        const c = labelData.contract;
        const data: LabelData = {
            assetCode: c.assetCode,
            skuName: c.skuName,
            skuCode: c.skuCode,
            qrContent: c.qrContent,
            location: c.location,
        };
        try {
            await sendZpl(buildLabelZplFromTemplate(activeTemplate, data, printOpts));
            toast.success("Etiqueta enviada para a impressora");
        } catch (e: any) {
            toast.error(`Browser Print indisponível (${e?.message ?? "erro"}). Usando navegador.`);
            handleSinglePrintHtml();
        }
    };

    // Impressão em lote: concatena o ZPL de cada etiqueta selecionada.
    const handleBatchPrint = async (labels: any[]) => {
        const items = labels.map((l) => ({
            data: {
                assetCode: l.assetCode,
                skuName: l.skuName,
                skuCode: l.skuCode,
                qrContent: l.qrContent,
                location: l.location,
            } as LabelData,
        }));
        try {
            await sendZpl(buildBatchZplFromTemplate(activeTemplate, items, printOpts));
            toast.success(`${items.length} etiqueta(s) enviada(s) para a impressora`);
        } catch (e: any) {
            toast.error(`Browser Print indisponível (${e?.message ?? "erro"}). Usando navegador.`);
            handleBatchPrintHtml();
        }
    };

    // ─── Fallback: impressão via popup HTML do navegador ────────────────
    const handleSinglePrintHtml = () => {
        if (!labelData) return;
        const el = document.getElementById("label-print-area");
        const svg = el?.querySelector("svg");
        const qrPx = Math.max(Math.round((labelHeight - 8) * 3.78), 20);
        let qrSvg = svg ? new XMLSerializer().serializeToString(svg) : "";
        qrSvg = qrSvg.replace(/width="[^"]*"/, `width="${qrPx}"`).replace(/height="[^"]*"/, `height="${qrPx}"`);
        const origin = window.location.origin;
        const fSm = Math.max(6, Math.round(labelHeight * 0.32));
        const fMd = Math.max(7, Math.round(labelHeight * 0.38));
        const fLg = Math.max(8, Math.round(labelHeight * 0.44));
        const html = `<div style="width:${labelWidth}mm;height:${labelHeight}mm;overflow:hidden;padding:1.5mm;background:white">
<div style="border-bottom:1px solid #e5e7eb;margin-bottom:0.5mm;padding-bottom:0.5mm">
<img src="${origin}/brand/logo-skyline-black.svg" alt="Skyline" style="height:8px;width:auto" />
</div>
<div style="display:flex;gap:2mm;align-items:flex-start">
<div style="flex-shrink:0">${qrSvg}</div>
<div style="min-width:0;overflow:hidden">
<p style="font-family:monospace;font-weight:bold;font-size:${fLg}px;margin:0;letter-spacing:0.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${labelData.contract.assetCode}</p>
<p style="font-size:${fMd}px;margin:1px 0 0;line-height:1.2;overflow:hidden">${labelData.contract.skuName}</p>
<p style="font-family:monospace;font-size:${fSm}px;color:#666;margin:1px 0 0">SKU ${labelData.contract.skuCode}</p>
</div>
</div>
</div>`;
        openPrintWindow(html, 1);
    };

    const handleBatchPrintHtml = () => {
        const sheet = document.getElementById("batch-print-sheet");
        if (!sheet || !sheet.children.length) return;
        const labelsHtml = Array.from(sheet.children).map((el) => el.outerHTML).join("");
        openPrintWindow(labelsHtml, printColumns);
    };

    const normalize = (s: string) => s?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") ?? "";

    const createTemplate = useMutation({
        mutationFn: (data: any) => apiClient.post("/labels/templates", data, fetchOpts),
        onSuccess: () => { toast.success("Template criado!"); qc.invalidateQueries({ queryKey: ["label-templates"] }); setNewTemplate({ name: "", layout: "" }); },
        onError: (e: any) => toast.error(e.message),
    });

    const updateTemplate = useMutation({
        mutationFn: (data: any) => apiClient.put(`/labels/templates/${data.id}`, { name: data.name, layout: data.layout }, fetchOpts),
        onSuccess: () => { toast.success("Template atualizado!"); qc.invalidateQueries({ queryKey: ["label-templates"] }); setEditTemplate(null); },
        onError: (e: any) => toast.error(e.message),
    });

    const deleteTemplate = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/labels/templates/${id}`, fetchOpts),
        onSuccess: () => { toast.success("Template excluído!"); qc.invalidateQueries({ queryKey: ["label-templates"] }); setDeleteConfirm(null); },
        onError: (e: any) => toast.error(e.message),
    });

    const tabs = [
        { key: "print", label: "Patrimônios", icon: Printer },
        { key: "batch", label: "Lote", icon: Layers },
        { key: "history", label: "Histórico", icon: History },
        { key: "templates", label: "Templates", icon: FileText },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Tag className="text-[var(--zyllen-highlight)]" /> Etiquetas
            </h1>
            <p className="text-sm text-[var(--zyllen-muted)] mt-1">{PAGE_DESCRIPTIONS.etiquetas}</p>

            <div className="flex flex-wrap items-center gap-4">
                <div className="flex gap-1 bg-[var(--zyllen-bg)] rounded-xl p-1 border border-[var(--zyllen-border)] w-fit">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key as Tab)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key
                                    ? "bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg)]"
                                    : "text-[var(--zyllen-muted)] hover:text-white"
                                }`}
                        >
                            <t.icon size={16} /> {t.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--zyllen-muted)]">Etiqueta:</span>
                    <input
                        type="number"
                        value={labelWidth}
                        onChange={(e) => setLabelWidth(Math.max(10, Number(e.target.value)))}
                        className="w-14 h-7 rounded border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] text-white text-center text-xs focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                        title="Largura da etiqueta em mm"
                    />
                    <span className="text-xs text-[var(--zyllen-muted)]">×</span>
                    <input
                        type="number"
                        value={labelHeight}
                        onChange={(e) => setLabelHeight(Math.max(5, Number(e.target.value)))}
                        className="w-14 h-7 rounded border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] text-white text-center text-xs focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                        title="Altura da etiqueta em mm"
                    />
                    <span className="text-xs text-[var(--zyllen-muted)]">mm</span>
                </div>
                <div className="flex items-center gap-2" title="Desloca a impressão dentro da etiqueta (mm). Use valores negativos para mover para cima/esquerda.">
                    <span className="text-xs text-[var(--zyllen-muted)]">Ajuste:</span>
                    <input
                        type="number"
                        step="0.5"
                        value={offsetX}
                        onChange={(e) => saveOffsetX(Number(e.target.value))}
                        className="w-14 h-7 rounded border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] text-white text-center text-xs focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                        title="Horizontal (mm): + direita / − esquerda"
                    />
                    <span className="text-xs text-[var(--zyllen-muted)]">↔</span>
                    <input
                        type="number"
                        step="0.5"
                        value={offsetY}
                        onChange={(e) => saveOffsetY(Number(e.target.value))}
                        className="w-14 h-7 rounded border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] text-white text-center text-xs focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                        title="Vertical (mm): + baixo / − cima"
                    />
                    <span className="text-xs text-[var(--zyllen-muted)]">↕</span>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                    <Printer size={14} className="text-[var(--zyllen-muted)] shrink-0" />
                    <input
                        type="text"
                        value={printerUrl}
                        onChange={(e) => setPrinterUrl(e.target.value)}
                        onBlur={(e) => savePrinterUrl(e.target.value)}
                        placeholder="URL da impressora (vazio = localhost) — ex: https://abc.tunnelmole.net"
                        className="flex-1 h-7 rounded border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] text-white px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                        title="Endereço do Zebra Browser Print. Deixe vazio para usar a máquina local (127.0.0.1)."
                    />
                </div>
            </div>

            {/* ═══ PRINT ═══ */}
            {tab === "print" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardContent className="pt-6">
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                                    <Input
                                        value={assetCode}
                                        onChange={(e) => setAssetCode(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                                        placeholder="Bipar ou digitar código do patrimônio..."
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-10 font-mono"
                                    />
                                </div>
                                <Button variant="highlight" onClick={() => handleLookup()}>
                                    <Search size={16} /> Buscar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {labelData && (
                        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-highlight)]/20">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Tag size={18} className="text-[var(--zyllen-highlight)]" />
                                    Dados da Etiqueta
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <p className="text-xs text-[var(--zyllen-muted)]">Código</p>
                                        <p className="text-white font-mono text-lg">{labelData.contract.assetCode}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--zyllen-muted)]">Item</p>
                                        <p className="text-white">{labelData.contract.skuName}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--zyllen-muted)]">Código do item</p>
                                        <p className="text-white font-mono text-sm">{labelData.contract.skuCode}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--zyllen-muted)]">Local</p>
                                        <p className="text-white">{labelData.contract.location}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <p className="text-xs text-[var(--zyllen-muted)]">Contrato</p>
                                        <p className="text-white font-mono text-sm">{labelData.contract.contractVersion}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--zyllen-muted)]">Layout</p>
                                        <p className="text-white font-mono text-sm">{labelData.contract.layoutVersion}</p>
                                    </div>
                                </div>

                                {/* Label Preview — fiel à impressão (mesma fonte do ZPL) */}
                                <div className="border-2 border-dashed border-[var(--zyllen-border)] rounded-lg p-6 flex flex-col items-center mb-4">
                                    <p className="text-[var(--zyllen-muted)] text-sm mb-4">Preview da Etiqueta (fiel à impressão)</p>
                                    <div id="label-print-area">
                                        <LabelPreview
                                            template={activeTemplate}
                                            data={{
                                                assetCode: labelData.contract.assetCode,
                                                skuName: labelData.contract.skuName,
                                                skuCode: labelData.contract.skuCode,
                                                qrContent: labelData.contract.qrContent,
                                                location: labelData.contract.location,
                                            }}
                                            pxPerMm={6}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        variant="highlight"
                                        className="flex-1"
                                        onClick={() => printMut.mutate(labelData.asset.id)}
                                        disabled={printMut.isPending}
                                    >
                                        <Printer size={16} /> {printMut.isPending ? "Registrando..." : "Registrar Impressão"}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-[var(--zyllen-border)] text-white hover:bg-white/5 gap-2"
                                        onClick={handleSinglePrint}
                                        title="Imprimir etiqueta"
                                    >
                                        <Download size={16} /> Imprimir
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Quick print from list */}
                    {!labelData && assets?.data?.length ? (
                        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                            <CardHeader><CardTitle className="text-white">Patrimônios disponíveis</CardTitle></CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--zyllen-border)]">
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Código</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Item</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Status</th>
                                                <th className="text-right py-3 text-[var(--zyllen-muted)] font-medium">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assets.data.map((a: any) => (
                                                <tr key={a.id} className="border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02]">
                                                    <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{a.assetCode}</td>
                                                    <td className="py-3 text-white">{a.sku?.name}</td>
                                                    <td className="py-3"><Badge variant={a.status === "ATIVO" ? "success" : "warning"}>{a.status}</Badge></td>
                                                    <td className="py-3 text-right">
                                                        <Button size="sm" variant="ghost" onClick={() => { setAssetCode(a.assetCode); handleLookup(a.assetCode); }}>
                                                            <Printer size={14} />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
            )}

            {/* ═══ CONSUMÍVEIS — removido ═══ */}
            {false && tab === "consumables" && (
                <div className="space-y-4 max-w-2xl">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white flex items-center gap-2">
                                <Package size={18} className="text-[var(--zyllen-highlight)]" /> Etiqueta de Consumível
                            </CardTitle>
                            <p className="text-xs text-[var(--zyllen-muted)]">
                                O QR code gerado contém o código do item — basta bipar na tela de Bipagem Rápida para registrar entradas e saídas.
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Search */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-[var(--zyllen-muted)]">Buscar item</label>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                                    <input
                                        type="text"
                                        value={consumableSearch}
                                        onChange={(e) => { setConsumableSearch(e.target.value); setSelectedSku(null); }}
                                        placeholder="Nome, código ou código de barras..."
                                        className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-9 pr-3 text-sm placeholder:text-[var(--zyllen-muted)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                                    />
                                </div>

                                {/* Dropdown results */}
                                {consumableSearch && !selectedSku && (() => {
                                    const q = normalize(consumableSearch);
                                    const results = consumableSkus.filter((s: any) =>
                                        normalize(s.name).includes(q) ||
                                        normalize(s.skuCode).includes(q) ||
                                        (s.barcode && normalize(s.barcode).includes(q))
                                    );
                                    if (!results.length) return (
                                        <p className="text-xs text-[var(--zyllen-muted)] px-1 mt-1">Nenhum item encontrado</p>
                                    );
                                    return (
                                        <div className="mt-1 rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] shadow-xl max-h-52 overflow-y-auto">
                                            {results.map((s: any) => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => { setSelectedSku(s); setConsumableSearch(s.name); }}
                                                    className="w-full text-left px-3 py-2.5 hover:bg-[var(--zyllen-highlight)]/10 transition-colors flex items-center gap-3 text-sm border-b border-[var(--zyllen-border)]/30 last:border-0"
                                                >
                                                    <span className="font-mono text-[var(--zyllen-highlight)] text-xs w-16 shrink-0">{s.skuCode}</span>
                                                    <span className="text-white truncate flex-1">{s.name}</span>
                                                    {s.barcode && <span className="text-[var(--zyllen-muted)] text-xs shrink-0">{s.barcode}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                            {selectedSku && (
                                <>
                                    {/* Copies */}
                                    <div className="flex items-center gap-3">
                                        <label className="text-xs text-[var(--zyllen-muted)] shrink-0">Cópias</label>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setConsumableCopies(Math.max(1, consumableCopies - 1))}
                                                className="size-7 rounded border border-[var(--zyllen-border)] text-white flex items-center justify-center hover:bg-white/5"
                                            >−</button>
                                            <input
                                                type="number"
                                                min={1}
                                                max={50}
                                                value={consumableCopies}
                                                onChange={(e) => setConsumableCopies(Math.max(1, Math.min(50, +e.target.value)))}
                                                className="w-14 h-7 rounded border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] text-white text-center text-sm focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setConsumableCopies(Math.min(50, consumableCopies + 1))}
                                                className="size-7 rounded border border-[var(--zyllen-border)] text-white flex items-center justify-center hover:bg-white/5"
                                            >+</button>
                                        </div>
                                    </div>

                                    {/* Label preview */}
                                    <div className="border-2 border-dashed border-[var(--zyllen-border)] rounded-lg p-6 text-center">
                                        <p className="text-[var(--zyllen-muted)] text-xs mb-4">Preview da etiqueta</p>
                                        <div
                                            id="consumable-label-preview"
                                            className="inline-block bg-white text-black rounded-lg p-3 text-left shadow-lg"
                                            style={{ minWidth: 200 }}
                                        >
                                            {/* Logo header */}
                                            <div className="mb-2 pb-1.5 border-b border-gray-200">
                                                <img src="/brand/logo-skyline-black.svg" alt="Skyline" style={{ height: 18, width: "auto" }} />
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="shrink-0 bg-white p-1 rounded border border-gray-200">
                                                    <QRCode
                                                        value={selectedSku.barcode || selectedSku.skuCode}
                                                        size={68}
                                                        level="M"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm leading-tight">{selectedSku.name}</p>
                                                    <p className="text-xs font-mono text-gray-500 mt-1">Cód: {selectedSku.skuCode}</p>
                                                    {selectedSku.barcode && (
                                                        <p className="text-xs text-gray-400 font-mono mt-0.5">Barras: {selectedSku.barcode}</p>
                                                    )}
                                                    {selectedSku.brand && (
                                                        <p className="text-xs text-gray-400 mt-0.5">{selectedSku.brand}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Print sheet (hidden, visible only on print) */}
                                    <div
                                        id="consumable-print-sheet"
                                        className="hidden"
                                        style={{ display: "none" }}
                                    >
                                        <style>{`
                                            @media print {
                                                body > *:not(#consumable-print-sheet) { display: none !important; }
                                                #consumable-print-sheet {
                                                    display: grid !important;
                                                    grid-template-columns: repeat(3, 1fr);
                                                    gap: 4mm;
                                                    padding: 8mm;
                                                    background: white;
                                                }
                                            }
                                        `}</style>
                                        {Array.from({ length: consumableCopies }).map((_, i) => (
                                            <div key={i} style={{ border: "1px solid #ddd", borderRadius: 4, padding: "3mm", breakInside: "avoid", pageBreakInside: "avoid", background: "white" }}>
                                                {/* Logo header */}
                                                <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: "2mm", paddingBottom: "1.5mm" }}>
                                                    <img src="/brand/logo-skyline-black.svg" alt="Skyline" style={{ height: 14, width: "auto" }} />
                                                </div>
                                                <div style={{ display: "flex", gap: "3mm", alignItems: "flex-start" }}>
                                                    <QRCode value={selectedSku.barcode || selectedSku.skuCode} size={60} level="M" style={{ flexShrink: 0 }} />
                                                    <div style={{ minWidth: 0 }}>
                                                        <p style={{ fontWeight: "bold", fontSize: 12, margin: 0, lineHeight: 1.3 }}>{selectedSku.name}</p>
                                                        <p style={{ fontFamily: "monospace", fontSize: 10, color: "#555", margin: "2px 0 0" }}>Cód: {selectedSku.skuCode}</p>
                                                        {selectedSku.barcode && <p style={{ fontFamily: "monospace", fontSize: 9, color: "#888", margin: "1px 0 0" }}>{selectedSku.barcode}</p>}
                                                        {selectedSku.brand && <p style={{ fontSize: 9, color: "#888", margin: "1px 0 0" }}>{selectedSku.brand}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <Button
                                        variant="highlight"
                                        className="w-full gap-2"
                                        onClick={() => {
                                            const sheet = document.getElementById("consumable-print-sheet");
                                            if (sheet) sheet.style.display = "grid";
                                            window.print();
                                            setTimeout(() => {
                                                const s = document.getElementById("consumable-print-sheet");
                                                if (s) s.style.display = "none";
                                            }, 1000);
                                        }}
                                    >
                                        <Printer size={16} /> Imprimir {consumableCopies} etiqueta{consumableCopies > 1 ? "s" : ""}
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Item list for quick selection */}
                    {!selectedSku && !consumableSearch && consumableSkus.length > 0 ? (
                        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-white text-sm">Consumíveis cadastrados</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-[var(--zyllen-bg)]">
                                            <tr className="border-b border-[var(--zyllen-border)]">
                                                <th className="text-left py-2 text-[var(--zyllen-muted)] font-medium">Código</th>
                                                <th className="text-left py-2 text-[var(--zyllen-muted)] font-medium">Item</th>
                                                <th className="text-left py-2 text-[var(--zyllen-muted)] font-medium hidden sm:table-cell">Marca</th>
                                                <th className="text-right py-2 text-[var(--zyllen-muted)] font-medium">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {consumableSkus.map((s: any) => (
                                                <tr key={s.id} className="border-b border-[var(--zyllen-border)]/40 hover:bg-white/[0.02] cursor-pointer" onClick={() => { setSelectedSku(s); setConsumableSearch(s.name); }}>
                                                    <td className="py-2.5 font-mono text-[var(--zyllen-highlight)] text-xs">{s.skuCode}</td>
                                                    <td className="py-2.5 text-white">{s.name}</td>
                                                    <td className="py-2.5 text-[var(--zyllen-muted)] text-xs hidden sm:table-cell">{s.brand ?? "—"}</td>
                                                    <td className="py-2.5 text-right">
                                                        <Button size="sm" variant="ghost" className="text-xs gap-1 h-7">
                                                            <Printer size={13} /> Gerar
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
            )}

            {/* ═══ LOTE ═══ */}
            {tab === "batch" && (
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                            <Input
                                value={batchSearch}
                                onChange={(e) => setBatchSearch(e.target.value)}
                                placeholder="Filtrar por código ou nome..."
                                className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-8 h-9 text-sm font-mono"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--zyllen-muted)] whitespace-nowrap">Colunas</span>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4].map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => setPrintColumns(n)}
                                        className={`w-7 h-7 rounded text-xs font-medium border transition-colors ${printColumns === n
                                            ? "bg-[var(--zyllen-highlight)] border-[var(--zyllen-highlight)] text-[var(--zyllen-bg)]"
                                            : "border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-white"
                                        }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {selectedIds.size > 0 && (
                            <Button
                                variant="highlight"
                                className="gap-2"
                                onClick={() => batchPrintMut.mutate(Array.from(selectedIds))}
                                disabled={batchPrintMut.isPending}
                            >
                                <Printer size={15} />
                                {batchPrintMut.isPending ? "Registrando..." : `Imprimir ${selectedIds.size} etiqueta${selectedIds.size > 1 ? "s" : ""}`}
                            </Button>
                        )}
                        {selectedIds.size > 0 && (
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="text-xs text-[var(--zyllen-muted)] hover:text-white flex items-center gap-1"
                            >
                                <X size={13} /> Limpar seleção
                            </button>
                        )}
                    </div>

                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-white text-sm flex items-center gap-2">
                                <Layers size={16} className="text-[var(--zyllen-highlight)]" />
                                Selecionar Patrimônios
                                {allAssets?.total != null && (
                                    <span className="text-[var(--zyllen-muted)] font-normal">({allAssets.total} total)</span>
                                )}
                            </CardTitle>
                            {allAssets?.data?.length ? (
                                <button
                                    className="text-xs text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)] flex items-center gap-1 transition-colors"
                                    onClick={() => {
                                        const visible = (allAssets?.data ?? []).filter((a: any) => {
                                            if (!batchSearch.trim()) return true;
                                            const q = normalize(batchSearch);
                                            return normalize(a.assetCode).includes(q) || normalize(a.sku?.name ?? "").includes(q);
                                        });
                                        const allVisibleSelected = visible.every((a: any) => selectedIds.has(a.id));
                                        if (allVisibleSelected) {
                                            const next = new Set(selectedIds);
                                            visible.forEach((a: any) => next.delete(a.id));
                                            setSelectedIds(next);
                                        } else {
                                            const next = new Set(selectedIds);
                                            visible.forEach((a: any) => next.add(a.id));
                                            setSelectedIds(next);
                                        }
                                    }}
                                >
                                    <CheckSquare size={13} /> Selecionar todos visíveis
                                </button>
                            ) : null}
                        </CardHeader>
                        <CardContent>
                            {loadingAllAssets ? (
                                <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="flex items-center gap-3"><div className="size-4 rounded bg-[var(--zyllen-border)]" /><div className="h-4 flex-1 rounded bg-[var(--zyllen-border)]" /></div>)}</div>
                            ) : allAssets?.data?.length ? (() => {
                                const filtered = batchSearch.trim()
                                    ? allAssets.data.filter((a: any) => {
                                        const q = normalize(batchSearch);
                                        return normalize(a.assetCode).includes(q) || normalize(a.sku?.name ?? "").includes(q);
                                    })
                                    : allAssets.data;
                                return filtered.length ? (
                                    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead className="sticky top-0 bg-[var(--zyllen-bg)] z-10">
                                                <tr className="border-b border-[var(--zyllen-border)]">
                                                    <th className="w-8 py-2" />
                                                    <th className="text-left py-2 text-[var(--zyllen-muted)] font-medium">Código</th>
                                                    <th className="text-left py-2 text-[var(--zyllen-muted)] font-medium">Item</th>
                                                    <th className="text-left py-2 text-[var(--zyllen-muted)] font-medium">Status</th>
                                                    <th className="text-left py-2 text-[var(--zyllen-muted)] font-medium">Local</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filtered.map((a: any) => {
                                                    const checked = selectedIds.has(a.id);
                                                    return (
                                                        <tr
                                                            key={a.id}
                                                            className={`border-b border-[var(--zyllen-border)]/40 cursor-pointer transition-colors ${checked ? "bg-[var(--zyllen-highlight)]/5" : "hover:bg-white/[0.02]"}`}
                                                            onClick={() => {
                                                                const next = new Set(selectedIds);
                                                                checked ? next.delete(a.id) : next.add(a.id);
                                                                setSelectedIds(next);
                                                            }}
                                                        >
                                                            <td className="py-2.5 pl-1">
                                                                <div className={`size-4 rounded border-2 flex items-center justify-center ${checked ? "bg-[var(--zyllen-highlight)] border-[var(--zyllen-highlight)]" : "border-[var(--zyllen-border)]"}`}>
                                                                    {checked && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-[var(--zyllen-bg)]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1.5 5l2.5 2.5 5-5" /></svg>}
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 font-mono text-[var(--zyllen-highlight)] text-xs">{a.assetCode}</td>
                                                            <td className="py-2.5 text-white">{a.sku?.name}</td>
                                                            <td className="py-2.5">
                                                                <Badge variant={a.status === "ATIVO" ? "success" : a.status === "EM_MANUTENCAO" ? "warning" : a.status === "BAIXADO" ? "destructive" : "default"}>
                                                                    {a.status === "ATIVO" ? "Ativo" : a.status === "EM_USO" ? "Em Uso" : a.status === "EM_MANUTENCAO" ? "Em Manutenção" : "Baixado"}
                                                                </Badge>
                                                            </td>
                                                            <td className="py-2.5 text-[var(--zyllen-muted)] text-xs">{a.currentLocation?.name ?? "—"}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-center py-8 text-[var(--zyllen-muted)] text-sm">Nenhum patrimônio encontrado para "{batchSearch}"</p>
                                );
                            })() : (
                                <p className="text-center py-8 text-[var(--zyllen-muted)] text-sm">Nenhum patrimônio cadastrado</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ BATCH PRINT SHEET (visible only on print) ═══ */}
            {batchLabelData && batchLabelData.length > 0 && (
                <div
                    id="batch-print-sheet"
                    style={{ display: "none", gridTemplateColumns: "repeat(3, 1fr)", gap: "4mm", padding: "8mm", background: "white" }}
                >
                    {batchLabelData.map((label: any) => (
                        <div key={label.assetId} style={{ border: "1px solid #ddd", borderRadius: 4, padding: "3mm", breakInside: "avoid", pageBreakInside: "avoid", background: "white" }}>
                            {/* Logo header */}
                            <div style={{ borderBottom: "1px solid #e5e7eb", marginBottom: "2mm", paddingBottom: "1.5mm" }}>
                                <img src="/brand/logo-skyline-black.svg" alt="Skyline" style={{ height: 14, width: "auto" }} />
                            </div>
                            <div style={{ display: "flex", gap: "3mm", alignItems: "flex-start" }}>
                                <QRCode value={label.qrContent} size={60} level="M" style={{ flexShrink: 0 }} />
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: 13, margin: 0 }}>{label.assetCode}</p>
                                    <p style={{ fontSize: 11, margin: "2px 0 0", lineHeight: 1.3 }}>{label.skuName}</p>
                                    <p style={{ fontFamily: "monospace", fontSize: 9, color: "#666", margin: "2px 0 0" }}>SKU {label.skuCode}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══ HISTORY ═══ */}
            {tab === "history" && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader><CardTitle className="text-white">Histórico de Impressões</CardTitle></CardHeader>
                    <CardContent>
                        {loadingHistory ? (
                            <div className="space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <Skeleton className="h-4 w-28" />
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                ))}
                            </div>
                        ) : history?.data?.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--zyllen-border)]">
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Data</th>
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Patrimônio</th>
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Impresso por</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.data.map((h: any) => (
                                            <tr key={h.id} className="border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02]">
                                                <td className="py-3 text-[var(--zyllen-muted)] text-xs">{new Date(h.printedAt).toLocaleString("pt-BR")}</td>
                                                <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{h.asset?.assetCode}</td>
                                                <td className="py-3 text-white">{h.printedBy?.name}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : <div className="text-center py-12"><History size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/50" /><p className="text-[var(--zyllen-muted)]">{EMPTY_STATES.printHistory}</p></div>}
                    </CardContent>
                </Card>
            )}

            {/* ═══ TEMPLATES ═══ */}
            {tab === "templates" && (
                <div className="space-y-4">
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-lg">
                        <CardHeader><CardTitle className="text-white">Novo Template</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={(e) => { e.preventDefault(); createTemplate.mutate(newTemplate); }} className="space-y-3">
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Nome</Label>
                                    <Input value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="Nome do template..." required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Layout (JSON)</Label>
                                    <Textarea value={newTemplate.layout} onChange={(e) => setNewTemplate({ ...newTemplate, layout: e.target.value })} placeholder='{"width": 80, "height": 40, "fields": [...]}' required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white font-mono text-xs min-h-[120px]" />
                                </div>
                                <Button type="submit" variant="highlight" className="w-full" disabled={createTemplate.isPending}>
                                    <Plus size={16} /> {createTemplate.isPending ? "Criando..." : "Criar Template"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader><CardTitle className="text-white">Templates</CardTitle></CardHeader>
                        <CardContent>
                            {templates?.data?.length ? (
                                <div className="space-y-2">
                                    {templates.data.map((t: any) => (
                                        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50 group">
                                            <div>
                                                <p className="text-white text-sm font-medium">{t.name}</p>
                                                <p className="text-xs text-[var(--zyllen-muted)] font-mono truncate max-w-md">{t.layout}</p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditTemplate({ id: t.id, name: t.name, layout: t.layout })} className="p-1 text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)]"><Pencil size={14} /></button>
                                                <button onClick={() => setDeleteConfirm(t)} className="p-1 text-[var(--zyllen-muted)] hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-[var(--zyllen-muted)] text-center py-4">{EMPTY_STATES.templates}</p>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ EDIT TEMPLATE ═══ */}
            <Dialog open={!!editTemplate} onOpenChange={(o) => !o && setEditTemplate(null)}>
                <DialogContent onClose={() => setEditTemplate(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Editar Template</DialogTitle></DialogHeader>
                    <DialogBody>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Nome</Label>
                                <Input value={editTemplate?.name || ""} onChange={(e) => setEditTemplate({ ...editTemplate, name: e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Layout (JSON)</Label>
                                <Textarea value={editTemplate?.layout || ""} onChange={(e) => setEditTemplate({ ...editTemplate, layout: e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white font-mono text-xs min-h-[120px]" />
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditTemplate(null)}>Cancelar</Button>
                        <Button variant="highlight" onClick={() => updateTemplate.mutate(editTemplate)} disabled={updateTemplate.isPending}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ DELETE CONFIRM ═══ */}
            <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
                <DialogContent onClose={() => setDeleteConfirm(null)} className="border-[var(--zyllen-border)]">
                    <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
                    <DialogBody>
                        <p className="text-[var(--zyllen-muted)]">
                            Excluir template <strong className="text-white">{deleteConfirm?.name}</strong>?
                        </p>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => deleteTemplate.mutate(deleteConfirm.id)}>Excluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
