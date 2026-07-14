"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuth, useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import { Package, ArrowDownCircle, ArrowUpCircle, History, Search, Hash, Loader2, TrendingDown, ClipboardList, X, Camera, Upload, BarChart2, MapPin, RefreshCw, FileDown, Zap, CheckCircle2, ChevronRight } from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@web/components/ui/dialog";
import Link from "next/link";
import { EMPTY_STATES, TOASTS, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";

const ALLOWED_MEDIA_MIME = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm"]);
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Estado real do patrimônio para exibição: "Em estoque" quando está no estoque,
// o motivo da última saída quando saiu, ou "Baixado"/"Em Manutenção".
function assetStateBadge(a: any): { label: string; variant: "success" | "destructive" | "warning" | "default" } {
    if (a.status === "BAIXADO") return { label: "Baixado", variant: "destructive" };
    if (a.status === "EM_MANUTENCAO") return { label: "Em Manutenção", variant: "warning" };
    const inStock = !!a.currentLocationId || !!a.currentLocation;
    if (!inStock) {
        const motivo = String(a.lastExitReason || "").split(" — ")[0].trim();
        return { label: motivo || "Fora do estoque", variant: "default" };
    }
    return { label: "Em estoque", variant: "success" };
}

function SkuSearchCombobox({ skus, value, onChange }: { skus: any[]; value: string; onChange: (id: string) => void }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const selected = skus?.find((s: any) => s.id === value);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const normalize = (str: string) => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";

    const filtered = query.trim()
        ? skus?.filter((s: any) => {
            const q = normalize(query);
            return normalize(s.name).includes(q)
                || normalize(s.skuCode).includes(q)
                || (s.barcode && normalize(s.barcode).includes(q))
                || (s.brand && normalize(s.brand).includes(q));
        }) ?? []
        : skus ?? [];

    return (
        <div ref={ref} className="relative">
            {selected ? (
                <div className="flex items-center gap-2 h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                    <span className="font-mono text-[var(--zyllen-highlight)] text-xs">{selected.skuCode}</span>
                    <span className="truncate flex-1">{selected.name}</span>
                    {selected.barcode && <span className="text-[var(--zyllen-muted)] text-xs hidden sm:inline">({selected.barcode})</span>}
                    <button type="button" onClick={() => { onChange(""); setQuery(""); }} className="text-[var(--zyllen-muted)] hover:text-white ml-1">
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        placeholder="Buscar por nome, código do item ou código de barras..."
                        className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-9 pr-3 text-sm placeholder:text-[var(--zyllen-muted)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                    />
                </div>
            )}
            {open && !selected && (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] shadow-xl">
                    {filtered.length ? filtered.map((s: any) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => { onChange(s.id); setQuery(""); setOpen(false); }}
                            className="w-full text-left px-3 py-2 hover:bg-[var(--zyllen-highlight)]/10 transition-colors flex items-center gap-2 text-sm border-b border-[var(--zyllen-border)]/30 last:border-0"
                        >
                            <span className="font-mono text-[var(--zyllen-highlight)] text-xs w-16 shrink-0">{s.skuCode}</span>
                            <span className="text-white truncate flex-1">{s.name}</span>
                            {s.barcode && <span className="text-[var(--zyllen-muted)] text-xs shrink-0">{s.barcode}</span>}
                        </button>
                    )) : (
                        <div className="px-3 py-4 text-center text-[var(--zyllen-muted)] text-sm">Nenhum item encontrado</div>
                    )}
                </div>
            )}
            {/* Hidden input for form validation */}
            <input type="text" value={value} required tabIndex={-1} className="sr-only" onChange={() => {}} />
        </div>
    );
}

