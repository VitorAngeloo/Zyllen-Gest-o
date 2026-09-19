"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CustodyLocation } from "@zyllen/shared";
import { useAuth, useAuthedFetch } from "@web/features/auth/context/auth-context";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Select } from "@web/components/ui/select";
import { Skeleton } from "@web/components/ui/skeleton";
import { EmptyState, ListSectionHeader, RecordList, WorkspaceBar, WorkspaceGroup } from "@web/components/ui/workspace";
import { CUSTODY_COPY as copy } from "@web/lib/brand-voice";
import { custodyApi } from "../api/custody-api";
import { CustodyLocationDialog } from "../components/custody-location-dialog";

const assetStatusLabel = (status: string) => {
    if (status === "ATIVO") return copy.available;
    if (status === "EM_USO") return copy.inUse;
    if (status === "EM_MANUTENCAO") return copy.maintenance;
    return status;
};

export default function CustodyScreen({ view = "assets", embedded = false }: { view?: "assets" | "locations"; embedded?: boolean }) {
    const { user, userType, isLoading, hasPermission } = useAuth();
    const opts = useAuthedFetch();
    const queryClient = useQueryClient();
    const enabled = Boolean(user && userType === "internal" && hasPermission("inventory.view"));
    const [scope, setScope] = useState<"CLIENT" | "INTERNAL">("CLIENT");
    const [company, setCompany] = useState("");
    const [location, setLocation] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<CustodyLocation | "new" | null>(null);
    const options = useQuery({
        queryKey: ["custody-options", user?.id],
        queryFn: ({ signal }) => custodyApi.options({ ...opts, signal }),
        enabled,
        refetchInterval: 30000,
    });
    const query = new URLSearchParams({
        scope,
        search,
        page: String(page),
        limit: "50",
        ...(company ? { companyId: company } : {}),
        ...(location ? { locationId: location } : {}),
    });
    const assets = useQuery({
        queryKey: ["custody", "assets", user?.id, scope, company, location, search, page],
        queryFn: ({ signal }) => custodyApi.assets(query, { ...opts, signal }),
        enabled: enabled && view === "assets",
        refetchInterval: 30000,
    });
    const refresh = () => {
        for (const queryKey of [["custody"], ["custody-options"], ["locations"], ["balances"], ["inventory-statistics"]]) {
            void queryClient.invalidateQueries({ queryKey });
        }
    };
    const data = options.data?.data;

    if (isLoading) return <p role="status">{copy.loading}</p>;
    if (!enabled) return <p className="text-[var(--zyllen-muted)]">{copy.noAccess}</p>;

    const visibleLocations = data?.locations.filter(item => item.kind === scope && (!company || item.companyId === company)) ?? [];
    const totalPages = Math.max(1, Math.ceil((assets.data?.total ?? 0) / 50));

    return (
        <div className="space-y-5 text-white">
            {!embedded && (
                <header>
                    <h1 className="text-2xl font-semibold">{view === "locations" ? "Locais de estoque" : "Patrimônios por local"}</h1>
                    <p className="mt-1 text-sm text-[var(--zyllen-muted)]">Consulte a custódia dos itens sem misturar estoques internos e estoques de clientes.</p>
                </header>
            )}
            {options.isError && <p role="alert" className="text-red-200">{copy.error} <button className="underline" onClick={() => void options.refetch()}>{copy.retry}</button></p>}

            {view === "locations" ? (
                <>
                    <ListSectionHeader
                        title="Identificação dos locais"
                        count={data?.locations.length}
                        description="Classifique cada local como estoque Skyline ou estoque de cliente e projeto."
                        actions={hasPermission("locations.create") ? <Button size="sm" disabled={!data || options.isError} onClick={() => setEditing("new")}>Novo local</Button> : undefined}
                    />

                    {data && (
                        <div className="grid border-y border-white/10 sm:grid-cols-3 sm:divide-x sm:divide-white/10">
                            {[
                                ["Sem localização", data.diagnostic.unlocatedAssets],
                                ["Em locais não classificados", data.diagnostic.unclassifiedAssets],
                                ["Locais pendentes", data.diagnostic.unclassifiedLocations],
                            ].map(([label, value]) => (
                                <div key={String(label)} className="border-b border-white/10 px-4 py-4 last:border-b-0 sm:border-b-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">{label}</p>
                                    <p className="mt-1 font-mono text-lg tabular-nums text-white">{value}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {options.isPending ? (
                        <div className="divide-y divide-white/10 border-y border-white/10">
                            {[1, 2, 3].map(item => <Skeleton key={item} className="h-20 rounded-none bg-white/[0.025]" />)}
                        </div>
                    ) : !data?.locations.length && !options.isError ? (
                        <EmptyState title="Nenhum local cadastrado" description={copy.noLocations} />
                    ) : (
                        <RecordList>
                            {data?.locations.map(item => (
                                <article key={item.id} className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                                    <div className="min-w-0">
                                        <h3 className="break-words text-sm font-semibold">{item.name}</h3>
                                        <p className="mt-1 text-xs text-[var(--zyllen-muted)]">
                                            {item.kind === "CLIENT" ? copy.clientLocation : item.kind === "INTERNAL" ? copy.internalLocation : copy.unclassified}
                                            {item.company && ` · ${item.company.name}`}
                                            {item.project && ` · ${item.project.name}`}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-4">
                                        <span className="font-mono text-xs tabular-nums text-white/60">{item._count.assets} patrimônio(s)</span>
                                        {hasPermission("locations.update") && <Button size="sm" variant="outline" onClick={() => setEditing(item)}>{copy.identify}</Button>}
                                    </div>
                                </article>
                            ))}
                        </RecordList>
                    )}
                </>
            ) : (
                <>
                    <WorkspaceBar className="sm:block">
                        <WorkspaceGroup label="Escopo da custódia">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <label className="space-y-1.5 text-xs text-[var(--zyllen-muted)]">Contexto
                                    <Select aria-label="Contexto dos patrimônios" value={scope} onValueChange={value => { setScope(value as "CLIENT" | "INTERNAL"); setCompany(""); setLocation(""); setPage(1); }}>
                                        <option value="CLIENT">Clientes e projetos</option>
                                        <option value="INTERNAL">Estoques Skyline</option>
                                    </Select>
                                </label>
                                {scope === "CLIENT" && (
                                    <label className="space-y-1.5 text-xs text-[var(--zyllen-muted)]">Cliente
                                        <Select aria-label="Cliente" value={company} onValueChange={value => { setCompany(value); setLocation(""); setPage(1); }}>
                                            <option value="">Todos os clientes</option>
                                            {data?.companies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                        </Select>
                                    </label>
                                )}
                                <label className="space-y-1.5 text-xs text-[var(--zyllen-muted)]">Local
                                    <Select aria-label="Local" value={location} onValueChange={value => { setLocation(value); setPage(1); }}>
                                        <option value="">{scope === "CLIENT" ? "Todos os projetos" : "Todos os estoques Skyline"}</option>
                                        {visibleLocations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                    </Select>
                                </label>
                                <label className="space-y-1.5 text-xs text-[var(--zyllen-muted)]">Patrimônio ou produto
                                    <Input aria-label="Buscar patrimônio ou produto" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
                                </label>
                            </div>
                        </WorkspaceGroup>
                    </WorkspaceBar>

                    {assets.isError && <p role="alert" className="text-red-200">{copy.error} <button className="underline" onClick={() => void assets.refetch()}>{copy.retry}</button></p>}
                    <ListSectionHeader
                        title="Patrimônios em custódia"
                        count={assets.isPending ? undefined : (assets.data?.total ?? 0)}
                        description={scope === "CLIENT" ? "Itens enviados para clientes e projetos no escopo selecionado." : "Itens presentes nos estoques internos selecionados."}
                    />

                    {assets.isPending ? (
                        <div className="divide-y divide-white/10 border-y border-white/10">
                            {[1, 2, 3].map(item => <Skeleton key={item} className="h-20 rounded-none bg-white/[0.025]" />)}
                        </div>
                    ) : assets.data?.data.length === 0 ? (
                        <EmptyState title="Nenhum patrimônio neste recorte" description={copy.empty} />
                    ) : (
                        <RecordList>
                            {assets.data?.data.map(asset => (
                                <article key={asset.id} data-custody-asset className="grid min-w-0 gap-2 px-3 py-4 sm:grid-cols-[140px_minmax(0,1fr)_minmax(180px,.8fr)_auto] sm:items-center sm:px-4">
                                    <h2 className="font-mono text-xs text-white/70">{asset.assetCode}</h2>
                                    <p className="break-words text-sm font-medium">{asset.sku.name}{asset.sku.brand && ` · ${asset.sku.brand}`}</p>
                                    <p className="break-words text-xs text-[var(--zyllen-muted)]">
                                        {asset.currentLocation?.company?.name}{asset.currentLocation?.project && ` · ${asset.currentLocation.project.name}`}
                                        <span className="block">{asset.currentLocation?.name ?? copy.noLocation}</span>
                                    </p>
                                    <div className="text-xs">
                                        <span className="text-white">{assetStatusLabel(asset.status)}</span>
                                        {asset.currentLocation?.kind === "CLIENT" && <span className="block text-[var(--zyllen-muted)]">{asset.shipmentAt ? `Enviado: ${new Date(asset.shipmentAt).toLocaleString("pt-BR")}` : copy.unknownDate}</span>}
                                    </div>
                                </article>
                            ))}
                        </RecordList>
                    )}

                    {assets.data && (
                        <div className="flex items-center justify-between gap-2 text-sm">
                            <Button variant="outline" disabled={page === 1 || assets.isFetching} onClick={() => setPage(page - 1)}>{copy.previous}</Button>
                            <span className="font-mono text-xs tabular-nums text-[var(--zyllen-muted)]">{page} / {totalPages}</span>
                            <Button variant="outline" disabled={assets.isFetching || page * 50 >= assets.data.total} onClick={() => setPage(page + 1)}>{copy.next}</Button>
                        </div>
                    )}
                </>
            )}
            {editing && data && <CustodyLocationDialog location={editing === "new" ? null : editing} options={data} onClose={() => setEditing(null)} onSaved={refresh} />}
        </div>
    );
}
