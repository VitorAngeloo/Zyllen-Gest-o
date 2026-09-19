"use client";

import { Button } from "@web/components/ui/button";
import { Skeleton } from "@web/components/ui/skeleton";
import { EmptyState, ListSectionHeader } from "@web/components/ui/workspace";
import { BarChart2, FileDown, RefreshCw } from "lucide-react";

import type { InventoryController } from "../hooks/use-inventory-controller";

const ASSET_STATUS = [
    { key: "ATIVO", label: "Ativo", color: "bg-emerald-500", text: "text-emerald-400", track: "bg-emerald-500/15" },
    { key: "EM_USO", label: "Em uso", color: "bg-blue-500", text: "text-blue-400", track: "bg-blue-500/15" },
    { key: "EM_MANUTENCAO", label: "Em manutenção", color: "bg-amber-500", text: "text-amber-400", track: "bg-amber-500/15" },
    { key: "BAIXADO", label: "Baixado", color: "bg-red-500", text: "text-red-400", track: "bg-red-500/15" },
] as const;

export function InventoryReportsSection({ controller }: { controller: InventoryController }) {
    const { balances, stats, loadingStats, refetchStats, exportCSV } = controller;
    const data = stats?.data;

    const actions = (
        <>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!balances?.data?.length}>
                <FileDown size={14} /> Exportar CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => refetchStats()}>
                <RefreshCw size={14} /> Atualizar
            </Button>
        </>
    );

    return (
        <div className="space-y-8">
            <ListSectionHeader
                title="Relatórios de estoque"
                description="Visão consolidada do catálogo, patrimônios, atividade recente e distribuição física."
                actions={actions}
            />

            {loadingStats ? (
                <div className="space-y-8" aria-label="Carregando relatórios de estoque">
                    <div className="grid border-y border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-white/10 xl:grid-cols-4">
                        {[...Array(4)].map((_, index) => (
                            <div key={index} className="border-b border-white/10 px-4 py-5 last:border-b-0 sm:border-b-0">
                                <Skeleton className="h-3 w-28" />
                                <Skeleton className="mt-3 h-8 w-16" />
                                <Skeleton className="mt-2 h-3 w-20" />
                            </div>
                        ))}
                    </div>
                    <Skeleton className="h-56 w-full" />
                </div>
            ) : data ? (
                <>
                    <section aria-label="Indicadores do estoque">
                        <div className="grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:divide-white/10 xl:grid-cols-4">
                            {[
                                { label: "Itens no catálogo", value: data.totalSkus, note: "SKUs cadastrados", highlight: false },
                                { label: "Patrimônios", value: data.totalAssets, note: "ativos individuais", highlight: false },
                                { label: "Movimentações em 7 dias", value: data.movements.last7, note: "entradas e saídas", highlight: true },
                                { label: "Movimentações em 30 dias", value: data.movements.last30, note: "atividade recente", highlight: false },
                            ].map((metric) => (
                                <div key={metric.label} className="px-4 py-5">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{metric.label}</p>
                                    <p className={`mt-2 font-mono text-3xl font-semibold tabular-nums ${metric.highlight ? "text-[var(--zyllen-highlight)]" : "text-white"}`}>{metric.value}</p>
                                    <p className="mt-1 text-xs text-[var(--zyllen-muted)]">{metric.note}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4" aria-label="Situação dos patrimônios">
                        <ListSectionHeader
                            title="Situação dos patrimônios"
                            count={data.totalAssets}
                            description="Distribuição dos ativos individuais pelo estado atual."
                        />
                        <div className="divide-y divide-white/10 border-y border-white/10">
                            {ASSET_STATUS.map(({ key, label, color, text, track }) => {
                                const count: number = data.assetsByStatus[key] ?? 0;
                                const percentage = data.totalAssets > 0 ? Math.round((count / data.totalAssets) * 100) : 0;
                                return (
                                    <div key={key} className="grid gap-3 px-4 py-4 sm:grid-cols-[10rem_5rem_1fr] sm:items-center">
                                        <span className={`text-sm font-medium ${text}`}>{label}</span>
                                        <span className="font-mono text-xs tabular-nums text-[var(--zyllen-muted)]">{count} · {percentage}%</span>
                                        <div className={`h-1.5 w-full overflow-hidden rounded-full ${track}`} aria-label={`${label}: ${percentage}%`}>
                                            <div className={`h-full rounded-full ${color} transition-[width] duration-500`} style={{ width: `${percentage}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {data.locationDistribution.length > 0 && (
                        <section className="space-y-4" aria-label="Distribuição por local">
                            <ListSectionHeader
                                title="Distribuição por local"
                                count={data.locationDistribution.length}
                                description="Quantidade armazenada e variedade de itens em cada local."
                            />
                            <div className="overflow-x-auto border-y border-white/10">
                                <table className="w-full min-w-[620px] text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-white/40">
                                            <th scope="col" className="px-4 py-3 text-left font-semibold">Local</th>
                                            <th scope="col" className="px-4 py-3 text-right font-semibold">Itens distintos</th>
                                            <th scope="col" className="px-4 py-3 text-right font-semibold">Quantidade total</th>
                                            <th scope="col" className="px-4 py-3 text-left font-semibold">Volume relativo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {data.locationDistribution.map((location: any, index: number) => {
                                            const maxQuantity = data.locationDistribution[0]?.totalQuantity ?? 1;
                                            const percentage = maxQuantity > 0 ? Math.round((location.totalQuantity / maxQuantity) * 100) : 0;
                                            return (
                                                <tr key={`${location.name}-${index}`} className="transition-colors hover:bg-white/[0.02]">
                                                    <td className="px-4 py-4 font-medium text-white">{location.name}</td>
                                                    <td className="px-4 py-4 text-right tabular-nums text-[var(--zyllen-muted)]">{location.itemCount}</td>
                                                    <td className="px-4 py-4 text-right font-mono font-semibold tabular-nums text-[var(--zyllen-highlight)]">{location.totalQuantity}</td>
                                                    <td className="px-4 py-4">
                                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--zyllen-highlight)]/10" aria-label={`${percentage}% do maior volume`}>
                                                            <div className="h-full rounded-full bg-[var(--zyllen-highlight)] transition-[width] duration-500" style={{ width: `${percentage}%` }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </>
            ) : (
                <EmptyState
                    icon={<BarChart2 size={28} />}
                    title="Não foi possível carregar os relatórios"
                    description="Tente atualizar os dados. Os registros do estoque não foram alterados."
                    action={<Button variant="outline" size="sm" onClick={() => refetchStats()}><RefreshCw size={14} /> Tentar novamente</Button>}
                />
            )}
        </div>
    );
}