export default function EstoquePage() {
    const { user } = useAuth();
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [tab, setTab] = useState<"balances" | "bipe" | "entry" | "exit" | "movements" | "reports">("balances");
    const [balancesSearch, setBalancesSearch] = useState("");
    // Histórico — busca + paginação (server-side)
    const MOVEMENTS_PER_PAGE = 50;
    const [movementsSearch, setMovementsSearch] = useState("");
    const [debouncedMovementsSearch, setDebouncedMovementsSearch] = useState("");
    const [movementsPage, setMovementsPage] = useState(1);
    const [detailMovement, setDetailMovement] = useState<any>(null);
    const [entryForm, setEntryForm] = useState({ skuId: "", locationId: "", transferToId: "", quantity: 1, pin: "", reason: "", assetCode: "" });
    const [createdAssetCodes, setCreatedAssetCodes] = useState<string[]>([]);
    const [entryMediaFiles, setEntryMediaFiles] = useState<File[]>([]);
    const entryMediaFilesInputRef = useRef<HTMLInputElement>(null);
    const entryMediaCameraInputRef = useRef<HTMLInputElement>(null);
    // Exit — por patrimônio individual
    const [exitSkuId, setExitSkuId] = useState("");
    const [exitAsset, setExitAsset] = useState<any>(null);
    const [exitCodeQuery, setExitCodeQuery] = useState("");
    const [exitCodeOpen, setExitCodeOpen] = useState(false);
    const [exitNewPin, setExitNewPin] = useState("");
    const [exitNewMotivo, setExitNewMotivo] = useState("");
    const [exitNewReason, setExitNewReason] = useState("");
    const exitCodeRef = useRef<HTMLDivElement>(null);
    const exitCodeInputRef = useRef<HTMLInputElement>(null);

    // Detail panel — click on a balance row to see all assets
    const [detailSku, setDetailSku] = useState<{ id: string; name: string; skuCode: string; codePrefix?: string } | null>(null);
    const { data: detailAssets, isLoading: loadingDetail } = useQuery({
        queryKey: ["sku-assets-detail", detailSku?.id],
        queryFn: () => apiClient.get<{ data: any[] }>(`/assets?skuId=${detailSku!.id}&limit=1000`, fetchOpts),
        enabled: !!detailSku,
    });

    // Bipagem Rápida
    const [bipeCode, setBipeCode] = useState("");
    const [bipeSku, setBipeSku] = useState<any>(null);
    const [bipeAsset, setBipeAsset] = useState<any>(null); // patrimônio específico resolvido pela etiqueta
    const [bipeScanning, setBipeScanning] = useState(false);
    const [bipeQty, setBipeQty] = useState(1);
    const [bipeMode, setBipeMode] = useState<"entry" | "exit" | "transfer">("entry");
    const [bipeLocationId, setBipeLocationId] = useState("");
    const [bipePin, setBipePin] = useState("");
    const [bipeSuccess, setBipeSuccess] = useState(false);
    const bipeInputRef = useRef<HTMLInputElement>(null);
    const bipeQtyRef = useRef<HTMLInputElement>(null);

    const canUploadMedia = user?.type === "internal" && ["Técnico", "Gestor", "Administrador"].includes((user as any).role?.name ?? "");

    const entryMediaPreviews = useMemo(
        () => entryMediaFiles.map((file) => ({
            file,
            url: URL.createObjectURL(file),
            isImage: file.type.startsWith("image/"),
        })),
        [entryMediaFiles],
    );

    useEffect(() => {
        return () => {
            for (const preview of entryMediaPreviews) {
                URL.revokeObjectURL(preview.url);
            }
        };
    }, [entryMediaPreviews]);

    const appendEntryMedia = (files: FileList | null) => {
        if (!files?.length) return;
        const selected = Array.from(files);
        const invalid = selected.find((file) => !ALLOWED_MEDIA_MIME.has(file.type));
        if (invalid) {
            toast.error("Arquivo inválido. Use JPG, PNG, WEBP, MP4, MOV ou WEBM.");
            return;
        }
        setEntryMediaFiles((prev) => {
            const map = new Map(prev.map((file) => [`${file.name}-${file.size}-${file.lastModified}`, file]));
            for (const file of selected) {
                map.set(`${file.name}-${file.size}-${file.lastModified}`, file);
            }
            return Array.from(map.values());
        });
    };

    const removeEntryMedia = (index: number) => {
        setEntryMediaFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const { data: balances, isLoading: loadingBalances } = useQuery({
        queryKey: ["balances"],
        queryFn: () => apiClient.get<{ data: any[] }>("/inventory/balances", fetchOpts),
    });
    // Debounce da busca do histórico (evita 1 request por tecla)
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedMovementsSearch(movementsSearch.trim());
            setMovementsPage(1);
        }, 350);
        return () => clearTimeout(t);
    }, [movementsSearch]);

    const { data: movements, isLoading: loadingMovements, isFetching: fetchingMovements } = useQuery({
        queryKey: ["movements", debouncedMovementsSearch, movementsPage],
        queryFn: () => apiClient.get<{ data: any[]; total: number; page: number; limit: number }>(
            `/inventory/movements?page=${movementsPage}&limit=${MOVEMENTS_PER_PAGE}${debouncedMovementsSearch ? `&search=${encodeURIComponent(debouncedMovementsSearch)}` : ""}`,
            fetchOpts,
        ),
        enabled: tab === "movements",
        placeholderData: keepPreviousData,
    });
    const movementsTotal = movements?.total ?? 0;
    const movementsTotalPages = Math.max(1, Math.ceil(movementsTotal / MOVEMENTS_PER_PAGE));
    const { data: skus } = useQuery({
        queryKey: ["skus"],
        queryFn: () => apiClient.get<{ data: any[] }>("/catalog/skus", fetchOpts),
    });
    const { data: locations } = useQuery({
        queryKey: ["locations"],
        queryFn: () => apiClient.get<{ data: any[] }>("/locations", fetchOpts),
    });
    const { data: movementTypes } = useQuery({
        queryKey: ["movementTypes"],
        queryFn: () => apiClient.get<{ data: any[] }>("/inventory/movement-types", fetchOpts),
    });
    const { data: exitReasons } = useQuery({
        queryKey: ["exitReasons"],
        queryFn: () => apiClient.get<{ data: any[] }>("/inventory/exit-reasons?onlyActive=true", fetchOpts),
    });

    const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
        queryKey: ["inventory-stats"],
        queryFn: () => apiClient.get<{ data: any }>("/inventory/stats", fetchOpts),
        enabled: tab === "reports",
        staleTime: 60_000,
    });

    // Exit — lista de patrimônios do SKU selecionado
    const { data: exitSkuAssetsData, isLoading: loadingExitSkuAssets } = useQuery({
        queryKey: ["exit-sku-assets", exitSkuId],
        queryFn: () => apiClient.get<{ data: any[] }>(`/assets?skuId=${exitSkuId}&limit=100`, fetchOpts),
        enabled: !!exitSkuId && !exitAsset,
    });
    // Exit — busca por código (sem SKU selecionado, para o leitor de código de barras)
    const { data: exitSearchData } = useQuery({
        queryKey: ["exit-search", exitCodeQuery],
        queryFn: () => apiClient.get<{ data: any[] }>(`/assets?search=${encodeURIComponent(exitCodeQuery)}&limit=20`, fetchOpts),
        enabled: !exitSkuId && exitCodeQuery.length >= 2 && !exitAsset,
        staleTime: 300,
    });
    const exitOptions: any[] = exitSkuId
        ? (exitSkuAssetsData?.data ?? []).filter((a: any) =>
            !exitCodeQuery || a.assetCode.toLowerCase().includes(exitCodeQuery.toLowerCase())
        )
        : (exitSearchData?.data ?? []);

    const findTypeId = (name: string) => movementTypes?.data?.find((t: any) => t.name.toLowerCase() === name.toLowerCase())?.id;

    const entryMut = useMutation({
        mutationFn: async (data: any) => {
            const entradaId = findTypeId("Entrada");
            const transferenciaId = findTypeId("Transferência") || entradaId;
            const postEntry = async (payload: { skuId: string; toLocationId: string; qty: number; movementTypeId: string; pin: string; reason?: string; assetId?: string }, files?: File[]) => {
                if (files?.length) {
                    const formData = new FormData();
                    formData.append("skuId", payload.skuId);
                    formData.append("toLocationId", payload.toLocationId);
                    formData.append("qty", String(payload.qty));
                    formData.append("movementTypeId", payload.movementTypeId);
                    formData.append("pin", payload.pin);
                    if (payload.reason) formData.append("reason", payload.reason);
                    if (payload.assetId) formData.append("assetId", payload.assetId);
                    for (const file of files) formData.append("files", file);
                    return apiClient.upload("/inventory/entry", formData, fetchOpts);
                }
                return apiClient.post("/inventory/entry", payload, fetchOpts);
            };

            if (data.transferToId) {
                const saidaId = findTypeId("Saída") || entradaId;
                await apiClient.post("/inventory/exit", { skuId: data.skuId, fromLocationId: data.locationId, qty: data.quantity, movementTypeId: saidaId, pin: data.pin, reason: data.reason || "Transferência entre locais", assetId: data.assetId }, fetchOpts);
                return postEntry({ skuId: data.skuId, toLocationId: data.transferToId, qty: data.quantity, movementTypeId: transferenciaId || entradaId, pin: data.pin, reason: data.reason || "Transferência entre locais", assetId: data.assetId }, data.files);
            } else {
                return postEntry({ skuId: data.skuId, toLocationId: data.locationId, qty: data.quantity, movementTypeId: entradaId, pin: data.pin, reason: data.reason || undefined, assetId: data.assetId }, data.files);
            }
        },
        onSuccess: (result: any) => {
            const codes: string[] = result?.data?.createdAssetCodes ?? [];
            if (codes.length > 0) {
                setCreatedAssetCodes(codes);
                toast.success(`${codes.length} patrimônio${codes.length > 1 ? 's criados' : ' criado'}: ${codes.slice(0, 3).join(', ')}${codes.length > 3 ? ` +${codes.length - 3}` : ''}`, { duration: 8000 });
            } else {
                toast.success(entryForm.transferToId ? TOASTS.transferDone : TOASTS.entryRegistered);
            }
            qc.invalidateQueries({ queryKey: ["balances"] });
            qc.invalidateQueries({ queryKey: ["movements"] });
            setEntryForm({ skuId: "", locationId: "", transferToId: "", quantity: 1, pin: "", reason: "", assetCode: "" });
            setEntryMediaFiles([]);
        },
        onError: (e: any) => toast.error(e.message),
    });
    const exitMut = useMutation({
        mutationFn: (data: any) => {
            const saidaId = findTypeId("Saída");
            const reasonText = [data.motivo, data.reason].filter(Boolean).join(" — ");
            return apiClient.post("/inventory/exit", {
                skuId: data.skuId,
                fromLocationId: data.locationId,
                qty: 1,
                movementTypeId: saidaId,
                pin: data.pin,
                reason: reasonText || undefined,
                assetId: data.assetId,
            }, fetchOpts);
        },
        onSuccess: () => {
            toast.success(TOASTS.exitRegistered);
            qc.invalidateQueries({ queryKey: ["balances"] });
            qc.invalidateQueries({ queryKey: ["movements"] });
            qc.invalidateQueries({ queryKey: ["exit-sku-assets", exitSkuId] });
            setExitAsset(null);
            setExitCodeQuery("");
            setExitNewPin("");
            setExitNewMotivo("");
            setExitNewReason("");
        },
        onError: (e: any) => toast.error(e.message),
    });

    const selectedEntrySku = skus?.data?.find((s: any) => s.id === entryForm.skuId);
    const [entryLookingUp, setEntryLookingUp] = useState(false);
    const isEntryReturn = !!entryForm.assetCode.trim();

    // Entrada: se um código de patrimônio for informado, é RETORNO de um item
    // existente (volta ao estoque com o mesmo código). Se o código não existir,
    // a operação é barrada. Sem código = item novo (código gerado automaticamente).
    const handleEntrySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = entryForm.assetCode?.trim().toUpperCase();
        if (code) {
            if (!entryForm.locationId) { toast.error("Selecione o local"); return; }
            if (!entryForm.pin) { toast.error("Informe o PIN"); return; }
            setEntryLookingUp(true);
            let asset: any = null;
            try {
                const res = await apiClient.get<{ data: any }>(`/assets/lookup/${encodeURIComponent(code)}`, fetchOpts);
                asset = res?.data;
            } catch {
                setEntryLookingUp(false);
                toast.error(`Patrimônio "${code}" não existe. Verifique o código.`);
                return;
            }
            setEntryLookingUp(false);
            if (!asset) { toast.error(`Patrimônio "${code}" não existe. Verifique o código.`); return; }
            entryMut.mutate({
                skuId: asset.skuId,
                locationId: entryForm.locationId,
                quantity: 1,
                pin: entryForm.pin,
                reason: entryForm.reason || `Retorno do patrimônio ${asset.assetCode}`,
                assetId: asset.id,
                files: entryMediaFiles,
            });
        } else {
            if (!entryForm.skuId) { toast.error("Selecione o item"); return; }
            entryMut.mutate({ ...entryForm, files: entryMediaFiles });
        }
    };

    const normalizeStr = (s: string) => s?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") ?? "";

    const resetBipeSelection = () => {
        setBipeSku(null);
        setBipeAsset(null);
        setBipeLocationId("");
        setBipePin("");
        setBipeQty(1);
    };

    const handleBipeScan = async () => {
        const code = bipeCode.trim();
        if (!code || bipeScanning) return;
        setBipeScanning(true);
        try {
            // 1) Primeiro tenta resolver como CÓDIGO DE PATRIMÔNIO (etiqueta bipada).
            //    O lookup puxa o item, o local atual e o status daquele patrimônio.
            try {
                const res = await apiClient.get<{ data: any }>(`/assets/lookup/${encodeURIComponent(code.toUpperCase())}`, fetchOpts);
                const asset = res?.data;
                if (asset) {
                    setBipeAsset(asset);
                    setBipeSku(null);
                    // Patrimônio com local → sugere Saída; sem local → sugere Entrada (retorno).
                    setBipeMode(asset.currentLocationId ? "exit" : "entry");
                    setBipeLocationId("");
                    setBipeQty(1);
                    setBipeCode("");
                    return;
                }
            } catch {
                // Não é um patrimônio — cai para a busca por SKU.
            }
            // 2) Fallback: código de SKU ou código de barras (entrada de itens novos, sem etiqueta ainda).
            const norm = normalizeStr(code);
            const found = skus?.data?.find((s: any) =>
                normalizeStr(s.barcode ?? "") === norm ||
                normalizeStr(s.skuCode) === norm
            );
            if (found) {
                setBipeAsset(null);
                setBipeSku(found);
                setBipeMode("entry");
                setBipeQty(1);
                setBipeCode("");
                setTimeout(() => bipeQtyRef.current?.focus(), 50);
            } else {
                toast.error(`Código não encontrado: "${code}"`);
                setBipeCode("");
            }
        } finally {
            setBipeScanning(false);
        }
    };

    const handleBipeSubmit = async () => {
        // ── Patrimônio específico (etiqueta) ──
        if (bipeAsset) {
            if (!bipePin) { toast.error("Informe o PIN"); return; }
            try {
                if (bipeMode === "exit") {
                    if (!bipeAsset.currentLocationId) { toast.error("Patrimônio sem local atual — faça uma entrada primeiro."); return; }
                    await exitMut.mutateAsync({ skuId: bipeAsset.skuId, locationId: bipeAsset.currentLocationId, pin: bipePin, motivo: "Saída rápida", assetId: bipeAsset.id });
                } else if (bipeMode === "entry") {
                    if (!bipeLocationId) { toast.error("Selecione o local de entrada"); return; }
                    await entryMut.mutateAsync({ skuId: bipeAsset.skuId, locationId: bipeLocationId, quantity: 1, pin: bipePin, assetId: bipeAsset.id });
                } else { // transfer
                    if (!bipeAsset.currentLocationId) { toast.error("Patrimônio sem local atual — faça uma entrada primeiro."); return; }
                    if (!bipeLocationId) { toast.error("Selecione o local de destino"); return; }
                    if (bipeLocationId === bipeAsset.currentLocationId) { toast.error("Escolha um destino diferente do local atual"); return; }
                    await entryMut.mutateAsync({ skuId: bipeAsset.skuId, locationId: bipeAsset.currentLocationId, transferToId: bipeLocationId, quantity: 1, pin: bipePin, assetId: bipeAsset.id });
                }
                setBipeSuccess(true);
                resetBipeSelection();
                setTimeout(() => { setBipeSuccess(false); bipeInputRef.current?.focus(); }, 1800);
            } catch {
                // erros tratados nas mutations
            }
            return;
        }

        // ── SKU (entrada de itens novos por quantidade) ──
        if (!bipeSku || !bipeLocationId || !bipePin) {
            toast.error("Preencha local e PIN antes de confirmar");
            return;
        }
        try {
            if (bipeMode === "entry") {
                await entryMut.mutateAsync({ skuId: bipeSku.id, locationId: bipeLocationId, quantity: bipeQty, pin: bipePin });
            } else {
                await exitMut.mutateAsync({ skuId: bipeSku.id, locationId: bipeLocationId, quantity: bipeQty, pin: bipePin, motivo: "Saída rápida" });
            }
            setBipeSuccess(true);
            resetBipeSelection();
            setTimeout(() => {
                setBipeSuccess(false);
                bipeInputRef.current?.focus();
            }, 1800);
        } catch {
            // errors handled by mutations
        }
    };

    // Fechar dropdown de código ao clicar fora
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (exitCodeRef.current && !exitCodeRef.current.contains(e.target as Node)) setExitCodeOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const selectExitAsset = (asset: any) => {
        setExitAsset(asset);
        setExitCodeQuery(asset.assetCode);
        setExitCodeOpen(false);
    };

    const handleExitCodeEnter = () => {
        if (exitAsset) return;
        const trimmed = exitCodeQuery.trim().toUpperCase();
        if (!trimmed) return;
        const exact = exitOptions.find((a: any) => a.assetCode.toUpperCase() === trimmed);
        if (exact) { selectExitAsset(exact); return; }
        if (exitOptions.length === 1) { selectExitAsset(exitOptions[0]); return; }
        setExitCodeOpen(true);
    };

    const handleExitSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!exitAsset) { toast.error("Selecione ou bipe um código de patrimônio"); return; }
        if (!exitNewMotivo) { toast.error("Selecione o motivo da saída"); return; }
        if (!exitNewPin) { toast.error("Informe o PIN"); return; }
        if (!exitAsset.currentLocationId) {
            toast.error("Este patrimônio não possui local definido. Edite o patrimônio antes de dar saída.");
            return;
        }
        exitMut.mutate({
            skuId: exitAsset.skuId,
            locationId: exitAsset.currentLocationId,
            pin: exitNewPin,
            motivo: exitNewMotivo,
            reason: exitNewReason,
            assetId: exitAsset.id,
        });
    };

    const exportCSV = () => {
        if (!balances?.data?.length) return;
        const header = ["Código", "Item", "Local", "Qtd Patrimônios"];
        const rows = balances.data.map((b: any) => [
            b.sku?.skuCode ?? "",
            `"${(b.sku?.name ?? "").replace(/"/g, '""')}"`,
            `"${(b.location?.name ?? "").replace(/"/g, '""')}"`,
            b.quantity,
        ]);
        const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `estoque-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const tabs = [
        { key: "balances", label: "Saldos", icon: Package },
        { key: "bipe", label: "Bipagem Rápida", icon: Zap },
        { key: "entry", label: "Entrada", icon: ArrowDownCircle },
        { key: "exit", label: "Saída", icon: ArrowUpCircle },
        { key: "movements", label: "Histórico", icon: History },
        { key: "reports", label: "Relatórios", icon: BarChart2 },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Package className="text-[var(--zyllen-highlight)]" /> Estoque
                </h1>
                <p className="text-sm text-[var(--zyllen-muted)] mt-1">{PAGE_DESCRIPTIONS.estoque}</p>
                <div className="flex gap-2 flex-wrap">
                    <Link href="/dashboard/equipamentos">
                        <Button variant="outline" className="border-[var(--zyllen-border)] text-white hover:bg-[var(--zyllen-highlight)]/10 hover:text-[var(--zyllen-highlight)] hover:border-[var(--zyllen-highlight)]/30 gap-2">
                            <ClipboardList size={16} /> Equipamentos
                        </Button>
                    </Link>
                    <Link href="/dashboard/saidas">
                        <Button variant="outline" className="border-[var(--zyllen-border)] text-white hover:bg-[var(--zyllen-highlight)]/10 hover:text-[var(--zyllen-highlight)] hover:border-[var(--zyllen-highlight)]/30 gap-2">
                            <TrendingDown size={16} /> Saída de Itens
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[var(--zyllen-bg)] rounded-xl p-1 border border-[var(--zyllen-border)] w-fit">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key
                                ? "bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg)]"
                                : "text-[var(--zyllen-muted)] hover:text-white"
                            }`}
                    >
                        <t.icon size={16} /> {t.label}
                    </button>
                ))}
            </div>

            {tab === "balances" && (
                <div className="space-y-4">
                    {/* Search */}
                    <div className="relative max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                        <input
                            type="text"
                            value={balancesSearch}
                            onChange={(e) => setBalancesSearch(e.target.value)}
                            placeholder="Buscar item por nome, código ou local..."
                            className="w-full h-9 rounded-md border bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] text-white pl-9 pr-3 text-sm placeholder:text-[var(--zyllen-muted)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                        />
                    </div>

                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-white flex items-center justify-between">
                                <span>Saldo por Item × Local</span>
                                {balancesSearch && balances?.data && (
                                    <span className="text-xs font-normal text-[var(--zyllen-muted)]">
                                        {balances.data.filter((b: any) => {
                                            const q = normalizeStr(balancesSearch);
                                            return normalizeStr(b.sku?.name ?? "").includes(q)
                                                || normalizeStr(b.sku?.skuCode ?? "").includes(q)
                                                || normalizeStr(b.location?.name ?? "").includes(q)
                                                || normalizeStr(b.sku?.brand ?? "").includes(q);
                                        }).length} resultado(s)
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingBalances ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="flex items-center gap-4">
                                            <Skeleton className="h-4 w-20" />
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-6 w-10 ml-auto" />
                                        </div>
                                    ))}
                                </div>
                            ) : (() => {
                                const q = normalizeStr(balancesSearch);
                                const filtered = balancesSearch
                                    ? balances?.data?.filter((b: any) =>
                                        normalizeStr(b.sku?.name ?? "").includes(q)
                                        || normalizeStr(b.sku?.skuCode ?? "").includes(q)
                                        || normalizeStr(b.location?.name ?? "").includes(q)
                                        || normalizeStr(b.sku?.brand ?? "").includes(q)
                                    )
                                    : balances?.data;
                                return filtered?.length ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-[var(--zyllen-border)]">
                                                    <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Código</th>
                                                    <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Item</th>
                                                    <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium hidden sm:table-cell">Marca</th>
                                                    <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Local</th>
                                                    <th className="text-right py-3 text-[var(--zyllen-muted)] font-medium">Qtd</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filtered.map((b: any) => (
                                                    <tr
                                                        key={`${b.skuId}-${b.locationId}`}
                                                        className="border-b border-[var(--zyllen-border)]/50 hover:bg-[var(--zyllen-highlight)]/5 cursor-pointer transition-colors group"
                                                        onClick={() => setDetailSku({ id: b.skuId, name: b.sku?.name, skuCode: b.sku?.skuCode, codePrefix: b.sku?.codePrefix })}
                                                    >
                                                        <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{b.sku?.skuCode}</td>
                                                        <td className="py-3">
                                                            <p className="text-white font-medium">{b.sku?.name}</p>
                                                            {b.sku?.category?.name && (
                                                                <p className="text-xs text-[var(--zyllen-muted)]">{b.sku.category.name}</p>
                                                            )}
                                                        </td>
                                                        <td className="py-3 text-[var(--zyllen-muted)] text-xs hidden sm:table-cell">{b.sku?.brand ?? "—"}</td>
                                                        <td className="py-3 text-[var(--zyllen-muted)]">{b.location?.name}</td>
                                                        <td className="py-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Badge variant={b.quantity > 0 ? "success" : "destructive"}>{b.quantity}</Badge>
                                                                <ChevronRight size={14} className="text-[var(--zyllen-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Package size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/50" />
                                        <p className="text-[var(--zyllen-muted)]">
                                            {balancesSearch ? "Nenhum item encontrado para esta busca." : EMPTY_STATES.balances}
                                        </p>
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ BIPAGEM RÁPIDA ═══ */}
            {tab === "bipe" && (
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
            )}

            {tab === "entry" && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-lg">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <ArrowDownCircle className="text-emerald-400" /> Entrada de Estoque
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={handleEntrySubmit}
                            className="space-y-4"
                        >
                            {/* Código de patrimônio: preenchido = retorno de item existente */}
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">
                                    Código de Patrimônio <span className="text-xs font-normal">(em branco = item novo)</span>
                                </Label>
                                <Input
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
                                <Label className="text-[var(--zyllen-muted)]">Local</Label>
                                <select value={entryForm.locationId} onChange={(e) => setEntryForm({ ...entryForm, locationId: e.target.value })} required className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                    <option value="">Selecione...</option>
                                    {locations?.data?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {!isEntryReturn && (
                                    <div className="space-y-2">
                                        <Label className="text-[var(--zyllen-muted)]">Quantidade (patrimônios)</Label>
                                        <Input type="number" min={1} value={entryForm.quantity} onChange={(e) => setEntryForm({ ...entryForm, quantity: +e.target.value })} className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                                    </div>
                                )}
                                <div className={`space-y-2 ${isEntryReturn ? "col-span-2" : ""}`}>
                                    <Label className="text-[var(--zyllen-muted)]">PIN</Label>
                                    <Input type="password" maxLength={4} placeholder="••••" value={entryForm.pin} onChange={(e) => setEntryForm({ ...entryForm, pin: e.target.value })} required className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-center tracking-widest" />
                                </div>
                            </div>
                            {!isEntryReturn && (
                                <div className="space-y-2">
                                    <Label className="text-[var(--zyllen-muted)]">Transferir para</Label>
                                    <select value={entryForm.transferToId} onChange={(e) => setEntryForm({ ...entryForm, transferToId: e.target.value })} className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                                        <option value="">Nenhum (entrada simples)</option>
                                        {locations?.data?.filter((l: any) => l.id !== entryForm.locationId).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Motivo</Label>
                                <Input value={entryForm.reason} onChange={(e) => setEntryForm({ ...entryForm, reason: e.target.value })} placeholder="Compra, reposição..." className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white" />
                            </div>
                            {canUploadMedia && (
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
            )}

            {tab === "exit" && (
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
                                                autoComplete="new-password"
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

                            {/* Motivo + Detalhe + PIN */}
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Motivo da Saída</Label>
                                <select
                                    value={exitNewMotivo}
                                    onChange={(e) => setExitNewMotivo(e.target.value)}
                                    required
                                    className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm"
                                >
                                    <option value="">Selecione...</option>
                                    {exitReasons?.data?.map((r: any) => <option key={r.id} value={r.name}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Detalhe (opcional)</Label>
                                <Input
                                    value={exitNewReason}
                                    onChange={(e) => setExitNewReason(e.target.value)}
                                    placeholder="Detalhes adicionais..."
                                    autoComplete="new-password"
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">PIN</Label>
                                <Input
                                    type="password"
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
            )}

            {tab === "movements" && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader className="space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <CardTitle className="text-white">Histórico de Movimentações</CardTitle>
                            <span className="text-xs text-[var(--zyllen-muted)]">
                                {movementsTotal} movimentaç{movementsTotal === 1 ? "ão" : "ões"}
                                {debouncedMovementsSearch && " encontrada(s)"}
                            </span>
                        </div>
                        <div className="relative max-w-md">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                            {fetchingMovements && (
                                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--zyllen-muted)]" />
                            )}
                            <input
                                type="text"
                                value={movementsSearch}
                                onChange={(e) => setMovementsSearch(e.target.value)}
                                placeholder="Buscar por código, item, patrimônio, responsável, motivo ou local..."
                                className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-9 pr-9 text-sm placeholder:text-[var(--zyllen-muted)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loadingMovements ? (
                            <div className="space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <Skeleton className="h-4 w-28" />
                                        <Skeleton className="h-6 w-16" />
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-4 w-8 ml-auto" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                ))}
                            </div>
                        ) : movements?.data?.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--zyllen-border)]">
                                            <th className="text-left py-3 pr-4 text-[var(--zyllen-muted)] font-medium w-36">Data</th>
                                            <th className="text-left py-3 pr-4 text-[var(--zyllen-muted)] font-medium w-24">Tipo</th>
                                            <th className="text-left py-3 pr-4 text-[var(--zyllen-muted)] font-medium w-24">Código</th>
                                            <th className="text-right py-3 pr-6 text-[var(--zyllen-muted)] font-medium w-16">Qtd</th>
                                            <th className="text-left py-3 pr-4 text-[var(--zyllen-muted)] font-medium w-36">Responsável</th>
                                            <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Motivo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movements.data.map((m: any) => (
                                            <tr
                                                key={m.id}
                                                onClick={() => setDetailMovement(m)}
                                                className="border-b border-[var(--zyllen-border)]/50 hover:bg-[var(--zyllen-highlight)]/5 cursor-pointer transition-colors group"
                                            >
                                                <td className="py-3 pr-4 text-[var(--zyllen-muted)] text-xs">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        {new Date(m.createdAt).toLocaleString("pt-BR")}
                                                        <ChevronRight size={13} className="text-[var(--zyllen-highlight)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <Badge variant={m.toLocationId ? "success" : "destructive"}>
                                                        {m.type?.name ?? (m.toLocationId ? "Entrada" : "Saída")}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 pr-4 text-xs">
                                                    <span className="font-mono text-[var(--zyllen-highlight)]">{m.sku?.skuCode}</span>
                                                    {m.asset?.assetCode && (
                                                        <span className="block font-mono text-[var(--zyllen-muted)]">{m.asset.assetCode}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 pr-6 text-right text-white font-semibold">{m.qty}</td>
                                                <td className="py-3 pr-4 text-white text-xs">{m.createdBy?.name ?? "—"}</td>
                                                <td className="py-3 text-[var(--zyllen-muted)]">{m.reason ?? "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <History size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/50" />
                                <p className="text-[var(--zyllen-muted)]">
                                    {debouncedMovementsSearch
                                        ? `Nenhuma movimentação encontrada para "${debouncedMovementsSearch}".`
                                        : EMPTY_STATES.movements}
                                </p>
                            </div>
                        )}

                        {/* Paginação */}
                        {movementsTotalPages > 1 && (
                            <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-[var(--zyllen-border)]/50 flex-wrap">
                                <span className="text-xs text-[var(--zyllen-muted)]">
                                    Página {movementsPage} de {movementsTotalPages}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-[var(--zyllen-border)] text-white hover:bg-white/5 disabled:opacity-40"
                                        onClick={() => setMovementsPage((p) => Math.max(1, p - 1))}
                                        disabled={movementsPage <= 1 || fetchingMovements}
                                    >
                                        Anterior
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="border-[var(--zyllen-border)] text-white hover:bg-white/5 disabled:opacity-40"
                                        onClick={() => setMovementsPage((p) => Math.min(movementsTotalPages, p + 1))}
                                        disabled={movementsPage >= movementsTotalPages || fetchingMovements}
                                    >
                                        Próxima
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ═══ RELATÓRIOS ═══ */}
            {tab === "reports" && (
                <div className="space-y-6">
                    {/* Header + refresh */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold text-white flex items-center gap-2">
                            <BarChart2 size={18} className="text-[var(--zyllen-highlight)]" /> Relatórios de Estoque
                        </h2>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={exportCSV}
                                disabled={!balances?.data?.length}
                                className="flex items-center gap-1.5 text-xs text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <FileDown size={13} /> Exportar CSV
                            </button>
                            <button
                                onClick={() => refetchStats()}
                                className="flex items-center gap-1.5 text-xs text-[var(--zyllen-muted)] hover:text-white transition-colors"
                            >
                                <RefreshCw size={13} /> Atualizar
                            </button>
                        </div>
                    </div>

                    {loadingStats ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
                        </div>
                    ) : stats?.data ? (
                        <>
                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                                    <CardContent className="pt-5 pb-5">
                                        <p className="text-xs text-[var(--zyllen-muted)] mb-1">Total de itens (SKUs)</p>
                                        <p className="text-3xl font-bold text-white">{stats.data.totalSkus}</p>
                                        <p className="text-xs text-[var(--zyllen-muted)] mt-1">no catálogo</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                                    <CardContent className="pt-5 pb-5">
                                        <p className="text-xs text-[var(--zyllen-muted)] mb-1">Patrimônios cadastrados</p>
                                        <p className="text-3xl font-bold text-white">{stats.data.totalAssets}</p>
                                        <p className="text-xs text-[var(--zyllen-muted)] mt-1">ativos individuais</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                                    <CardContent className="pt-5 pb-5">
                                        <p className="text-xs text-[var(--zyllen-muted)] mb-1">Movimentações (7 dias)</p>
                                        <p className="text-3xl font-bold text-[var(--zyllen-highlight)]">{stats.data.movements.last7}</p>
                                        <p className="text-xs text-[var(--zyllen-muted)] mt-1">entradas e saídas</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                                    <CardContent className="pt-5 pb-5">
                                        <p className="text-xs text-[var(--zyllen-muted)] mb-1">Movimentações (30 dias)</p>
                                        <p className="text-3xl font-bold text-white">{stats.data.movements.last30}</p>
                                        <p className="text-xs text-[var(--zyllen-muted)] mt-1">no último mês</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Status dos patrimônios */}
                                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-white text-sm flex items-center gap-2">
                                            <Hash size={16} className="text-[var(--zyllen-highlight)]" />
                                            Status dos Patrimônios
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {[
                                                { key: "ATIVO", label: "Ativo", color: "bg-emerald-500", text: "text-emerald-400", bar: "bg-emerald-500/20" },
                                                { key: "EM_USO", label: "Em Uso", color: "bg-blue-500", text: "text-blue-400", bar: "bg-blue-500/20" },
                                                { key: "EM_MANUTENCAO", label: "Em Manutenção", color: "bg-amber-500", text: "text-amber-400", bar: "bg-amber-500/20" },
                                                { key: "BAIXADO", label: "Baixado", color: "bg-red-500", text: "text-red-400", bar: "bg-red-500/20" },
                                            ].map(({ key, label, color, text, bar }) => {
                                                const count: number = stats.data.assetsByStatus[key] ?? 0;
                                                const pct = stats.data.totalAssets > 0
                                                    ? Math.round((count / stats.data.totalAssets) * 100)
                                                    : 0;
                                                return (
                                                    <div key={key}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className={`text-xs font-medium ${text}`}>{label}</span>
                                                            <span className="text-xs text-[var(--zyllen-muted)]">{count} ({pct}%)</span>
                                                        </div>
                                                        <div className={`w-full h-2 rounded-full ${bar}`}>
                                                            <div
                                                                className={`h-2 rounded-full ${color} transition-all duration-500`}
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Distribuição por local */}
                            {stats.data.locationDistribution.length > 0 && (
                                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-white text-sm flex items-center gap-2">
                                            <MapPin size={16} className="text-[var(--zyllen-highlight)]" />
                                            Distribuição por Local
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-[var(--zyllen-border)]">
                                                        <th className="text-left py-2 text-[var(--zyllen-muted)] font-medium">Local</th>
                                                        <th className="text-right py-2 text-[var(--zyllen-muted)] font-medium">Itens distintos</th>
                                                        <th className="text-right py-2 text-[var(--zyllen-muted)] font-medium">Qtd total</th>
                                                        <th className="py-2 pl-4">Volume relativo</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {stats.data.locationDistribution.map((loc: any, idx: number) => {
                                                        const maxQty = stats.data.locationDistribution[0]?.totalQuantity ?? 1;
                                                        const pct = maxQty > 0 ? Math.round((loc.totalQuantity / maxQty) * 100) : 0;
                                                        return (
                                                            <tr key={idx} className="border-b border-[var(--zyllen-border)]/40 hover:bg-white/[0.02]">
                                                                <td className="py-3 text-white font-medium">{loc.name}</td>
                                                                <td className="py-3 text-right text-[var(--zyllen-muted)]">{loc.itemCount}</td>
                                                                <td className="py-3 text-right font-semibold text-[var(--zyllen-highlight)]">{loc.totalQuantity}</td>
                                                                <td className="py-3 pl-4">
                                                                    <div className="w-full h-1.5 rounded-full bg-[var(--zyllen-highlight)]/10">
                                                                        <div
                                                                            className="h-1.5 rounded-full bg-[var(--zyllen-highlight)] transition-all duration-500"
                                                                            style={{ width: `${pct}%` }}
                                                                        />
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-16">
                            <BarChart2 size={36} className="mx-auto mb-3 text-[var(--zyllen-muted)]/40" />
                            <p className="text-[var(--zyllen-muted)]">Não foi possível carregar os dados</p>
                        </div>
                    )}
                </div>
            )}

            {/* Detail Dialog — patrimônios de um SKU */}
            <Dialog open={!!detailSku} onOpenChange={(open) => { if (!open) setDetailSku(null); }}>
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
            </Dialog>

            {/* Detail Dialog — detalhe de uma movimentação */}
            <Dialog open={!!detailMovement} onOpenChange={(open) => { if (!open) setDetailMovement(null); }}>
                <DialogContent className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] max-w-lg" onClose={() => setDetailMovement(null)}>
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <History size={18} className="text-[var(--zyllen-highlight)]" />
                            Detalhe da Movimentação
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

                                    <div className="rounded-lg border border-[var(--zyllen-border)] divide-y divide-[var(--zyllen-border)]/50">
                                        {rows.map((r) => (
                                            <div key={r.label} className="flex items-start justify-between gap-4 px-3 py-2.5 text-sm">
                                                <span className="text-[var(--zyllen-muted)] shrink-0">{r.label}</span>
                                                <span className="text-white text-right">{r.value}</span>
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
                                                        <a
                                                            key={att.id}
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block rounded-lg overflow-hidden border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] hover:border-[var(--zyllen-highlight)]/40 transition-colors"
                                                            title={att.fileName}
                                                        >
                                                            {isImage ? (
                                                                <img src={url} alt={att.fileName} className="h-20 w-full object-cover" />
                                                            ) : (
                                                                <video src={url} className="h-20 w-full object-cover" />
                                                            )}
                                                        </a>
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
            </Dialog>
        </div>
    );
}
