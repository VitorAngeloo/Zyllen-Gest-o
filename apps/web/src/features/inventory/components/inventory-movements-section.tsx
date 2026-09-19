"use client";

import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Skeleton } from "@web/components/ui/skeleton";
import { EmptyState, ListSectionHeader, WorkspaceBar, WorkspaceGroup } from "@web/components/ui/workspace";
import { EMPTY_STATES } from "@web/lib/brand-voice";
import { ChevronRight, History, Loader2, Search } from "lucide-react";

import type { InventoryController } from "../hooks/use-inventory-controller";

export function InventoryMovementsSection({ controller }: { controller: InventoryController }) {
    const {
        movementsSearch,
        setMovementsSearch,
        debouncedMovementsSearch,
        movementsPage,
        setMovementsPage,
        setDetailMovement,
        movements,
        loadingMovements,
        fetchingMovements,
        movementsTotal,
        movementsTotalPages,
    } = controller;

    return (
        <div className="space-y-6">
            <WorkspaceBar className="sm:block">
                <WorkspaceGroup label="Pesquisar histórico" className="max-w-2xl">
                    <div className="relative">
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                        <Input
                            type="search"
                            value={movementsSearch}
                            onChange={(event) => setMovementsSearch(event.target.value)}
                            placeholder="Código, item, patrimônio, responsável, motivo ou local"
                            aria-label="Buscar no histórico de movimentações"
                            className="pl-9 pr-9"
                        />
                        {fetchingMovements && (
                            <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--zyllen-highlight)]" aria-label="Atualizando histórico" />
                        )}
                    </div>
                </WorkspaceGroup>
            </WorkspaceBar>

            <ListSectionHeader
                title="Histórico de movimentações"
                count={movementsTotal}
                description={debouncedMovementsSearch
                    ? `Resultados para “${debouncedMovementsSearch}”. Selecione uma linha para ver o registro completo.`
                    : "Entradas, saídas e transferências registradas no estoque."}
            />

            {loadingMovements ? (
                <div className="divide-y divide-white/10 border-y border-white/10" aria-label="Carregando movimentações">
                    {[...Array(5)].map((_, index) => (
                        <div key={index} className="grid grid-cols-[8rem_5rem_1fr] items-center gap-4 px-3 py-4 sm:grid-cols-[9rem_6rem_6rem_4rem_8rem_1fr] sm:px-4">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-6 w-16" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="hidden h-4 w-8 sm:block" />
                            <Skeleton className="hidden h-4 w-24 sm:block" />
                            <Skeleton className="hidden h-4 w-28 sm:block" />
                        </div>
                    ))}
                </div>
            ) : movements?.data?.length ? (
                <div className="overflow-x-auto border-y border-white/10">
                    <table className="w-full min-w-[860px] text-sm">
                        <thead>
                            <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-white/40">
                                <th scope="col" className="px-4 py-3 text-left font-semibold">Data</th>
                                <th scope="col" className="px-4 py-3 text-left font-semibold">Tipo</th>
                                <th scope="col" className="px-4 py-3 text-left font-semibold">Código</th>
                                <th scope="col" className="px-4 py-3 text-right font-semibold">Qtd.</th>
                                <th scope="col" className="px-4 py-3 text-left font-semibold">Responsável</th>
                                <th scope="col" className="px-4 py-3 text-left font-semibold">Motivo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {movements.data.map((movement: any) => (
                                <tr
                                    key={movement.id}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Abrir movimentação de ${movement.sku?.name ?? movement.sku?.skuCode ?? "item"}`}
                                    onClick={() => setDetailMovement(movement)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            setDetailMovement(movement);
                                        }
                                    }}
                                    className="group cursor-pointer transition-colors hover:bg-white/[0.025] focus-visible:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--zyllen-highlight)]/35"
                                >
                                    <td className="px-4 py-4 text-xs tabular-nums text-[var(--zyllen-muted)]">
                                        <span className="inline-flex items-center gap-1.5">
                                            {new Date(movement.createdAt).toLocaleString("pt-BR")}
                                            <ChevronRight size={13} className="text-white/25 transition-colors group-hover:text-[var(--zyllen-highlight)]" aria-hidden="true" />
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <Badge variant={movement.toLocationId ? "success" : "destructive"}>
                                            {movement.type?.name ?? (movement.toLocationId ? "Entrada" : "Saída")}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4 text-xs">
                                        <span className="font-mono text-[var(--zyllen-highlight)]">{movement.sku?.skuCode}</span>
                                        {movement.asset?.assetCode && (
                                            <span className="mt-0.5 block font-mono text-[var(--zyllen-muted)]">{movement.asset.assetCode}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-right font-semibold tabular-nums text-white">{movement.qty}</td>
                                    <td className="px-4 py-4 text-xs text-white">{movement.createdBy?.name ?? "—"}</td>
                                    <td className="max-w-xs px-4 py-4 text-[var(--zyllen-muted)]">{movement.reason ?? "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState
                    icon={<History size={28} />}
                    title={debouncedMovementsSearch ? "Nenhuma movimentação corresponde à busca" : "Nenhuma movimentação registrada"}
                    description={debouncedMovementsSearch
                        ? "Revise o termo ou limpe a busca para consultar o histórico completo."
                        : EMPTY_STATES.movements}
                    action={debouncedMovementsSearch ? (
                        <Button variant="outline" size="sm" onClick={() => setMovementsSearch("")}>Limpar busca</Button>
                    ) : undefined}
                />
            )}

            {movementsTotalPages > 1 && (
                <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4" aria-label="Paginação do histórico">
                    <span className="text-xs tabular-nums text-[var(--zyllen-muted)]">
                        Página {movementsPage} de {movementsTotalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMovementsPage((page) => Math.max(1, page - 1))}
                            disabled={movementsPage <= 1 || fetchingMovements}
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMovementsPage((page) => Math.min(movementsTotalPages, page + 1))}
                            disabled={movementsPage >= movementsTotalPages || fetchingMovements}
                        >
                            Próxima
                        </Button>
                    </div>
                </nav>
            )}
        </div>
    );
}
