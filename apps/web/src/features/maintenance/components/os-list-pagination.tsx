import { Button } from "@web/components/ui/button";

interface OsListPaginationProps {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
}

export function OsListPagination({ page, limit, total, onPageChange }: OsListPaginationProps) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    if (totalPages <= 1) return null;

    return (
        <nav aria-label="Páginas de ordens de serviço" className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--zyllen-muted)]">
            <span>Página {page} de {totalPages} · {total} OS</span>
            <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</Button>
                <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Próxima</Button>
            </div>
        </nav>
    );
}
