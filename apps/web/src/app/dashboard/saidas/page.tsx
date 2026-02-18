"use client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { useAuthedFetch } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { Badge } from "@web/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@web/components/ui/dialog";
import { Select, SelectOption } from "@web/components/ui/select";
import { toast } from "sonner";
import {
    LogOut as LogOutIcon, Package, Search, CalendarDays,
    BarChart3, TrendingDown, ArrowDownCircle, Filter, ChevronDown, ChevronUp,
} from "lucide-react";
import { Skeleton } from "@web/components/ui/skeleton";
import { EMPTY_STATES, TOASTS, PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";

type Tab = "registrar" | "historico" | "relatorio";
type GroupBy = "day" | "month" | "year";

interface ExitRecord {
    id: string;
    quantity: number;
    reason?: string;
    createdAt: string;
    sku: { id: string; skuCode: string; name: string; description?: string; category?: { name: string } };
    location: { id: string; name: string };
    createdBy: { id: string; name: string };
}

interface ReportItem {
    period: string;
    totalQuantity: number;
    exitCount: number;
    items: { skuCode: string; skuName: string; quantity: number }[];
}

export default function SaidasPage() {
    const fetchOpts = useAuthedFetch();
    const qc = useQueryClient();
    const [tab, setTab] = useState<Tab>("registrar");

    // ─── Filters ──────────────────────────────────
    const [search, setSearch] = useState("");
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");
    const [filterSkuId, setFilterSkuId] = useState("");
    const [filterLocationId, setFilterLocationId] = useState("");

    // ─── Report ───────────────────────────────────
    const [groupBy, setGroupBy] = useState<GroupBy>("day");
    const [reportStartDate, setReportStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().slice(0, 10);
    });
    const [reportEndDate, setReportEndDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

    // ─── Exit Form ────────────────────────────────
    const [exitForm, setExitForm] = useState({
        skuId: "", locationId: "", quantity: 1, reason: "",
    });

    // ─── Queries ──────────────────────────────────
    const { data: skus } = useQuery({
        queryKey: ["skus"],
        queryFn: () => apiClient.get<{ data: any[] }>("/catalog/skus", fetchOpts),
    });

    const { data: locations } = useQuery({
        queryKey: ["locations"],
        queryFn: () => apiClient.get<{ data: any[] }>("/locations", fetchOpts),
    });

    // History query with filters
    const historyParams = useMemo(() => {
        const p = new URLSearchParams();
        if (search) p.set("search", search);
        if (filterStartDate) p.set("startDate", filterStartDate);
        if (filterEndDate) p.set("endDate", filterEndDate);
        if (filterSkuId) p.set("skuId", filterSkuId);
        if (filterLocationId) p.set("locationId", filterLocationId);
        p.set("limit", "100");
        return p.toString();
    }, [search, filterStartDate, filterEndDate, filterSkuId, filterLocationId]);

    const { data: exits, isLoading: loadingExits } = useQuery({
        queryKey: ["product-exits", historyParams],
        queryFn: () => apiClient.get<{ data: ExitRecord[]; total: number }>(`/product-exits?${historyParams}`, fetchOpts),
        enabled: tab === "historico",
    });

    // Report query
    const reportParams = useMemo(() => {
        const p = new URLSearchParams();
        p.set("groupBy", groupBy);
        if (reportStartDate) p.set("startDate", reportStartDate);
        if (reportEndDate) p.set("endDate", reportEndDate);
        if (filterSkuId) p.set("skuId", filterSkuId);
        if (filterLocationId) p.set("locationId", filterLocationId);
        return p.toString();
    }, [groupBy, reportStartDate, reportEndDate, filterSkuId, filterLocationId]);

    const { data: report, isLoading: loadingReport } = useQuery({
        queryKey: ["product-exits-report", reportParams],
        queryFn: () => apiClient.get<{ data: ReportItem[] }>(`/product-exits/report?${reportParams}`, fetchOpts),
        enabled: tab === "relatorio",
    });

    // Summary
    const { data: summary } = useQuery({
        queryKey: ["product-exits-summary"],
        queryFn: () => apiClient.get<{ data: { totalExits: number; totalQuantity: number; uniqueSkus: number } }>("/product-exits/summary", fetchOpts),
    });

    // ─── Stock balances for selected SKU ──────────
    const { data: equipmentSummary } = useQuery({
        queryKey: ["equipment-summary-for-exit", exitForm.skuId],
        queryFn: () => apiClient.get<{ data: any[] }>(`/assets/summary?search=`, fetchOpts),
        enabled: !!exitForm.skuId,
    });

    // Find the selected SKU's location balances from the equipment summary
    const selectedSkuLocations = useMemo(() => {
        if (!exitForm.skuId || !equipmentSummary?.data) return [];
        const item = equipmentSummary.data.find((e: any) => e.id === exitForm.skuId);
        return item?.locations ?? [];
    }, [exitForm.skuId, equipmentSummary]);

    // ─── Mutations ────────────────────────────────
    const createExit = useMutation({
        mutationFn: (data: typeof exitForm) =>
            apiClient.post("/product-exits", {
                skuId: data.skuId,
                locationId: data.locationId,
                quantity: Number(data.quantity),
                reason: data.reason || undefined,
            }, fetchOpts),
        onSuccess: () => {
            toast.success(TOASTS.exitRegistered);
            qc.invalidateQueries({ queryKey: ["product-exits"] });
            qc.invalidateQueries({ queryKey: ["product-exits-report"] });
            qc.invalidateQueries({ queryKey: ["product-exits-summary"] });
            qc.invalidateQueries({ queryKey: ["equipment-summary"] });
            qc.invalidateQueries({ queryKey: ["equipment-summary-for-exit"] });
            setExitForm({ skuId: "", locationId: "", quantity: 1, reason: "" });
        },
        onError: (e: any) => toast.error(e.message),
    });

    const tabs = [
        { key: "registrar", label: "Registrar Saída", icon: ArrowDownCircle },
        { key: "historico", label: "Histórico", icon: CalendarDays },
        { key: "relatorio", label: "Relatório", icon: BarChart3 },
    ];

    const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");
    const formatDateTime = (d: string) => new Date(d).toLocaleString("pt-BR");
    const formatPeriod = (period: string, gb: GroupBy) => {
        if (gb === "day") return new Date(period + "T12:00:00").toLocaleDateString("pt-BR");
        if (gb === "month") {
            const [y, m] = period.split("-");
            const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
            return `${months[parseInt(m) - 1]} ${y}`;
        }
        return period;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingDown className="text-[var(--zyllen-highlight)]" /> Saída de Produtos
            </h1>
            <p className="text-sm text-[var(--zyllen-muted)] mt-1">{PAGE_DESCRIPTIONS.saidas}</p>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardContent className="pt-6 text-center">
                        <p className="text-xs text-[var(--zyllen-muted)] uppercase tracking-wider">Total de Saídas</p>
                        <p className="text-3xl font-bold text-white mt-1">{summary?.data?.totalExits ?? 0}</p>
                    </CardContent>
                </Card>
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardContent className="pt-6 text-center">
                        <p className="text-xs text-[var(--zyllen-muted)] uppercase tracking-wider">Quantidade Total Retirada</p>
                        <p className="text-3xl font-bold text-[var(--zyllen-highlight)] mt-1">{summary?.data?.totalQuantity ?? 0}</p>
                    </CardContent>
                </Card>
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardContent className="pt-6 text-center">
                        <p className="text-xs text-[var(--zyllen-muted)] uppercase tracking-wider">SKUs Diferentes</p>
                        <p className="text-3xl font-bold text-white mt-1">{summary?.data?.uniqueSkus ?? 0}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[var(--zyllen-bg)] rounded-xl p-1 border border-[var(--zyllen-border)] w-fit flex-wrap">
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

            {/* ═══ REGISTRAR SAÍDA TAB ═══ */}
            {tab === "registrar" && (
                <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <ArrowDownCircle size={18} className="text-[var(--zyllen-highlight)]" /> Registrar Saída de Produto
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                createExit.mutate(exitForm);
                            }}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Produto (SKU) *</Label>
                                <Select
                                    value={exitForm.skuId}
                                    onValueChange={(v) => setExitForm({ ...exitForm, skuId: v, locationId: "" })}
                                    placeholder="Selecione o produto..."
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    required
                                >
                                    {skus?.data?.map((s: any) => (
                                        <SelectOption key={s.id} value={s.id}>
                                            {s.skuCode} — {s.name}
                                        </SelectOption>
                                    ))}
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Local de Saída *</Label>
                                <Select
                                    value={exitForm.locationId}
                                    onValueChange={(v) => setExitForm({ ...exitForm, locationId: v })}
                                    placeholder="Selecione o local..."
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    required
                                >
                                    {selectedSkuLocations.length > 0 ? (
                                        selectedSkuLocations.map((loc: any) => (
                                            <SelectOption key={loc.locationId} value={loc.locationId}>
                                                {loc.locationName} (Disp: {loc.quantity})
                                            </SelectOption>
                                        ))
                                    ) : (
                                        locations?.data?.map((l: any) => (
                                            <SelectOption key={l.id} value={l.id}>{l.name}</SelectOption>
                                        ))
                                    )}
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Quantidade *</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={exitForm.quantity}
                                    onChange={(e) => setExitForm({ ...exitForm, quantity: parseInt(e.target.value) || 1 })}
                                    required
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[var(--zyllen-muted)]">Motivo</Label>
                                <Input
                                    value={exitForm.reason}
                                    onChange={(e) => setExitForm({ ...exitForm, reason: e.target.value })}
                                    placeholder="Ex: Uso interno, transferência..."
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Button type="submit" variant="highlight" disabled={createExit.isPending} className="w-full">
                                    <ArrowDownCircle size={16} /> {createExit.isPending ? "Registrando..." : "Registrar Saída"}
                                </Button>
                            </div>
                        </form>

                        {/* Show available stock for selected SKU */}
                        {exitForm.skuId && selectedSkuLocations.length > 0 && (
                            <div className="mt-4 p-4 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]/50">
                                <p className="text-xs text-[var(--zyllen-muted)] font-medium uppercase tracking-wider mb-2">Estoque Disponível</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {selectedSkuLocations.map((loc: any) => (
                                        <div key={loc.locationId} className="flex items-center justify-between p-2 rounded bg-[var(--zyllen-bg)] border border-[var(--zyllen-border)]/30 text-sm">
                                            <span className="text-white">{loc.locationName}</span>
                                            <Badge variant="success">{loc.quantity}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ═══ HISTÓRICO TAB ═══ */}
            {tab === "historico" && (
                <div className="space-y-4">
                    {/* Filters */}
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Buscar..."
                                        className="pl-8 bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-sm"
                                    />
                                </div>
                                <Input
                                    type="date"
                                    value={filterStartDate}
                                    onChange={(e) => setFilterStartDate(e.target.value)}
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-sm"
                                    title="Data início"
                                />
                                <Input
                                    type="date"
                                    value={filterEndDate}
                                    onChange={(e) => setFilterEndDate(e.target.value)}
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-sm"
                                    title="Data fim"
                                />
                                <Select
                                    value={filterSkuId}
                                    onValueChange={setFilterSkuId}
                                    placeholder="Todos os produtos"
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-sm"
                                >
                                    <SelectOption value="">Todos os produtos</SelectOption>
                                    {skus?.data?.map((s: any) => (
                                        <SelectOption key={s.id} value={s.id}>{s.skuCode} — {s.name}</SelectOption>
                                    ))}
                                </Select>
                                <Select
                                    value={filterLocationId}
                                    onValueChange={setFilterLocationId}
                                    placeholder="Todos os locais"
                                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white text-sm"
                                >
                                    <SelectOption value="">Todos os locais</SelectOption>
                                    {locations?.data?.map((l: any) => (
                                        <SelectOption key={l.id} value={l.id}>{l.name}</SelectOption>
                                    ))}
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Exit history table */}
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center justify-between">
                                <span>Histórico de Saídas</span>
                                {exits?.total !== undefined && (
                                    <Badge variant="secondary">{exits.total} registro{exits.total !== 1 ? "s" : ""}</Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingExits ? (
                                <div className="space-y-3">
                                    {[...Array(8)].map((_, i) => (
                                        <Skeleton key={i} className="h-12 w-full rounded-lg" />
                                    ))}
                                </div>
                            ) : exits?.data?.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--zyllen-border)]">
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Data/Hora</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">SKU</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium">Produto</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium hidden md:table-cell">Local</th>
                                                <th className="text-center py-3 text-[var(--zyllen-muted)] font-medium">Qtd</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium hidden lg:table-cell">Motivo</th>
                                                <th className="text-left py-3 text-[var(--zyllen-muted)] font-medium hidden lg:table-cell">Responsável</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {exits.data.map((exit) => (
                                                <tr key={exit.id} className="border-b border-[var(--zyllen-border)]/50 hover:bg-white/[0.02]">
                                                    <td className="py-3 text-white text-xs">{formatDateTime(exit.createdAt)}</td>
                                                    <td className="py-3 font-mono text-[var(--zyllen-highlight)] text-xs">{exit.sku.skuCode}</td>
                                                    <td className="py-3 text-white">{exit.sku.name}</td>
                                                    <td className="py-3 text-[var(--zyllen-muted)] hidden md:table-cell">{exit.location.name}</td>
                                                    <td className="py-3 text-center">
                                                        <Badge variant="destructive">-{exit.quantity}</Badge>
                                                    </td>
                                                    <td className="py-3 text-[var(--zyllen-muted)] hidden lg:table-cell text-xs max-w-[150px] truncate">{exit.reason || "—"}</td>
                                                    <td className="py-3 text-[var(--zyllen-muted)] hidden lg:table-cell text-xs">{exit.createdBy.name}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-[var(--zyllen-muted)] text-center py-8">
                                    {(filterStartDate || filterEndDate || search) ? EMPTY_STATES.exitsFiltered : EMPTY_STATES.exits}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ═══ RELATÓRIO TAB ═══ */}
            {tab === "relatorio" && (
                <div className="space-y-4">
                    {/* Report Filters */}
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">Agrupar por</Label>
                                    <Select
                                        value={groupBy}
                                        onValueChange={(v) => setGroupBy(v as GroupBy)}
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    >
                                        <SelectOption value="day">Dia</SelectOption>
                                        <SelectOption value="month">Mês</SelectOption>
                                        <SelectOption value="year">Ano</SelectOption>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">Data início</Label>
                                    <Input
                                        type="date"
                                        value={reportStartDate}
                                        onChange={(e) => setReportStartDate(e.target.value)}
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">Data fim</Label>
                                    <Input
                                        type="date"
                                        value={reportEndDate}
                                        onChange={(e) => setReportEndDate(e.target.value)}
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[var(--zyllen-muted)] text-xs">Produto</Label>
                                    <Select
                                        value={filterSkuId}
                                        onValueChange={setFilterSkuId}
                                        placeholder="Todos"
                                        className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                                    >
                                        <SelectOption value="">Todos os produtos</SelectOption>
                                        {skus?.data?.map((s: any) => (
                                            <SelectOption key={s.id} value={s.id}>{s.skuCode} — {s.name}</SelectOption>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Report Data */}
                    <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <BarChart3 size={18} className="text-[var(--zyllen-highlight)]" />
                                Relatório de Saídas — por {groupBy === "day" ? "Dia" : groupBy === "month" ? "Mês" : "Ano"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingReport ? (
                                <div className="space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                                    ))}
                                </div>
                            ) : report?.data?.length ? (
                                <div className="space-y-2">
                                    {report.data.map((item) => (
                                        <div key={item.period} className="rounded-lg border border-[var(--zyllen-border)]/50 overflow-hidden">
                                            <button
                                                onClick={() => setExpandedPeriod(expandedPeriod === item.period ? null : item.period)}
                                                className="w-full flex items-center justify-between p-4 bg-[var(--zyllen-bg-dark)] hover:bg-white/[0.02] transition-colors text-left"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <p className="text-white font-medium">{formatPeriod(item.period, groupBy)}</p>
                                                        <p className="text-xs text-[var(--zyllen-muted)]">{item.exitCount} saída{item.exitCount !== 1 ? "s" : ""}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <p className="text-[var(--zyllen-highlight)] font-bold text-lg">-{item.totalQuantity}</p>
                                                        <p className="text-xs text-[var(--zyllen-muted)]">unidades</p>
                                                    </div>
                                                    {expandedPeriod === item.period
                                                        ? <ChevronUp size={16} className="text-[var(--zyllen-muted)]" />
                                                        : <ChevronDown size={16} className="text-[var(--zyllen-muted)]" />
                                                    }
                                                </div>
                                            </button>

                                            {expandedPeriod === item.period && (
                                                <div className="border-t border-[var(--zyllen-border)]/30 p-4">
                                                    <p className="text-xs text-[var(--zyllen-muted)] font-medium uppercase tracking-wider mb-3">Detalhamento por Produto</p>
                                                    <div className="space-y-2">
                                                        {item.items.map((prod, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[var(--zyllen-bg)] border border-[var(--zyllen-border)]/30">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="font-mono text-[var(--zyllen-highlight)] text-xs">{prod.skuCode}</span>
                                                                    <span className="text-white text-sm">{prod.skuName}</span>
                                                                </div>
                                                                <Badge variant="destructive">-{prod.quantity}</Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Total row */}
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--zyllen-highlight)]/10 border border-[var(--zyllen-highlight)]/20 mt-4">
                                        <span className="text-white font-medium">Total do Período</span>
                                        <div className="text-right">
                                            <p className="text-[var(--zyllen-highlight)] font-bold text-xl">
                                                -{report.data.reduce((sum, r) => sum + r.totalQuantity, 0)}
                                            </p>
                                            <p className="text-xs text-[var(--zyllen-muted)]">
                                                {report.data.reduce((sum, r) => sum + r.exitCount, 0)} saídas
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[var(--zyllen-muted)] text-center py-8">
                                    {EMPTY_STATES.exitsReport}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
