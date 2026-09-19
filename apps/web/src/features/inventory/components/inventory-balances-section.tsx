"use client";

import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Skeleton } from "@web/components/ui/skeleton";
import { EmptyState, ListSectionHeader, WorkspaceBar, WorkspaceGroup } from "@web/components/ui/workspace";
import { EMPTY_STATES } from "@web/lib/brand-voice";
import { ChevronRight, Package, Search } from "lucide-react";

import type { InventoryController } from "../hooks/use-inventory-controller";

export function InventoryBalancesSection({ controller }: { controller: InventoryController }) {
    const { balancesSearch, setBalancesSearch, setDetailSku, balances, loadingBalances, normalizeStr } = controller;
    const query = normalizeStr(balancesSearch);
    const filtered = balancesSearch
        ? balances?.data?.filter((balance: any) =>
            normalizeStr(balance.sku?.name ?? "").includes(query)
            || normalizeStr(balance.sku?.skuCode ?? "").includes(query)
            || normalizeStr(balance.location?.name ?? "").includes(query)
            || normalizeStr(balance.sku?.brand ?? "").includes(query)
        )
        : balances?.data;

    const openBalance = (balance: any) => {
        setDetailSku({
            id: balance.skuId,
            name: balance.sku?.name,
            skuCode: balance.sku?.skuCode,
            codePrefix: balance.sku?.codePrefix,
        });
    };

    return (
        <div className="space-y-6">
            <WorkspaceBar className="sm:block">
                <WorkspaceGroup label="Localizar saldo" className="max-w-xl">
                    <div className="relative">
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                        <Input
                            type="search"
                            value={balancesSearch}
                            onChange={(event) => setBalancesSearch(event.target.value)}
                            placeholder="Nome, código, marca ou local"
                            aria-label="Buscar saldo por item, código, marca ou local"
                            className="pl-9"
                        />
                    </div>
                </WorkspaceGroup>
            </WorkspaceBar>

            <ListSectionHeader
                title="Saldos por item e local"
                count={filtered?.length ?? 0}
                description="Selecione uma linha para consultar os patrimônios que compõem o saldo."
            />

            {loadingBalances ? (
                <div className="divide-y divide-white/10 border-y border-white/10" aria-label="Carregando saldos">
                    {[...Array(5)].map((_, index) => (
                        <div key={index} className="grid grid-cols-[5rem_1fr_7rem] items-center gap-4 px-3 py-4 sm:grid-cols-[6rem_1.4fr_1fr_1fr_5rem] sm:px-4">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="hidden h-4 w-20 sm:block" />
                            <Skeleton className="hidden h-4 w-24 sm:block" />
                            <Skeleton className="ml-auto h-6 w-10" />
                        </div>
                    ))}
                </div>
            ) : filtered?.length ? (
                <div className="overflow-x-auto border-y border-white/10">
                    <table className="w-full min-w-[680px] text-sm">
                        <thead>
                            <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-white/40">
                                <th scope="col" className="px-4 py-3 text-left font-semibold">Código</th>
                                <th scope="col" className="px-4 py-3 text-left font-semibold">Item</th>
                                <th scope="col" className="px-4 py-3 text-left font-semibold">Marca</th>
                                <th scope="col" className="px-4 py-3 text-left font-semibold">Local</th>
                                <th scope="col" className="px-4 py-3 text-right font-semibold">Quantidade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {filtered.map((balance: any) => (
                                <tr
                                    key={`${balance.skuId}-${balance.locationId}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Abrir saldo de ${balance.sku?.name ?? balance.sku?.skuCode ?? "item"} em ${balance.location?.name ?? "local não informado"}`}
                                    className="group cursor-pointer transition-colors hover:bg-white/[0.025] focus-visible:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--zyllen-highlight)]/35"
                                    onClick={() => openBalance(balance)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            openBalance(balance);
                                        }
                                    }}
                                >
                                    <td className="px-4 py-4 font-mono text-xs text-[var(--zyllen-highlight)]">{balance.sku?.skuCode}</td>
                                    <td className="px-4 py-4">
                                        <p className="font-medium text-white">{balance.sku?.name}</p>
                                        {balance.sku?.category?.name && (
                                            <p className="mt-0.5 text-xs text-[var(--zyllen-muted)]">{balance.sku.category.name}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-xs text-[var(--zyllen-muted)]">{balance.sku?.brand ?? "—"}</td>
                                    <td className="px-4 py-4 text-[var(--zyllen-muted)]">{balance.location?.name ?? "—"}</td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Badge variant={balance.quantity > 0 ? "success" : "destructive"}>{balance.quantity}</Badge>
                                            <ChevronRight size={14} className="text-white/25 transition-colors group-hover:text-[var(--zyllen-highlight)]" aria-hidden="true" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState
                    icon={<Package size={28} />}
                    title={balancesSearch ? "Nenhum saldo corresponde à busca" : "Nenhum saldo disponível"}
                    description={balancesSearch ? "Revise o termo ou limpe a busca para voltar a visualizar todos os itens." : EMPTY_STATES.balances}
                    action={balancesSearch ? (
                        <Button variant="outline" size="sm" onClick={() => setBalancesSearch("")}>Limpar busca</Button>
                    ) : undefined}
                />
            )}
        </div>
    );
}
