



export function assetStateBadge(a: any): { label: string; variant: "success" | "destructive" | "warning" | "default" } {
    if (a.status === "BAIXADO") return { label: "Baixado", variant: "destructive" };
    if (a.status === "EM_MANUTENCAO") return { label: "Em Manutenção", variant: "warning" };
    const inStock = !!a.currentLocationId || !!a.currentLocation;
    if (!inStock) {
        const motivo = String(a.lastExitReason || "").split(" — ")[0].trim();
        return { label: motivo || "Fora do estoque", variant: "default" };
    }
    return { label: "Em estoque", variant: "success" };
}
