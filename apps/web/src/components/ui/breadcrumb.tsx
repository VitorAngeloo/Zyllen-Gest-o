"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

const LABELS: Record<string, string> = {
    dashboard: "Dashboard",
    equipamentos: "Equipamentos",
    saidas: "Saídas",
    estoque: "Estoque",
    patrimonio: "Patrimônio",
    compras: "Compras",
    chamados: "Chamados",
    manutencao: "Manutenção",
    etiquetas: "Etiquetas",
    clientes: "Clientes",
    cadastros: "Cadastros",
    acesso: "Acesso",
    perfil: "Meu Perfil",
    colaboradores: "Colaboradores",
    permissoes: "Permissões",
    "portal-cliente": "Portal Cliente",
    "portal-terceirizado": "Portal Terceirizado",
};

export function Breadcrumb() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length <= 1) return null;

    const crumbs = segments.map((seg, idx) => {
        const href = "/" + segments.slice(0, idx + 1).join("/");
        const label = LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
        const isLast = idx === segments.length - 1;
        return { href, label, isLast };
    });

    return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--zyllen-muted)] mb-4">
            <Link
                href={crumbs[0]?.href || "/dashboard"}
                className="hover:text-[var(--zyllen-highlight)] transition-colors"
            >
                <Home size={14} />
            </Link>
            {crumbs.map((crumb) => (
                <span key={crumb.href} className="flex items-center gap-1.5">
                    <ChevronRight size={12} className="text-[var(--zyllen-border)]" />
                    {crumb.isLast ? (
                        <span className="text-white font-medium">{crumb.label}</span>
                    ) : (
                        <Link
                            href={crumb.href}
                            className="hover:text-[var(--zyllen-highlight)] transition-colors"
                        >
                            {crumb.label}
                        </Link>
                    )}
                </span>
            ))}
        </nav>
    );
}
