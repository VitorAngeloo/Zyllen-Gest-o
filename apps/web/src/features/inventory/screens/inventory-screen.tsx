"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@web/components/ui/page-header";
import { WorkspaceBar, WorkspaceGroup } from "@web/components/ui/workspace";
import { PAGE_DESCRIPTIONS } from "@web/lib/brand-voice";
import { useInventoryController } from "../hooks/use-inventory-controller";
import { InventoryBalancesSection } from "../components/inventory-balances-section";
import { InventoryQuickScanSection } from "../components/inventory-quick-scan-section";
import { InventoryEntrySection } from "../components/inventory-entry-section";
import { InventoryBatchEntrySection } from "../components/inventory-batch-entry-section";
import { InventoryExitSection } from "../components/inventory-exit-section";
import { InventoryBatchExitSection } from "../components/inventory-batch-exit-section";
import { InventoryMovementsSection } from "../components/inventory-movements-section";
import { InventoryReportsSection } from "../components/inventory-reports-section";
import { InventoryAssetDetailSection } from "../components/inventory-asset-detail-section";
import { InventoryMovementDetailSection } from "../components/inventory-movement-detail-section";
import InventoryDashboardScreen from "./inventory-dashboard-screen";
import CustodyScreen from "./custody-screen";

function InventoryWorkspace() {
    const controller = useInventoryController();
    const { tab, setTab, tabs } = controller;
    const params = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();
    const requested = params.get("aba");
    const normalizedRequested = requested === "locais" ? "locations" : requested === "historico" ? "movements" : requested === "patrimonios" ? "assets" : requested;
    const requestedTab = normalizedRequested && tabs.some(item => item.key === normalizedRequested)
        ? normalizedRequested as typeof tab
        : pathname.endsWith("/clientes") ? "assets" as const : "dashboard" as const;

    useEffect(() => {
        setTab(requestedTab);
    }, [requestedTab, setTab]);

    const chooseTab = (next: typeof tab) => {
        setTab(next);
        const nextParams = new URLSearchParams(params.toString());
        nextParams.set("aba", next);
        router.replace(`/dashboard/estoque?${nextParams.toString()}`, { scroll: false });
    };
    const groups = ["Acompanhar", "Movimentar", "Configurar"] as const;

    return <div className="space-y-6">
        <PageHeader eyebrow="Estoque e patrimônio" title="Estoque" description={PAGE_DESCRIPTIONS.estoque} />

        <WorkspaceBar className="items-start sm:flex-col sm:items-start sm:justify-start lg:flex-row lg:flex-wrap lg:justify-start lg:gap-x-8 lg:gap-y-5 2xl:flex-nowrap">
            {groups.map(group => <WorkspaceGroup key={group} label={group} className="min-w-0 xl:shrink-0">
                <nav aria-label={`${group} no estoque`} className="flex flex-wrap items-center gap-x-2 gap-y-2 xl:flex-nowrap">
                    {tabs.filter(item => item.group === group).map(item => (
                        <button
                            key={item.key}
                            type="button"
                            aria-pressed={tab === item.key}
                            aria-current={tab === item.key ? "page" : undefined}
                            onClick={() => chooseTab(item.key as typeof tab)}
                            className={`flex whitespace-nowrap items-center gap-1.5 border-b-2 py-1.5 text-sm font-medium transition-colors ${tab === item.key ? "border-[var(--zyllen-highlight)] text-white" : "border-transparent text-[var(--zyllen-muted)] hover:border-white/20 hover:text-white"}`}
                        >
                            <item.icon size={14} className={tab === item.key ? "text-[var(--zyllen-highlight)]" : "text-white/35"} />
                            {item.label}
                        </button>
                    ))}
                </nav>
            </WorkspaceGroup>)}
        </WorkspaceBar>

        {tab === "dashboard" && <InventoryDashboardScreen embedded />}
        {tab === "balances" && <InventoryBalancesSection controller={controller} />}
        {tab === "assets" && <CustodyScreen view="assets" embedded />}
        {tab === "locations" && <CustodyScreen view="locations" embedded />}
        {tab === "bipe" && <InventoryQuickScanSection controller={controller} />}
        {tab === "entry" && <InventoryEntrySection controller={controller} />}
        {tab === "batchEntry" && <InventoryBatchEntrySection controller={controller} />}
        {tab === "exit" && <InventoryExitSection controller={controller} />}
        {tab === "batchExit" && <InventoryBatchExitSection controller={controller} />}
        {tab === "movements" && <InventoryMovementsSection controller={controller} />}
        {tab === "reports" && <InventoryReportsSection controller={controller} />}

        <InventoryAssetDetailSection controller={controller} />
        <InventoryMovementDetailSection controller={controller} />
    </div>;
}

export default function InventoryScreen() {
    return <Suspense fallback={<p className="text-sm text-[var(--zyllen-muted)]">Carregando estoque...</p>}><InventoryWorkspace /></Suspense>;
}
