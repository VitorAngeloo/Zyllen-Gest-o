"use client";

import type { InventoryStatistics, StockRanking } from "@zyllen/shared";
import { INVENTORY_DASHBOARD_COPY as copy } from "@web/lib/brand-voice";

export function InventoryDashboardView({ data }: { data: InventoryStatistics }) {
    const tile = "min-w-0 border-y border-white/10 py-4";
    const metric = (key: string, label: string, value: number) => <article key={key} className="min-w-0 px-4 py-4" data-inventory-metric={key}><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">{label}</p><strong className="mt-2 block text-2xl font-semibold tabular-nums" data-metric-value>{value.toLocaleString("pt-BR")}</strong></article>;
    const ranking = (title: string, rows: StockRanking[], key: string, empty: string = copy.emptyRanking) => <section className={tile} data-inventory-ranking={key}>
        <h2 className="mb-3 text-sm font-semibold">{title}</h2>
        {!rows.length && <p className="text-sm text-[var(--zyllen-muted)]">{empty}</p>}
        <ol className="divide-y divide-white/10">{rows.map(row => <li key={row.skuId} className="flex justify-between gap-3 py-2 text-sm"><span className="min-w-0 break-words">{row.name}<span className="block font-mono text-[11px] text-[var(--zyllen-muted)]">{row.skuCode}</span></span><strong className="shrink-0 font-mono tabular-nums">{row.quantity}</strong></li>)}</ol>
    </section>;
    const scope = data.scope ?? { assets: 0, available: 0, maintenance: 0 };
    const contextLabel = data.location?.name ?? (data.context === "WAREHOUSE" ? "Todos os estoques Skyline" : data.context === "CLIENT" ? "Todos os clientes" : "Todo o patrimônio");

    return <div className="space-y-4 text-white">
        <p className="text-xs text-[var(--zyllen-muted)]">{contextLabel} · {new Date(data.period.start).toLocaleDateString("pt-BR")} a {new Date(data.period.end).toLocaleDateString("pt-BR")} · últimos 30 dias</p>

        {data.context === "CLIENT" && data.clientInsights ? <>
            <div className="grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
                {metric("client-assets", "Patrimônios em clientes", scope.assets)}
                {metric("client-projects", "Projetos com patrimônio", data.clientInsights.projectsWithAssets)}
                {metric("client-maintenance", "Em manutenção nos clientes", scope.maintenance)}
                {metric("client-writeoffs", "Baixas nos últimos 30 dias", data.clientInsights.writeOffs30)}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                {ranking("Itens mais usados nos projetos", data.clientInsights.topUsedItems, "client-used", "Nenhum patrimônio vinculado aos projetos selecionados.")}
                {ranking("Itens com mais baixas nos clientes", data.clientInsights.topWriteOffItems, "client-writeoffs", "Nenhuma baixa registrada em estoque de cliente nos últimos 30 dias.")}
            </div>
            <section className={tile}>
                <h2 className="mb-3 font-semibold">Projetos com mais patrimônios</h2>
                {!data.clientInsights.topProjects.length && <p className="text-sm text-[var(--zyllen-muted)]">Nenhum projeto com patrimônio neste filtro.</p>}
                <ol className="space-y-2">{data.clientInsights.topProjects.map(project => <li key={project.projectId} className="flex justify-between gap-3 text-sm"><span>{project.name}<span className="block text-xs text-[var(--zyllen-muted)]">{project.companyName}</span></span><strong>{project.quantity}</strong></li>)}</ol>
            </section>
        </> : <>
            <div className="grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
                {metric("scoped", data.context === "WAREHOUSE" ? "Patrimônios nos estoques Skyline" : "Patrimônios no contexto", scope.assets)}
                {metric("available", data.context === "WAREHOUSE" ? "Disponíveis nos estoques Skyline" : "Disponíveis em estoques internos", scope.available)}
                {metric("maintenance", "Em manutenção", scope.maintenance)}
                {metric("skus", copy.totalSkus, data.totals.skus)}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">{ranking(copy.entries, data.topEntries, "entries")}{ranking(copy.exits, data.topExits, "exits")}</div>
        </>}

        <p className="text-xs text-[var(--zyllen-muted)]">Total cadastrado: {data.totals.assets} · Sem local: {data.totals.unlocated} · Local não classificado: {data.totals.unclassified}</p>
        {(data.totals.unclassified > 0 || data.totals.unlocated > 0) && <section aria-label={copy.identifyLocations} data-inventory-classification className="space-y-1 border-l-2 border-amber-400 bg-amber-500/5 px-4 py-3 text-xs text-amber-200"><p>{copy.classificationNotice}</p>{data.totals.unclassified > 0 && <p>{copy.unclassified(data.totals.unclassified)}</p>}{data.totals.unlocated > 0 && <p>{copy.unlocated(data.totals.unlocated)}</p>}</section>}

        {data.context === "WAREHOUSE" && data.location && <section className={tile}>
            <h2 className="font-semibold">{copy.priorities}</h2><p className="mt-1 text-sm text-[var(--zyllen-muted)]">{copy.explanatory}</p>
            {data.minimumConfiguredCount === 0 && <p className="mt-3 text-sm text-amber-200">{copy.noMinimum}</p>}
            <p className="mt-3 text-xs text-[var(--zyllen-muted)]">{data.criticalCount} item(ns) crítico(s) · {data.priorities.length} prioridade(s) exibida(s) · {data.minimumConfiguredCount} reserva(s) configurada(s)</p>
            {!data.priorities.length && data.minimumConfiguredCount > 0 && <p className="mt-3 text-sm">{copy.healthy}</p>}
            <div className="mt-3 grid gap-3 lg:grid-cols-2">{data.priorities.map(priority => <article key={priority.skuId} data-replenishment-priority data-critical={String(priority.critical)} className={`border-l-2 px-3 py-2 ${priority.critical ? "border-red-400 bg-red-500/5" : "border-amber-400 bg-amber-500/5"}`}><div className="flex justify-between gap-2"><h3 className="min-w-0 break-words text-sm font-medium">{priority.name}</h3><span className={`shrink-0 text-xs ${priority.critical ? "text-red-200" : "text-amber-200"}`}>{priority.critical ? copy.critical : copy.attention}</span></div><p className="mt-1 font-mono text-[11px] text-[var(--zyllen-muted)]">{priority.skuCode}</p><p className="mt-2 text-xs">Disponível: {priority.available} · Saídas: {priority.output30} · {priority.minimum === null ? copy.minimumUnset : `Reserva: ${priority.minimum}`}{priority.shortage !== null && priority.shortage > 0 && ` · Falta: ${priority.shortage}`}</p></article>)}</div>
        </section>}

        <section className={tile}><h2 className="mb-3 text-sm font-semibold">{copy.quantities}</h2><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{data.movements.map(movement => <p key={movement.nature} className="border-l border-white/15 px-3 py-2 text-xs"><span className="block text-[var(--zyllen-muted)]">{copy.nature[movement.nature]}</span><strong className="font-mono tabular-nums">{movement.quantity}</strong> unidade(s) · {movement.records} registro(s)</p>)}</div>{!data.movements.length && <p className="text-sm text-[var(--zyllen-muted)]">{copy.emptyRanking}</p>}</section>
    </div>;
}
