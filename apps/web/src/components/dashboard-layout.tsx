"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@web/lib/auth-context";
import {
    LayoutDashboard, Package, ScanBarcode, ShoppingCart,
    Headset, Wrench, Database, ShieldCheck, LogOut, ChevronLeft, Menu,
    Tag, Building2, Users, UserCircle, Key, X, FileText, HardHat
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@web/lib/utils";
import { Breadcrumb } from "@web/components/ui/breadcrumb";
import { ZyllenIcon, ZyllenTextLogo } from "@web/components/brand/zyllen-logo";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, perm: "dashboard.view" },

    { label: "Minhas OS", href: "/dashboard/minhas-os", icon: FileText, perm: "maintenance.view" },
    { label: "Estoque", href: "/dashboard/estoque", icon: Package, perm: "inventory.view" },
    { label: "Patrimônio", href: "/dashboard/patrimonio", icon: ScanBarcode, perm: "assets.view" },
    { label: "Compras", href: "/dashboard/compras", icon: ShoppingCart, perm: "purchases.view" },
    { label: "Chamados", href: "/dashboard/chamados", icon: Headset, perm: "tickets.view" },
    { label: "Manutenção", href: "/dashboard/manutencao", icon: Wrench, perm: "maintenance.view" },
    { label: "Etiquetas", href: "/dashboard/etiquetas", icon: Tag, perm: "labels.view" },
    { label: "Terceirizados", href: "/dashboard/terceirizados", icon: HardHat, perm: "settings.view" },
    { label: "Clientes", href: "/dashboard/clientes", icon: Building2, perm: "settings.view" },
    { label: "Colaboradores", href: "/dashboard/colaboradores", icon: Users, perm: "access.view" },
    { label: "Permissões", href: "/dashboard/permissoes", icon: Key, perm: "access.manage" },
    { label: "Cadastros", href: "/dashboard/cadastros", icon: Database, perm: "catalog.view" },
    { label: "Acesso", href: "/dashboard/acesso", icon: ShieldCheck, perm: "access.view" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, hasPermission } = useAuth();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const visibleItems = NAV_ITEMS.filter((item) => hasPermission(item.perm));

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    const sidebarContent = (
        <>
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--zyllen-border)] shrink-0">
                <ZyllenIcon height={collapsed && !mobileOpen ? 28 : 32} />
                {(!collapsed || mobileOpen) && (
                    <ZyllenTextLogo size="default" />
                )}
                {/* Desktop collapse button */}
                <button
                    onClick={() => mobileOpen ? setMobileOpen(false) : setCollapsed(!collapsed)}
                    className="ml-auto text-[var(--zyllen-muted)] hover:text-white transition-colors"
                    aria-label={mobileOpen ? "Fechar menu" : collapsed ? "Expandir menu" : "Recolher menu"}
                >
                    {mobileOpen ? <X size={18} /> : collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                {visibleItems.map((item) => {
                    const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={collapsed && !mobileOpen ? item.label : undefined}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                                active
                                    ? "bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)] border-l-2 border-[var(--zyllen-highlight)]"
                                    : "text-[var(--zyllen-muted)] hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                            )}
                        >
                            <item.icon size={20} className={active ? "text-[var(--zyllen-highlight)]" : ""} />
                            {(!collapsed || mobileOpen) && item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* User */}
            <div className="border-t border-[var(--zyllen-border)] p-3 shrink-0">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/perfil"
                        className="flex items-center justify-center size-8 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] font-bold text-xs hover:bg-[var(--zyllen-highlight)]/30 transition-colors"
                        title="Meu Perfil"
                    >
                        {user?.name?.charAt(0).toUpperCase()}
                    </Link>
                    {(!collapsed || mobileOpen) && (
                        <Link href="/dashboard/perfil" className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                            <p className="text-xs text-[var(--zyllen-muted)] truncate">{user?.type === 'internal' ? (typeof (user as any).role === 'string' ? (user as any).role : (user as any).role?.name) : ''}</p>
                        </Link>
                    )}
                    <button
                        onClick={logout}
                        className="text-[var(--zyllen-muted)] hover:text-[var(--zyllen-error)] transition-colors"
                        title="Sair"
                        aria-label="Sair"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <div className="flex h-screen bg-[var(--zyllen-bg-dark)]">
            {/* Mobile backdrop */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-in fade-in duration-200"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-[var(--zyllen-bg)] border-r border-[var(--zyllen-border)] transition-transform duration-300 lg:hidden",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {sidebarContent}
            </aside>

            {/* Desktop sidebar */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col border-r border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] transition-all duration-300",
                    collapsed ? "w-16" : "w-64"
                )}
            >
                {sidebarContent}
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile top bar */}
                <header className="flex items-center h-14 px-4 border-b border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] lg:hidden shrink-0">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="text-[var(--zyllen-muted)] hover:text-white transition-colors mr-3"
                        aria-label="Abrir menu"
                    >
                        <Menu size={22} />
                    </button>
                    <div className="flex items-center gap-2">
                        <ZyllenIcon height={26} />
                        <ZyllenTextLogo size="sm" />
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Link
                            href="/dashboard/perfil"
                            className="flex items-center justify-center size-8 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] font-bold text-xs"
                        >
                            {user?.name?.charAt(0).toUpperCase()}
                        </Link>
                    </div>
                </header>

                <main className="flex-1 overflow-auto">
                    <div className="p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
                        <Breadcrumb />
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
