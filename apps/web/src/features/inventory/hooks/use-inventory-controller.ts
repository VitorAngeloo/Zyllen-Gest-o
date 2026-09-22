"use client";
import { inventoryApi } from "@web/features/inventory/api/inventory-api";
import { custodyApi } from "@web/features/inventory/api/custody-api";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";

import { useAuth, useAuthedFetch } from "@web/features/auth/context/auth-context";
import { toast } from "sonner";
import { Package, ArrowDownCircle, ArrowUpCircle, History, TrendingDown, BarChart2, Zap, LayoutDashboard, Boxes, MapPin } from "lucide-react";
import { TOASTS } from "@web/lib/brand-voice";
import { ALLOWED_MEDIA_MIME } from "@web/features/inventory/inventory.constants";
import { internalExitDestination } from '@zyllen/shared';


export function useInventoryController() {
    const { user } = useAuth();
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [tab, setTab] = useState<"dashboard" | "balances" | "assets" | "locations" | "bipe" | "entry" | "batchEntry" | "exit" | "batchExit" | "movements" | "reports">("dashboard");
    const [balancesSearch, setBalancesSearch] = useState("");
    // Histórico — busca + paginação (server-side)
    const MOVEMENTS_PER_PAGE = 50;
    const [movementsSearch, setMovementsSearch] = useState("");
    const [debouncedMovementsSearch, setDebouncedMovementsSearch] = useState("");
    const [movementsPage, setMovementsPage] = useState(1);
    const [detailMovement, setDetailMovement] = useState<any>(null);
    const [entryForm, setEntryForm] = useState({ skuId: "", locationId: "", transferToId: "", quantity: 1, pin: "", reason: "", eventDescription: "", assetCode: "" });
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
    const [exitNewEvent, setExitNewEvent] = useState("");
    const [exitCompanyId, setExitCompanyId] = useState("");
    const [exitProjectId, setExitProjectId] = useState("");
    const exitCodeRef = useRef<HTMLDivElement>(null);
    const exitCodeInputRef = useRef<HTMLInputElement>(null);

    // ── Saída em Lote ──
    const [batchQueue, setBatchQueue] = useState<Map<string, any>>(new Map());
    const [batchScan, setBatchScan] = useState("");
    const [batchScanning, setBatchScanning] = useState(false);
    const [batchResults, setBatchResults] = useState<any[]>([]);
    const [batchMotivo, setBatchMotivo] = useState("");
    const [batchDetail, setBatchDetail] = useState("");
    const [batchStatus, setBatchStatus] = useState("");
    const [batchEvent, setBatchEvent] = useState("");
    const [batchPin, setBatchPin] = useState("");
    const [batchCompanyId, setBatchCompanyId] = useState("");
    const [batchProjectId, setBatchProjectId] = useState("");
    const batchScanRef = useRef<HTMLInputElement>(null);

    const [batchEntryQueue, setBatchEntryQueue] = useState<Map<string, any>>(new Map());
    const [batchEntryScan, setBatchEntryScan] = useState("");
    const [batchEntryScanning, setBatchEntryScanning] = useState(false);
    const [batchEntryResults, setBatchEntryResults] = useState<any[]>([]);
    const [batchEntryLocationId, setBatchEntryLocationId] = useState("");
    const [batchEntryStatus, setBatchEntryStatus] = useState<"ATIVO" | "EM_MANUTENCAO">("ATIVO");
    const [batchEntryReason, setBatchEntryReason] = useState("");
    const [batchEntryEvent, setBatchEntryEvent] = useState("");
    const [batchEntryPin, setBatchEntryPin] = useState("");
    const batchEntryScanRef = useRef<HTMLInputElement>(null);
    // Rascunho persistido: se a página recarregar, a lista e os campos voltam
    // (PIN nunca é salvo). Restaura no mount; só grava depois de restaurar.
    const [batchRestored, setBatchRestored] = useState(false);
    useEffect(() => {
        try {
            const raw = localStorage.getItem("batchExitDraft");
            if (raw) {
                const d = JSON.parse(raw);
                if (Array.isArray(d.items) && d.items.length) setBatchQueue(new Map(d.items.map((a: any) => [a.id, a])));
                if (d.motivo) setBatchMotivo(d.motivo);
                if (d.detail) setBatchDetail(d.detail);
                if (d.status) setBatchStatus(d.status);
                if (d.event) setBatchEvent(d.event);
                if (d.companyId) setBatchCompanyId(d.companyId);
                if (d.projectId) setBatchProjectId(d.projectId);
            }
        } catch { /* rascunho corrompido — ignora */ }
        setBatchRestored(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        if (!batchRestored) return;
        try {
            localStorage.setItem("batchExitDraft", JSON.stringify({
                items: [...batchQueue.values()].map((a: any) => ({
                    id: a.id,
                    assetCode: a.assetCode,
                    skuId: a.skuId,
                    currentLocationId: a.currentLocationId,
                    status: a.status,
                    sku: { name: a.sku?.name },
                    currentLocation: { name: a.currentLocation?.name },
                })),
                motivo: batchMotivo,
                detail: batchDetail,
                status: batchStatus,
                event: batchEvent,
                companyId: batchCompanyId,
                projectId: batchProjectId,
            }));
        } catch { /* sem espaço/privado — ignora */ }
    }, [batchRestored, batchQueue, batchMotivo, batchDetail, batchStatus, batchEvent, batchCompanyId, batchProjectId]);

    // Detail panel — click on a balance row to see all assets
    const [detailSku, setDetailSku] = useState<{ id: string; name: string; skuCode: string; codePrefix?: string } | null>(null);
    const { data: detailAssets, isLoading: loadingDetail } = useQuery({
        queryKey: ["sku-assets-detail", detailSku?.id],
        queryFn: () => inventoryApi.listDetailAssets<{ data: any[] }>(detailSku!.id, fetchOpts),
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
        queryFn: () => inventoryApi.getBalances<{ data: any[] }>(fetchOpts),
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
        queryFn: () => inventoryApi.listMovements<{ data: any[]; total: number; page: number; limit: number }>(movementsPage, MOVEMENTS_PER_PAGE, debouncedMovementsSearch ? `&search=${encodeURIComponent(debouncedMovementsSearch)}` : "", fetchOpts),
        enabled: tab === "movements",
        placeholderData: keepPreviousData,
    });
    const movementsTotal = movements?.total ?? 0;
    const movementsTotalPages = Math.max(1, Math.ceil(movementsTotal / MOVEMENTS_PER_PAGE));
    const { data: skus } = useQuery({
        queryKey: ["skus"],
        queryFn: () => inventoryApi.listSkus<{ data: any[] }>(fetchOpts),
    });
    const { data: locations } = useQuery({
        queryKey: ["locations"],
        queryFn: () => inventoryApi.listLocations<{ data: any[] }>(fetchOpts),
    });
    const { data: custodyOptions } = useQuery({
        queryKey: ["custody-options", user?.id],
        queryFn: () => custodyApi.options(fetchOpts),
    });
    const { data: movementTypes } = useQuery({
        queryKey: ["movementTypes"],
        queryFn: () => inventoryApi.listMovementTypes<{ data: any[] }>(fetchOpts),
    });
    const { data: exitReasons } = useQuery({
        queryKey: ["exitReasons"],
        queryFn: () => inventoryApi.listActiveExitReasons<{ data: any[] }>(fetchOpts),
    });

    const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
        queryKey: ["inventory-stats"],
        queryFn: () => inventoryApi.getStats<{ data: any }>(fetchOpts),
        enabled: tab === "reports",
        staleTime: 60_000,
    });

    // Exit — lista de patrimônios do SKU selecionado
    const { data: exitSkuAssetsData, isLoading: loadingExitSkuAssets } = useQuery({
        queryKey: ["exit-sku-assets", exitSkuId],
        queryFn: () => inventoryApi.listExitAssets<{ data: any[] }>(exitSkuId, fetchOpts),
        enabled: !!exitSkuId && !exitAsset,
    });
    // Exit — busca por código (sem SKU selecionado, para o leitor de código de barras)
    const { data: exitSearchData } = useQuery({
        queryKey: ["exit-search", exitCodeQuery],
        queryFn: () => inventoryApi.searchExitAssets<{ data: any[] }>(encodeURIComponent(exitCodeQuery), fetchOpts),
        enabled: !exitSkuId && exitCodeQuery.length >= 2 && !exitAsset,
        staleTime: 300,
    });
    const exitOptions: any[] = (exitSkuId
        ? (exitSkuAssetsData?.data ?? []).filter((a: any) =>
            !exitCodeQuery || a.assetCode.toLowerCase().includes(exitCodeQuery.toLowerCase())
        )
        : (exitSearchData?.data ?? [])).filter((asset: any) => asset.currentLocation?.kind === "INTERNAL" && asset.status === "ATIVO");

    const findTypeId = (name: string) => movementTypes?.data?.find((t: any) => t.name.toLowerCase() === name.toLowerCase())?.id;

    const entryMut = useMutation({
        mutationFn: async (data: any) => {
            const entradaId = findTypeId("Entrada");
            const transferenciaId = findTypeId("Transferência") || entradaId;
            if (!entradaId || !transferenciaId) throw new Error("Tipo de movimentação de entrada não configurado");

            if (data.assetId && data.sourceLocationId && (data.sourceKind === "CLIENT" || data.sourceKind === "INTERNAL")) {
                return custodyApi.transfer({
                    requestId: crypto.randomUUID(),
                    kind: data.sourceKind === "CLIENT" ? "RETURN" : "INTERNAL",
                    fromLocationId: data.sourceLocationId,
                    toLocationId: data.locationId,
                    movementTypeId: transferenciaId,
                    assetIds: [data.assetId],
                    reason: [data.reason, data.eventDescription].filter(Boolean).join(" — ") || `Entrada do patrimônio ${data.assetCode ?? ""}`.trim(),
                    ...(data.sourceKind === "CLIENT" ? { returnStatus: "ATIVO" as const } : {}),
                    pin: data.pin,
                }, fetchOpts);
            }

            const payload = {
                skuId: data.skuId,
                toLocationId: data.locationId,
                qty: data.quantity,
                movementTypeId: entradaId,
                pin: data.pin,
                reason: data.reason || undefined,
                eventDescription: data.eventDescription || undefined,
                assetId: data.assetId,
            };
            if (data.files?.length) {
                const formData = new FormData();
                for (const [key, value] of Object.entries(payload)) if (value !== undefined) formData.append(key, String(value));
                for (const file of data.files as File[]) formData.append("files", file);
                return inventoryApi.uploadEntry(formData, fetchOpts);
            }
            return inventoryApi.createEntry(payload, fetchOpts);
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
            setEntryForm({ skuId: "", locationId: "", transferToId: "", quantity: 1, pin: "", reason: "", eventDescription: "", assetCode: "" });
            setEntryMediaFiles([]);
        },
        onError: (e: any) => toast.error(e.message),
    });
    const exitMut = useMutation({
        mutationFn: (data: any) => {
            const reasonText = [data.motivo, data.reason].filter(Boolean).join(" — ");
            return inventoryApi.createBatchExit({ requestId: crypto.randomUUID(), assetIds: [data.assetId],
                companyId: data.companyId, projectId: data.projectId, reason: reasonText,
                newStatus: data.internalDestination?.status ?? "EM_USO", eventDescription: data.eventDescription, pin: data.pin }, fetchOpts);
        },
        onSuccess: (result: any) => {
            toast.success(result?.message ?? TOASTS.exitRegistered);
            qc.invalidateQueries({ queryKey: ["balances"] });
            qc.invalidateQueries({ queryKey: ["movements"] });
            qc.invalidateQueries({ queryKey: ["custody"] });
            qc.invalidateQueries({ queryKey: ["custody-options"] });
            qc.invalidateQueries({ queryKey: ["exit-sku-assets", exitSkuId] });
            setExitAsset(null);
            setExitCodeQuery("");
            setExitNewPin("");
            setExitNewMotivo("");
            setExitNewReason("");
            setExitNewEvent("");
            setExitCompanyId("");
            setExitProjectId("");
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
                const res = await inventoryApi.lookupAsset<{ data: any }>(encodeURIComponent(code), fetchOpts);
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
                eventDescription: entryForm.eventDescription,
                assetId: asset.id,
                assetCode: asset.assetCode,
                sourceLocationId: asset.currentLocationId,
                sourceKind: asset.currentLocation?.kind,
                files: entryMediaFiles,
            });
        } else {
            if (!entryForm.skuId) { toast.error("Selecione o item"); return; }
            entryMut.mutate({ ...entryForm, files: entryMediaFiles });
        }
    };

    // ── Saída em Lote: adicionar item (bipagem, código ou nome) ──
    const batchAddAsset = (asset: any): boolean => {
        if (!asset.currentLocationId || asset.currentLocation?.kind !== "INTERNAL" || asset.status !== "ATIVO") {
            toast.error(`${asset.assetCode} não está disponível em um estoque interno.`);
            return false;
        }
        if (batchQueue.has(asset.id)) {
            toast.message(`${asset.assetCode} já está na lista.`);
            return false;
        }
        setBatchQueue((prev) => { const next = new Map(prev); next.set(asset.id, asset); return next; });
        return true;
    };

    const handleBatchScan = async () => {
        const term = batchScan.trim();
        if (!term || batchScanning) return;
        setBatchScanning(true);
        try {
            // 1) Código exato de patrimônio (bipagem)
            try {
                const res = await inventoryApi.lookupAsset<{ data: any }>(encodeURIComponent(term.toUpperCase()), fetchOpts);
                if (res?.data) {
                    batchAddAsset(res.data);
                    setBatchScan("");
                    setBatchResults([]);
                    setTimeout(() => batchScanRef.current?.focus(), 30);
                    return;
                }
            } catch {
                // não é código exato — busca por nome abaixo
            }
            // 2) Busca por nome/código parcial
            const res = await inventoryApi.searchBatchAssets<{ data: any[] }>(encodeURIComponent(term), fetchOpts);
            const options = (res?.data ?? []).filter((a: any) => a.currentLocationId && a.currentLocation?.kind === "INTERNAL" && a.status === "ATIVO" && !batchQueue.has(a.id));
            if (options.length === 0) {
                toast.error(`Nenhum patrimônio em estoque encontrado para "${term}".`);
                setBatchResults([]);
            } else {
                setBatchResults(options);
            }
        } finally {
            setBatchScanning(false);
        }
    };

    const batchExitMut = useMutation({
        mutationFn: (payload: any) => inventoryApi.createBatchExit(payload, fetchOpts),
        onSuccess: (res: any) => {
            toast.success(res?.message ?? "Saída em lote registrada!");
            setBatchQueue(new Map());
            setBatchScan(""); setBatchResults([]);
            setBatchMotivo(""); setBatchDetail(""); setBatchStatus(""); setBatchEvent(""); setBatchPin(""); setBatchCompanyId(""); setBatchProjectId("");
            qc.invalidateQueries({ queryKey: ["balances"] });
            qc.invalidateQueries({ queryKey: ["movements"] });
            qc.invalidateQueries({ queryKey: ["custody"] });
            qc.invalidateQueries({ queryKey: ["custody-options"] });
            setTimeout(() => batchScanRef.current?.focus(), 50);
        },
        onError: (e: any) => toast.error(e.message),
    });

    const handleBatchSubmit = () => {
        if (batchQueue.size === 0) { toast.error("Adicione ao menos um patrimônio à lista"); return; }
        if (!batchMotivo) { toast.error("Selecione o motivo da saída"); return; }
        const internalDestination = internalExitDestination(batchMotivo);
        if (!internalDestination && (!batchCompanyId || !batchProjectId)) { toast.error("Selecione o cliente e o projeto de destino"); return; }
        if (!batchEvent.trim()) { toast.error("Descreva o evento da timeline"); return; }
        if (!batchPin) { toast.error("Informe o PIN"); return; }
        const reason = [batchMotivo, batchDetail.trim()].filter(Boolean).join(" — ");
        batchExitMut.mutate({
            requestId: crypto.randomUUID(),
            assetIds: [...batchQueue.keys()],
            companyId: internalDestination ? undefined : batchCompanyId,
            projectId: internalDestination ? undefined : batchProjectId,
            reason,
            newStatus: internalDestination?.status ?? "EM_USO",
            eventDescription: batchEvent.trim(),
            pin: batchPin,
        });
    };

    const batchEntryAddAsset = (asset: any): boolean => {
        if (asset.status === "BAIXADO") {
            toast.error(`${asset.assetCode} está baixado e não pode retornar ao estoque.`);
            return false;
        }
        if (batchEntryQueue.has(asset.id)) {
            toast.message(`${asset.assetCode} já está na lista.`);
            return false;
        }
        setBatchEntryQueue(previous => { const next = new Map(previous); next.set(asset.id, asset); return next; });
        return true;
    };

    const handleBatchEntryScan = async () => {
        const term = batchEntryScan.trim();
        if (!term || batchEntryScanning) return;
        setBatchEntryScanning(true);
        try {
            try {
                const result = await inventoryApi.lookupAsset<{ data: any }>(encodeURIComponent(term.toUpperCase()), fetchOpts);
                if (result?.data) {
                    batchEntryAddAsset(result.data);
                    setBatchEntryScan(""); setBatchEntryResults([]);
                    setTimeout(() => batchEntryScanRef.current?.focus(), 30);
                    return;
                }
            } catch { /* pesquisa parcial abaixo */ }
            const result = await inventoryApi.searchBatchAssets<{ data: any[] }>(encodeURIComponent(term), fetchOpts);
            const options = (result?.data ?? []).filter((asset: any) => asset.status !== "BAIXADO" && !batchEntryQueue.has(asset.id));
            if (!options.length) { toast.error(`Nenhum patrimônio encontrado para "${term}".`); setBatchEntryResults([]); }
            else setBatchEntryResults(options);
        } finally {
            setBatchEntryScanning(false);
        }
    };

    const batchEntryMut = useMutation({
        mutationFn: (payload: any) => inventoryApi.createBatchEntry(payload, fetchOpts),
        onSuccess: (result: any) => {
            toast.success(result?.message ?? "Entrada em lote registrada!");
            setBatchEntryQueue(new Map()); setBatchEntryScan(""); setBatchEntryResults([]); setBatchEntryLocationId("");
            setBatchEntryStatus("ATIVO"); setBatchEntryReason(""); setBatchEntryEvent(""); setBatchEntryPin("");
            for (const queryKey of [["balances"], ["movements"], ["custody"], ["inventory-statistics"]]) void qc.invalidateQueries({ queryKey });
            setTimeout(() => batchEntryScanRef.current?.focus(), 50);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const handleBatchEntrySubmit = () => {
        if (!batchEntryQueue.size) { toast.error("Adicione ao menos um patrimônio à lista"); return; }
        if (!batchEntryLocationId) { toast.error("Selecione o estoque Skyline de destino"); return; }
        if ([...batchEntryQueue.values()].some(asset => asset.currentLocationId === batchEntryLocationId)) { toast.error("Há um patrimônio que já está no estoque de destino"); return; }
        if (!batchEntryReason.trim()) { toast.error("Informe o motivo da entrada"); return; }
        if (!batchEntryEvent.trim()) { toast.error("Descreva o evento da timeline"); return; }
        if (!batchEntryPin) { toast.error("Informe o PIN"); return; }
        const movementTypeId = findTypeId("Transferência") || findTypeId("Entrada");
        if (!movementTypeId) { toast.error("Tipo de movimentação de entrada não configurado"); return; }
        batchEntryMut.mutate({ requestId: crypto.randomUUID(), assetIds: [...batchEntryQueue.keys()], toLocationId: batchEntryLocationId, movementTypeId, reason: batchEntryReason.trim(), eventDescription: batchEntryEvent.trim(), returnStatus: batchEntryStatus, pin: batchEntryPin });
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
                const res = await inventoryApi.lookupAsset<{ data: any }>(encodeURIComponent(code.toUpperCase()), fetchOpts);
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
        if (!exitNewEvent.trim()) { toast.error("Descreva o evento da timeline"); return; }
        const internalDestination = internalExitDestination(exitNewMotivo);
        if (!internalDestination && (!exitCompanyId || !exitProjectId)) { toast.error("Selecione o cliente e o projeto de destino"); return; }
        if (!exitNewPin) { toast.error("Informe o PIN"); return; }
        if (!exitAsset.currentLocationId) {
            toast.error("Este patrimônio não possui local definido. Edite o patrimônio antes de dar saída.");
            return;
        }
        if (internalDestination) {
            exitMut.mutate({ skuId: exitAsset.skuId, locationId: exitAsset.currentLocationId, pin: exitNewPin,
                motivo: exitNewMotivo, reason: exitNewReason, eventDescription: exitNewEvent.trim(), assetId: exitAsset.id, internalDestination });
            return;
        }
        exitMut.mutate({
            skuId: exitAsset.skuId,
            locationId: exitAsset.currentLocationId,
            pin: exitNewPin,
            motivo: exitNewMotivo,
            reason: exitNewReason,
            eventDescription: exitNewEvent.trim(),
            assetId: exitAsset.id,
            companyId: exitCompanyId,
            projectId: exitProjectId,
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
        { key: "dashboard", label: "Painel", icon: LayoutDashboard, group: "Acompanhar" },
        { key: "balances", label: "Saldos", icon: Package, group: "Acompanhar" },
        { key: "assets", label: "Patrimônios", icon: Boxes, group: "Acompanhar" },
        { key: "movements", label: "Histórico", icon: History, group: "Acompanhar" },
        { key: "reports", label: "Relatórios", icon: BarChart2, group: "Acompanhar" },
        { key: "bipe", label: "Bipagem Rápida", icon: Zap, group: "Movimentar" },
        { key: "entry", label: "Entrada", icon: ArrowDownCircle, group: "Movimentar" },
        { key: "batchEntry", label: "Entrada em Lote", icon: ArrowDownCircle, group: "Movimentar" },
        { key: "exit", label: "Saída", icon: ArrowUpCircle, group: "Movimentar" },
        { key: "batchExit", label: "Saída em Lote", icon: TrendingDown, group: "Movimentar" },
        { key: "locations", label: "Locais", icon: MapPin, group: "Configurar" },
    ];

    return {
        tab,
        setTab,
        balancesSearch,
        setBalancesSearch,
        movementsSearch,
        setMovementsSearch,
        debouncedMovementsSearch,
        movementsPage,
        setMovementsPage,
        detailMovement,
        setDetailMovement,
        entryForm,
        setEntryForm,
        createdAssetCodes,
        setCreatedAssetCodes,
        entryMediaFiles,
        entryMediaFilesInputRef,
        entryMediaCameraInputRef,
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
        batchStatus,
        setBatchStatus,
        batchEvent,
        setBatchEvent,
        batchPin,
        setBatchPin,
        batchCompanyId,
        setBatchCompanyId,
        batchProjectId,
        setBatchProjectId,
        batchScanRef,
        batchEntryQueue,
        setBatchEntryQueue,
        batchEntryScan,
        setBatchEntryScan,
        batchEntryScanning,
        batchEntryResults,
        setBatchEntryResults,
        batchEntryLocationId,
        setBatchEntryLocationId,
        batchEntryStatus,
        setBatchEntryStatus,
        batchEntryReason,
        setBatchEntryReason,
        batchEntryEvent,
        setBatchEntryEvent,
        batchEntryPin,
        setBatchEntryPin,
        batchEntryScanRef,
        detailSku,
        setDetailSku,
        detailAssets,
        loadingDetail,
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
        canUploadMedia,
        entryMediaPreviews,
        appendEntryMedia,
        removeEntryMedia,
        balances,
        loadingBalances,
        movements,
        loadingMovements,
        fetchingMovements,
        movementsTotal,
        movementsTotalPages,
        skus,
        locations,
        custodyOptions,
        exitReasons,
        stats,
        loadingStats,
        refetchStats,
        loadingExitSkuAssets,
        exitOptions,
        entryMut,
        exitMut,
        selectedEntrySku,
        entryLookingUp,
        isEntryReturn,
        handleEntrySubmit,
        batchAddAsset,
        handleBatchScan,
        batchExitMut,
        handleBatchSubmit,
        batchEntryAddAsset,
        handleBatchEntryScan,
        batchEntryMut,
        handleBatchEntrySubmit,
        normalizeStr,
        resetBipeSelection,
        handleBipeScan,
        handleBipeSubmit,
        selectExitAsset,
        handleExitCodeEnter,
        handleExitSubmit,
        exportCSV,
        tabs,
    };
}

export type InventoryController = ReturnType<typeof useInventoryController>;
