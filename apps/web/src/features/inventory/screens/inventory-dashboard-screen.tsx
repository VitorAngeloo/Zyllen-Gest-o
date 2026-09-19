"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { InventoryStatisticsQuery } from "@zyllen/shared";
import { useAuth, useAuthedFetch } from "@web/features/auth/context/auth-context";
import { INVENTORY_DASHBOARD_COPY as copy } from "@web/lib/brand-voice";
import { Button } from "@web/components/ui/button";
import { Select } from "@web/components/ui/select";
import { WorkspaceBar, WorkspaceGroup } from "@web/components/ui/workspace";
import { custodyApi } from "../api/custody-api";
import { inventoryStatisticsApi as api } from "../api/inventory-statistics-api";
import { InventoryDashboardView } from "../components/inventory-dashboard-view";
import { StockMinimumDialog } from "../components/stock-minimum-dialog";

export default function InventoryDashboardScreen({ embedded = false }: { embedded?: boolean }) {
    const { user, userType, isLoading, hasPermission } = useAuth();
    const opts = useAuthedFetch();
    const queryClient = useQueryClient();
    const enabled = Boolean(user && userType === "internal" && hasPermission("inventory.view"));
    const [context, setContext] = useState<InventoryStatisticsQuery["context"]>("WAREHOUSE");
    const [locationId, setLocation] = useState("");
    const [companyId, setCompany] = useState("");
    const [editing, setEditing] = useState(false);
    const options = useQuery({ queryKey: ["custody-options", user?.id], queryFn: ({ signal }) => custodyApi.options({ ...opts, signal }), enabled, refetchInterval: 30000 });
    const query: InventoryStatisticsQuery = {
        context,
        ...(context === "WAREHOUSE" && locationId ? { locationId } : {}),
        ...(context === "CLIENT" && companyId ? { companyId } : {}),
    };
    const stats = useQuery({ queryKey: ["inventory-statistics", user?.id, query], queryFn: ({ signal }) => api.statistics(query, { ...opts, signal }), enabled, refetchInterval: 30000 });

    if (isLoading) return <p role="status">{copy.loading}</p>;
    if (!enabled) return <p className="text-[var(--zyllen-muted)]">{copy.noAccess}</p>;
    const data = stats.data?.data;

    return <div className="space-y-5 text-white">
        {!embedded && <header><h1 className="text-2xl font-bold">{copy.title}</h1><p className="mt-1 text-sm text-[var(--zyllen-muted)]">{copy.description}</p></header>}
        <WorkspaceBar className="sm:block">
            <WorkspaceGroup label="Escopo dos indicadores">
            <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-44 space-y-1.5 text-xs text-[var(--zyllen-muted)]">Contexto
                <Select aria-label="Contexto" value={context} onValueChange={value => { setContext(value as typeof context); setLocation(""); setCompany(""); setEditing(false); }}>
                    <option value="WAREHOUSE">Estoques Skyline</option>
                    <option value="CLIENT">Clientes e projetos</option>
                    <option value="ALL">Visão geral</option>
                </Select>
            </label>
            {context === "WAREHOUSE" && <label className="min-w-56 space-y-1.5 text-xs text-[var(--zyllen-muted)]">Local
                <Select aria-label="Local" value={locationId} onValueChange={value => { setLocation(value); setEditing(false); }}>
                    <option value="">Todos os estoques Skyline</option>
                    {options.data?.data.locations.filter(location => location.kind === "INTERNAL").map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
                </Select>
            </label>}
            {context === "CLIENT" && <label className="min-w-56 space-y-1.5 text-xs text-[var(--zyllen-muted)]">Cliente
                <Select aria-label="Cliente" value={companyId} onValueChange={setCompany}>
                    <option value="">Todos os clientes</option>
                    {options.data?.data.companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
                </Select>
            </label>}
            <Button variant="outline" disabled={stats.isFetching} onClick={() => void stats.refetch()}>{copy.refresh}</Button>
            {context === "WAREHOUSE" && data?.location && hasPermission("settings.manage") && <Button disabled={stats.isError} onClick={() => setEditing(true)}>{copy.minimums}</Button>}
            </div>
            </WorkspaceGroup>
        </WorkspaceBar>
        {options.isError && <p className="text-sm text-amber-200" role="alert">Não foi possível carregar os filtros. <button className="underline" onClick={() => void options.refetch()}>{copy.retry}</button></p>}
        {stats.isError && <p className="text-sm text-red-200" role="alert">{data ? copy.stale : copy.error} <button className="underline" onClick={() => void stats.refetch()}>{copy.retry}</button></p>}
        {data ? <><p className="text-xs text-[var(--zyllen-muted)]">Atualizado: {new Date(data.generatedAt).toLocaleString("pt-BR")}</p><InventoryDashboardView data={data} /></> : stats.isPending ? <p>{copy.loading}</p> : null}
        {editing && data?.location && <StockMinimumDialog location={data.location} onClose={() => setEditing(false)} onSaved={() => { void queryClient.invalidateQueries({ queryKey: ["stock-minimums"] }); void queryClient.invalidateQueries({ queryKey: ["inventory-statistics"] }); }} />}
    </div>;
}
