"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Badge } from "@web/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@web/components/ui/dialog";
import { toast } from "sonner";
import { Printer, Tag, History, FileText, Plus, Pencil, Trash2, Search, X, CheckSquare, Send, Minus, ListChecks, Copy, Star, Loader2 } from "lucide-react";
import QRCode from "react-qr-code";
import { Skeleton } from "@web/components/ui/skeleton";
import { EMPTY_STATES, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";
import { buildBatchZplRows } from "@web/lib/label-zpl";
import {
    DEFAULT_TEMPLATE,
    type LabelData,
    type LabelTemplate,
    blankTemplate,
    parseTemplate,
    serializeTemplate,
} from "@web/lib/label-template";
import { LabelPreview } from "@web/components/etiquetas/label-preview";
import { TemplateEditor } from "@web/components/etiquetas/template-editor";
import { prepareTemplateLogos } from "@web/lib/logo-zpl";
import { sendZpl, getDefaultPrinter, getZebraPrintUrl, setZebraPrintUrl } from "@web/lib/zebra-print";

type Tab = "selection" | "printing" | "templates" | "history";

// Item na fila de impressão. qrContent aqui é só para o preview; na hora de
// imprimir, o conteúdo autoritativo vem do backend (/labels/print-batch).
type QueueItem = {
    assetId: string;
    assetCode: string;
    skuName: string;
    skuCode: string;
    qrContent: string;
    location: string;
    copies: number;
};

// Reproduz o conteúdo do QR igual ao backend (apenas para o preview na tela).
// O QR contém somente o código de patrimônio, para o leitor devolver um código
// limpo e pesquisável na bipagem rápida.
const buildQrContent = (a: any) => a.assetCode ?? "";

const assetToQueueItem = (a: any): QueueItem => ({
    assetId: a.id,
    assetCode: a.assetCode,
    skuName: a.sku?.name ?? "",
    skuCode: a.sku?.skuCode ?? "",
    qrContent: buildQrContent(a),
    location: a.currentLocation?.name ?? "Sem local",
    copies: 1,
});

const normalize = (s: string) => s?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") ?? "";

export default function EtiquetasPage() {
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("selection");

    // ─── Seleção ────────────────────────
    // Seleção guarda o objeto do patrimônio (não só o id) para funcionar entre páginas.
    const [selected, setSelected] = useState<Map<string, any>>(new Map());
    const [selSearch, setSelSearch] = useState("");
    const [debouncedSelSearch, setDebouncedSelSearch] = useState("");
    const [selPage, setSelPage] = useState(1);
    const SEL_PER_PAGE = 100;
    const [scanCode, setScanCode] = useState("");

    // ─── Fila de impressão ──────────────
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [htmlLabels, setHtmlLabels] = useState<LabelData[] | null>(null); // fallback HTML

    // ─── Histórico ──────────────────────
    const [historySearch, setHistorySearch] = useState("");

    // ─── Configuração de impressão ──────
    const [printerUrl, setPrinterUrl] = useState("");
    const [selectedTemplateId, setSelectedTemplateId] = useState("default");
    useEffect(() => {
        setPrinterUrl(getZebraPrintUrl());
        setSelectedTemplateId(localStorage.getItem("defaultTemplateId") || "default");
    }, []);
    const savePrinterUrl = (v: string) => { setPrinterUrl(v); setZebraPrintUrl(v); };

    // ─── Editor de templates ────────────
    const [editorTemplate, setEditorTemplate] = useState<LabelTemplate>(blankTemplate());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

    // ─── Queries ────────────────────────
    // Debounce da busca (busca no SERVIDOR — encontra qualquer item, não só os carregados)
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSelSearch(selSearch.trim());
            setSelPage(1);
        }, 350);
        return () => clearTimeout(t);
    }, [selSearch]);

    const { data: allAssets, isLoading: loadingAssets, isFetching: fetchingAssets } = useQuery({
        queryKey: ["assets-selection", debouncedSelSearch, selPage],
        queryFn: () => apiClient.get<{ data: any[]; total: number }>(
            `/assets?page=${selPage}&limit=${SEL_PER_PAGE}${debouncedSelSearch ? `&search=${encodeURIComponent(debouncedSelSearch)}` : ""}`,
            fetchOpts,
        ),
        enabled: tab === "selection",
        placeholderData: keepPreviousData,
    });
    const assetsTotal = allAssets?.total ?? 0;
    const assetsTotalPages = Math.max(1, Math.ceil(assetsTotal / SEL_PER_PAGE));

    const { data: history, isLoading: loadingHistory } = useQuery({
        queryKey: ["label-history"],
        queryFn: () => apiClient.get<{ data: any[] }>("/labels/history", fetchOpts),
        enabled: tab === "history",
    });

    const { data: templates } = useQuery({
        queryKey: ["label-templates"],
        queryFn: () => apiClient.get<{ data: any[] }>("/labels/templates", fetchOpts),
        enabled: tab === "templates" || tab === "printing",
    });

    // Templates salvos no novo modelo (ignora formatos legados sem `elements`).
    const savedTemplates: LabelTemplate[] = (templates?.data ?? [])
        .map((t: any) => { const p = parseTemplate(t.layout); return p ? { ...p, id: t.id, name: t.name } : null; })
        .filter(Boolean) as LabelTemplate[];

    // Template ativo usado na impressão e no preview.
    const activeTemplate: LabelTemplate = selectedTemplateId === "default"
        ? DEFAULT_TEMPLATE
        : savedTemplates.find((t) => t.id === selectedTemplateId) ?? DEFAULT_TEMPLATE;
    const printOpts = { offsetXMm: activeTemplate.offsetXMm ?? 0, offsetYMm: activeTemplate.offsetYMm ?? 0 };
    const totalLabels = queue.reduce((s, q) => s + Math.max(1, q.copies), 0);

    // ─── Fila ───────────────────────────
    const addAssetsToQueue = (assetsToAdd: any[]) => {
        setQueue((prev) => {
            const existing = new Set(prev.map((q) => q.assetId));
            const additions = assetsToAdd.filter((a) => !existing.has(a.id)).map(assetToQueueItem);
            if (additions.length === 0) { toast.message("Itens já estão na fila"); return prev; }
            toast.success(`${additions.length} item(ns) adicionado(s) à fila`);
            return [...prev, ...additions];
        });
    };

    const sendSelectionToPrint = () => {
        const selectedArr = [...selected.values()];
        if (!selectedArr.length) return;
        addAssetsToQueue(selectedArr);
        setSelected(new Map());
        setTab("printing");
    };

    const handleScanAdd = async () => {
        const code = scanCode.trim();
        if (!code) return;
        try {
            const res = await apiClient.get<{ data: any }>(`/assets/lookup/${code}`, fetchOpts);
            if (res.data) { addAssetsToQueue([res.data]); setScanCode(""); }
        } catch {
            toast.error("Patrimônio não encontrado");
        }
    };

    const setItemCopies = (assetId: string, copies: number) =>
        setQueue((prev) => prev.map((q) => q.assetId === assetId ? { ...q, copies: Math.max(1, Math.min(99, copies)) } : q));
    const removeFromQueue = (assetId: string) =>
        setQueue((prev) => prev.filter((q) => q.assetId !== assetId));

    // Reimprime a partir do histórico: adiciona o patrimônio à fila.
    const reprintFromHistory = (h: any) => {
        const assetId = h.assetId ?? h.asset?.id;
        if (!assetId) { toast.error("Não foi possível identificar o patrimônio"); return; }
        const item: QueueItem = {
            assetId,
            assetCode: h.asset?.assetCode ?? "",
            skuName: h.asset?.sku?.name ?? "",
            skuCode: h.asset?.sku?.skuCode ?? "",
            qrContent: h.asset?.assetCode ?? "",
            location: "Sem local",
            copies: 1,
        };
        setQueue((prev) => prev.some((q) => q.assetId === assetId) ? prev : [...prev, item]);
        setTab("printing");
        toast.success("Adicionado à fila para reimpressão");
    };

    // ─── Impressão ──────────────────────
    const openPrintWindow = (labelsHtml: string, columns: number) => {
        const origin = window.location.origin;
        const fixedHtml = labelsHtml.replace(/src="\/brand\//g, `src="${origin}/brand/`);
        const popup = window.open("", "_blank", "width=900,height=700");
        if (!popup) { toast.error("Habilite popups para este site para imprimir etiquetas."); return; }
        const labelWidth = activeTemplate.widthMm;
        const labelHeight = activeTemplate.heightMm;
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
.sheet > div { width: ${labelWidth}mm !important; height: ${labelHeight}mm !important; overflow: hidden !important; padding: 1.5mm !important; background: white !important; }
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

    const handleHtmlPrint = () => {
        const sheet = document.getElementById("queue-print-sheet");
        if (!sheet || !sheet.children.length) return;
        const labelsHtml = Array.from(sheet.children).map((el) => el.outerHTML).join("");
        openPrintWindow(labelsHtml, activeTemplate.columns || 1);
    };

    // Mensagem amigável para falhas do Browser Print (404 = túnel expirado).
    const browserPrintErrorMsg = (raw?: string) =>
        /404/.test(raw ?? "")
            ? "Browser Print respondeu 404 — a URL do túnel provavelmente expirou. Gere uma nova (rode 'tmole 9100' na máquina da impressora) e cole no campo acima."
            : `Browser Print indisponível (${raw ?? "erro"}).`;

    const [testingPrinter, setTestingPrinter] = useState(false);
    const testPrinterConnection = async () => {
        setTestingPrinter(true);
        const id = toast.loading("Testando conexão com o Browser Print...");
        try {
            const p = await getDefaultPrinter();
            toast.success(`Conectado! Impressora padrão: ${p?.name ?? "definida"}`, { id });
        } catch (e: any) {
            toast.error(browserPrintErrorMsg(e?.message), { id });
        } finally {
            setTestingPrinter(false);
        }
    };

    // Registra no histórico e imprime via ZPL (Browser Print). O conteúdo do
    // QR vem do backend para garantir consistência com a leitura.
    const printQueueMut = useMutation({
        mutationFn: (assetIds: string[]) =>
            apiClient.post<{ data: { count: number; labelData: any[] } }>("/labels/print-batch", { assetIds }, fetchOpts),
        onSuccess: async (result: any) => {
            const labelData: any[] = result.data.labelData;
            const copiesById = new Map(queue.map((q) => [q.assetId, q.copies]));
            const items = labelData.map((l) => ({
                data: {
                    assetCode: l.assetCode,
                    skuName: l.skuName,
                    skuCode: l.skuCode,
                    qrContent: l.qrContent,
                    location: l.location,
                } as LabelData,
                copies: copiesById.get(l.assetId) ?? 1,
            }));
            // Expande por cópias para o fallback HTML
            setHtmlLabels(items.flatMap((it) => Array(Math.max(1, it.copies)).fill(it.data)));
            qc.invalidateQueries({ queryKey: ["label-history"] });

            // Rasteriza os logos do template (^GF) antes de gerar o ZPL.
            const logos = await prepareTemplateLogos(activeTemplate);
            // Cada etiqueta é enviada num POST próprio e pequeno (igual ao caso de 1
            // etiqueta), evitando timeout/limite de payload do Browser Print quando o
            // lote é grande.
            const rows = buildBatchZplRows(activeTemplate, items, { ...printOpts, logos });

            // 1) Verifica se o Browser Print está disponível (resolve a impressora 1x).
            let printer;
            try {
                printer = await getDefaultPrinter();
            } catch (e: any) {
                toast.error(`${browserPrintErrorMsg(e?.message)} Usando navegador.`);
                setTimeout(() => handleHtmlPrint(), 300);
                return;
            }

            // 2) Browser Print disponível → envia etiqueta por etiqueta. Não abre o
            //    Windows no meio do lote (evitaria reimprimir tudo em duplicidade).
            let failed = 0;
            for (const row of rows) {
                try { await sendZpl(row, printer); }
                catch { failed++; }
            }
            if (failed === 0) {
                toast.success(`${totalLabels} etiqueta(s) enviada(s) para a impressora`);
            } else if (failed < rows.length) {
                toast.message(`${rows.length - failed} etiqueta(s) enviada(s), ${failed} falhou(aram). Tente reenviar as que faltaram.`);
            } else {
                toast.error("Falha ao enviar para a impressora. Usando navegador.");
                setTimeout(() => handleHtmlPrint(), 300);
            }
        },
        onError: (e: any) => toast.error(e.message),
    });

    const printQueue = () => {
        if (!queue.length) return;
        printQueueMut.mutate(queue.map((q) => q.assetId));
    };

    // ─── Templates (novo modelo via editor) ─────
    const createTemplate = useMutation({
        mutationFn: (data: any) => apiClient.post<{ data: any }>("/labels/templates", data, fetchOpts),
        onSuccess: (res: any) => { toast.success("Template salvo!"); qc.invalidateQueries({ queryKey: ["label-templates"] }); if (res?.data?.id) setEditingId(res.data.id); },
        onError: (e: any) => toast.error(e.message),
    });
    const updateTemplate = useMutation({
        mutationFn: (data: any) => apiClient.put(`/labels/templates/${data.id}`, { name: data.name, layout: data.layout }, fetchOpts),
        onSuccess: () => { toast.success("Template atualizado!"); qc.invalidateQueries({ queryKey: ["label-templates"] }); },
        onError: (e: any) => toast.error(e.message),
    });
    const deleteTemplate = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/labels/templates/${id}`, fetchOpts),
        onSuccess: (_res: any, id: string) => {
            toast.success("Template excluído!");
            qc.invalidateQueries({ queryKey: ["label-templates"] });
            setDeleteConfirm(null);
            if (editingId === id) { setEditorTemplate(blankTemplate()); setEditingId(null); }
            if (selectedTemplateId === id) setSelectedTemplateId("default");
        },
        onError: (e: any) => toast.error(e.message),
    });

    const newTemplateEditor = () => { setEditorTemplate(blankTemplate()); setEditingId(null); };
    const loadTemplateToEditor = (t: LabelTemplate) => { setEditorTemplate(t); setEditingId(t.id ?? null); };
    const saveTemplate = () => {
        if (!editorTemplate.name.trim()) { toast.error("Dê um nome ao template"); return; }
        const payload = { name: editorTemplate.name, layout: serializeTemplate(editorTemplate) };
        if (editingId) updateTemplate.mutate({ id: editingId, ...payload });
        else createTemplate.mutate(payload);
    };
    const duplicateTemplate = () => {
        const name = `${editorTemplate.name} (cópia)`;
        setEditingId(null);
        setEditorTemplate({ ...editorTemplate, name });
        createTemplate.mutate({ name, layout: serializeTemplate({ ...editorTemplate, name }) });
    };
    const setDefaultTemplate = (id: string) => {
        localStorage.setItem("defaultTemplateId", id);
        setSelectedTemplateId(id);
        toast.success("Template definido como padrão");
    };

    const tabs = [
        { key: "selection", label: "Seleção", icon: ListChecks },
        { key: "printing", label: "Impressão", icon: Printer },
        { key: "templates", label: "Templates", icon: FileText },
        { key: "history", label: "Histórico", icon: History },
    ];

    // A lista já vem filtrada e paginada do servidor.
    const filteredAssets = allAssets?.data ?? [];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Tag className="text-[var(--zyllen-highlight)]" /> Etiquetas
            </h1>
            <p className="text-sm text-[var(--zyllen-muted)] mt-1">{PAGE_DESCRIPTIONS.etiquetas}</p>

            {/* Abas */}
            <div className="flex gap-1 bg-[var(--zyllen-bg)] rounded-xl p-1 border border-[var(--zyllen-border)] w-fit">
                {tabs.map((t) => {
                    const count = t.key === "printing" ? totalLabels : 0;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key as Tab)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key
                                ? "bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg)]"
                                : "text-[var(--zyllen-muted)] hover:text-white"
                                }`}
                        >
                            <t.icon size={16} /> {t.label}
                            {count > 0 && (
                                <span className={`ml-1 rounded-full px-1.5 text-[10px] font-bold ${tab === t.key ? "bg-[var(--zyllen-bg)]/20" : "bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg)]"}`}>{count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ═══ SELEÇÃO ═══ */}
            {tab === "selection" && (
                <div className="space-y-4">
                    {/* Bipar código direto para a fila */}
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardContent className="pt-6">
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                                    <Input
                                        value={scanCode}
                                        onChange={(e) => setScanCode(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleScanAdd()}
                                        placeholder="Bipar ou digitar código do patrimônio para adicionar à fila..."
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-10 font-mono"
                                    />
                                </div>
                                <Button variant="highlight" onClick={handleScanAdd}>
                                    <Plus size={16} /> Adicionar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Toolbar de seleção */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                            {fetchingAssets && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--zyllen-muted)]" />}
                            <Input
                                value={selSearch}
                                onChange={(e) => setSelSearch(e.target.value)}
                                placeholder="Buscar por código ou nome (todos os itens)..."
                                className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-8 pr-8 h-9 text-sm font-mono"
                            />
                        </div>
                        {selected.size > 0 && (
                            <Button variant="highlight" className="gap-2" onClick={sendSelectionToPrint}>
                                <Send size={15} /> Enviar para impressão ({selected.size})
                            </Button>
                        )}
                        {selected.size > 0 && (
                            <button onClick={() => setSelected(new Map())} className="text-xs text-[var(--zyllen-muted)] hover:text-white flex items-center gap-1">
                                <X size={13} /> Limpar seleção
                            </button>
                        )}
                    </div>

                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-white text-sm flex items-center gap-2">
                                <ListChecks size={16} className="text-[var(--zyllen-highlight)]" />
                                Selecionar Itens
                                {allAssets?.total != null && (
                                    <span className="text-[var(--zyllen-muted)] font-normal">({allAssets.total} total)</span>
                                )}
                            </CardTitle>
                            {filteredAssets.length > 0 && (
                                <button
                                    className="text-xs text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)] flex items-center gap-1 transition-colors"
                                    onClick={() => {
                                        const allVisibleSelected = filteredAssets.every((a: any) => selected.has(a.id));
                                        const next = new Map(selected);
                                        filteredAssets.forEach((a: any) => allVisibleSelected ? next.delete(a.id) : next.set(a.id, a));
                                        setSelected(next);
                                    }}
                                >
                                    <CheckSquare size={13} /> Selecionar todos desta página
                                </button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {loadingAssets ? (
                                <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="flex items-center gap-3"><div className="size-4 rounded bg-[var(--zyllen-border)]" /><div className="h-4 flex-1 rounded bg-[var(--zyllen-border)]" /></div>)}</div>
                            ) : filteredAssets.length ? (
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
                                            {filteredAssets.map((a: any) => {
                                                const checked = selected.has(a.id);
                                                return (
                                                    <tr
                                                        key={a.id}
                                                        className={`border-b border-[var(--zyllen-border)]/40 cursor-pointer transition-colors ${checked ? "bg-[var(--zyllen-highlight)]/5" : "hover:bg-white/[0.02]"}`}
                                                        onClick={() => {
                                                            const next = new Map(selected);
                                                            checked ? next.delete(a.id) : next.set(a.id, a);
                                                            setSelected(next);
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
                                <p className="text-center py-8 text-[var(--zyllen-muted)] text-sm">
                                    {debouncedSelSearch ? `Nenhum item encontrado para "${debouncedSelSearch}"` : "Nenhum item cadastrado"}
                                </p>
                            )}

                            {/* Paginação */}
                            {assetsTotalPages > 1 && (
                                <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-[var(--zyllen-border)]/50 flex-wrap">
                                    <span className="text-xs text-[var(--zyllen-muted)]">
                                        Página {selPage} de {assetsTotalPages}
                                        {selected.size > 0 && <span className="ml-2 text-[var(--zyllen-highlight)]">· {selected.size} selecionado(s)</span>}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-[var(--zyllen-border)] text-white hover:bg-white/5 disabled:opacity-40"
                                            onClick={() => setSelPage((p) => Math.max(1, p - 1))}
                                            disabled={selPage <= 1 || fetchingAssets}
                                        >
                                            Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-[var(--zyllen-border)] text-white hover:bg-white/5 disabled:opacity-40"
                                            onClick={() => setSelPage((p) => Math.min(assetsTotalPages, p + 1))}
                                            disabled={selPage >= assetsTotalPages || fetchingAssets}
                                        >
                                            Próxima
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ IMPRESSÃO ═══ */}
            {tab === "printing" && (
                <div className="space-y-4">
                    {/* Configuração */}
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader className="pb-3"><CardTitle className="text-white text-sm">Configuração da Impressão</CardTitle></CardHeader>
                        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-[var(--zyllen-muted)]">Template:</span>
                                <select
                                    className="h-8 rounded border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] text-white px-2 text-xs focus:outline-none"
                                    value={selectedTemplateId}
                                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                                >
                                    <option value="default">{DEFAULT_TEMPLATE.name}</option>
                                    {savedTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <span className="text-[10px] text-[var(--zyllen-muted)]">{activeTemplate.widthMm}×{activeTemplate.heightMm}mm</span>
                            </div>
                            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                                <Printer size={14} className="text-[var(--zyllen-muted)] shrink-0" />
                                <input
                                    type="text"
                                    value={printerUrl}
                                    onChange={(e) => setPrinterUrl(e.target.value)}
                                    onBlur={(e) => savePrinterUrl(e.target.value)}
                                    placeholder="URL do túnel do Browser Print (vazio = localhost)"
                                    className="flex-1 h-8 rounded border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] text-white px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                                    title="Endereço do Zebra Browser Print. Vazio = máquina local (127.0.0.1)."
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-[var(--zyllen-border)] text-white hover:bg-white/5 shrink-0"
                                    onClick={testPrinterConnection}
                                    disabled={testingPrinter}
                                >
                                    {testingPrinter ? <Loader2 size={13} className="animate-spin" /> : "Testar conexão"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {queue.length === 0 ? (
                        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                            <CardContent className="py-12 text-center">
                                <Printer size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/40" />
                                <p className="text-[var(--zyllen-muted)]">A fila de impressão está vazia.</p>
                                <Button variant="outline" className="mt-4 border-[var(--zyllen-border)] text-white" onClick={() => setTab("selection")}>
                                    <ListChecks size={15} /> Ir para Seleção
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid lg:grid-cols-3 gap-4">
                            {/* Fila */}
                            <div className="lg:col-span-2 space-y-3">
                                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                        <CardTitle className="text-white text-sm">Fila de Impressão ({queue.length} {queue.length === 1 ? "item" : "itens"})</CardTitle>
                                        <button onClick={() => setQueue([])} className="text-xs text-[var(--zyllen-muted)] hover:text-red-400 flex items-center gap-1">
                                            <Trash2 size={13} /> Limpar fila
                                        </button>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {queue.map((q) => (
                                            <div key={q.assetId} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-white text-sm font-medium truncate">{q.skuName || "—"}</p>
                                                    <p className="text-xs text-[var(--zyllen-muted)] font-mono">
                                                        SKU {q.skuCode}{q.assetCode ? ` · Patrimônio ${q.assetCode}` : ""}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button onClick={() => setItemCopies(q.assetId, q.copies - 1)} className="size-7 rounded border border-[var(--zyllen-border)] text-white flex items-center justify-center hover:bg-white/5"><Minus size={13} /></button>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={99}
                                                        value={q.copies}
                                                        onChange={(e) => setItemCopies(q.assetId, Number(e.target.value))}
                                                        className="w-12 h-7 rounded border border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] text-white text-center text-sm focus:outline-none"
                                                    />
                                                    <button onClick={() => setItemCopies(q.assetId, q.copies + 1)} className="size-7 rounded border border-[var(--zyllen-border)] text-white flex items-center justify-center hover:bg-white/5"><Plus size={13} /></button>
                                                </div>
                                                <button onClick={() => removeFromQueue(q.assetId)} className="p-1.5 text-[var(--zyllen-muted)] hover:text-red-400 shrink-0" title="Remover"><Trash2 size={15} /></button>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <div className="flex items-center justify-end gap-3 flex-wrap">
                                    <Button variant="highlight" className="gap-2" onClick={printQueue} disabled={printQueueMut.isPending}>
                                        <Printer size={16} />
                                        {printQueueMut.isPending ? "Imprimindo..." : `Imprimir fila (${totalLabels})`}
                                    </Button>
                                </div>
                            </div>

                            {/* Preview — mostra a 1ª linha conforme as colunas do template */}
                            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-highlight)]/20 h-fit">
                                <CardHeader className="pb-3"><CardTitle className="text-white text-sm flex items-center gap-2"><Tag size={16} className="text-[var(--zyllen-highlight)]" /> Preview</CardTitle></CardHeader>
                                <CardContent className="flex flex-col items-center">
                                    <div style={{ display: "flex", gap: (activeTemplate.gapXMm || 0) * 6, background: "white", padding: 2 }}>
                                        {queue.slice(0, Math.max(1, activeTemplate.columns || 1)).map((q) => (
                                            <LabelPreview
                                                key={q.assetId}
                                                template={{ ...activeTemplate, columns: 1 }}
                                                data={{
                                                    assetCode: q.assetCode,
                                                    skuName: q.skuName,
                                                    skuCode: q.skuCode,
                                                    qrContent: q.qrContent,
                                                    location: q.location,
                                                }}
                                                pxPerMm={6}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-[var(--zyllen-muted)] mt-3 text-center">
                                        {(activeTemplate.columns || 1) > 1 ? `1ª linha · ${activeTemplate.columns} colunas` : "Prévia do 1º item"} · fiel à impressão
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            {/* ═══ HIDDEN PRINT SHEET (fallback HTML) ═══ */}
            {htmlLabels && htmlLabels.length > 0 && (
                <div id="queue-print-sheet" style={{ display: "none" }}>
                    {htmlLabels.map((label, i) => (
                        <div key={i} style={{ padding: "3mm", background: "white" }}>
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

            {/* ═══ HISTÓRICO ═══ */}
            {tab === "history" && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
                        <CardTitle className="text-white">Histórico de Impressões</CardTitle>
                        <div className="relative w-full sm:w-64">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                            <Input
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                placeholder="Buscar por patrimônio ou usuário..."
                                className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-8 h-9 text-sm"
                            />
                        </div>
                    </CardHeader>
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
                        ) : (() => {
                            const rows = (history?.data ?? []).filter((h: any) => {
                                if (!historySearch.trim()) return true;
                                const q = normalize(historySearch);
                                return normalize(h.asset?.assetCode ?? "").includes(q) || normalize(h.printedBy?.name ?? "").includes(q);
                            });
                            return rows.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--zyllen-border)]">
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Data</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Patrimônio</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Item</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Impresso por</th>
                                                <th className="text-right py-3 text-[var(--zyllen-muted)] font-medium">Ação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((h: any) => (
                                                <tr key={h.id} className="border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02]">
                                                    <td className="py-3 text-[var(--zyllen-muted)] text-xs">{new Date(h.printedAt).toLocaleString("pt-BR")}</td>
                                                    <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{h.asset?.assetCode}</td>
                                                    <td className="py-3 text-white">{h.asset?.sku?.name ?? "—"}</td>
                                                    <td className="py-3 text-white">{h.printedBy?.name}</td>
                                                    <td className="py-3 text-right">
                                                        <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs" onClick={() => reprintFromHistory(h)}>
                                                            <Printer size={13} /> Reimprimir
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12"><History size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/50" /><p className="text-[var(--zyllen-muted)]">{historySearch ? "Nenhum resultado para a busca." : EMPTY_STATES.printHistory}</p></div>
                            );
                        })()}
                    </CardContent>
                </Card>
            )}

            {/* ═══ TEMPLATES ═══ */}
            {tab === "templates" && (
                <div className="space-y-4">
                    {/* Ações */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" className="border-[var(--zyllen-border)] text-white gap-1" onClick={newTemplateEditor}>
                            <Plus size={15} /> Novo
                        </Button>
                        <Button variant="highlight" className="gap-1" onClick={saveTemplate} disabled={createTemplate.isPending || updateTemplate.isPending}>
                            {editingId ? "Salvar alterações" : "Salvar template"}
                        </Button>
                        {editingId && (
                            <>
                                <Button variant="outline" className="border-[var(--zyllen-border)] text-white gap-1" onClick={duplicateTemplate}>
                                    <Copy size={15} /> Duplicar
                                </Button>
                                <Button variant="outline" className="border-[var(--zyllen-border)] text-white gap-1" onClick={() => setDefaultTemplate(editingId)}>
                                    <Star size={15} /> Definir padrão
                                </Button>
                            </>
                        )}
                        {editingId && (
                            <span className="text-xs text-[var(--zyllen-muted)]">Editando: <span className="text-white">{editorTemplate.name}</span></span>
                        )}
                    </div>

                    {/* Editor */}
                    <TemplateEditor template={editorTemplate} onChange={setEditorTemplate} />

                    {/* Templates salvos */}
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader><CardTitle className="text-white text-sm">Templates salvos</CardTitle></CardHeader>
                        <CardContent>
                            {savedTemplates.length ? (
                                <div className="space-y-2">
                                    {savedTemplates.map((t) => (
                                        <div key={t.id} className={`flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border ${editingId === t.id ? "border-[var(--zyllen-highlight)]/50" : "border-[var(--zyllen-border)]/50"} group`}>
                                            <button className="text-left flex-1" onClick={() => loadTemplateToEditor(t)}>
                                                <p className="text-white text-sm font-medium flex items-center gap-2">
                                                    {t.name}
                                                    {selectedTemplateId === t.id && <span className="text-[10px] text-[var(--zyllen-highlight)] flex items-center gap-0.5"><Star size={10} /> padrão</span>}
                                                </p>
                                                <p className="text-xs text-[var(--zyllen-muted)]">{t.widthMm}×{t.heightMm}mm · {t.elements.length} elemento(s)</p>
                                            </button>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => loadTemplateToEditor(t)} className="p-1 text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)]" title="Editar"><Pencil size={14} /></button>
                                                <button onClick={() => setDeleteConfirm({ id: t.id, name: t.name })} className="p-1 text-[var(--zyllen-muted)] hover:text-red-400" title="Excluir"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-[var(--zyllen-muted)] text-center py-4">{EMPTY_STATES.templates}</p>}
                        </CardContent>
                    </Card>
                </div>
            )}

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
