


export const STATUS_CONFIG: Record<string, { label: string; variant: "warning" | "default" | "success" }> = {
    IN_PROGRESS: { label: "Em Andamento", variant: "default" },
    PENDING: { label: "Pendente", variant: "warning" },
    COMPLETED: { label: "Concluído", variant: "success" },
};

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
