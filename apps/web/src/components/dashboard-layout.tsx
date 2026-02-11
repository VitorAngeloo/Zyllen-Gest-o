"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@web/lib/auth-context";
import {
    LayoutDashboard, Package, ScanBarcode, ShoppingCart,
    Headset, Wrench, Database, ShieldCheck, LogOut, ChevronLeft, Menu
} from "lucide-react";
import { useState } from "react";
import { cn } from "@web/lib/utils";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, perm: "dashboard.view" },
    { label: "Estoque", href: "/dashboard/estoque", icon: Package, perm: "inventory.view" },
    { label: "Patrimônio", href: "/dashboard/patrimonio", icon: ScanBarcode, perm: "assets.view" },
    { label: "Compras", href: "/dashboard/compras", icon: ShoppingCart, perm: "purchases.view" },
    { label: "Chamados", href: "/dashboard/chamados", icon: Headset, perm: "tickets.view" },
    { label: "Manutenção", href: "/dashboard/manutencao", icon: Wrench, perm: "maintenance.view" },
    { label: "Cadastros", href: "/dashboard/cadastros", icon: Database, perm: "catalog.view" },
    { label: "Acesso", href: "/dashboard/acesso", icon: ShieldCheck, perm: "roles.view" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, hasPermission } = useAuth();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    const visibleItems = NAV_ITEMS.filter((item) => hasPermission(item.perm));

    return (
        <div className="flex h-screen bg-[var(--zyllen-bg-dark)]">
            {/* Sidebar */}
            <aside
                className={cn(
                    "flex flex-col border-r border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] transition-all duration-300",
                    collapsed ? "w-16" : "w-64"
                )}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--zyllen-border)]">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg)]">
                        <span className="font-extrabold text-sm">Z</span>
                    </div>
                    {!collapsed && (
                        <span className="font-bold text-lg text-white tracking-tight">
                            Zyllen <span className="text-[var(--zyllen-highlight)]">Gestão</span>
                        </span>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="ml-auto text-[var(--zyllen-muted)] hover:text-white transition-colors"
                    >
                        {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
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
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                    active
                                        ? "bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)] border border-[var(--zyllen-highlight)]/20"
                                        : "text-[var(--zyllen-muted)] hover:text-white hover:bg-white/5"
                                )}
                            >
                                <item.icon size={20} className={active ? "text-[var(--zyllen-highlight)]" : ""} />
                                {!collapsed && item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User */}
                <div className="border-t border-[var(--zyllen-border)] p-3">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-8 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] font-bold text-xs">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                                <p className="text-xs text-[var(--zyllen-muted)] truncate">{user?.role?.name}</p>
                            </div>
                        )}
                        <button
                            onClick={logout}
                            className="text-[var(--zyllen-muted)] hover:text-[var(--zyllen-error)] transition-colors"
                            title="Sair"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <div className="p-6 lg:p-8">{children}</div>
            </main>
        </div>
    );
}
