"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, type UserType } from "@web/lib/auth-context";
import { LogOut, ChevronLeft, Menu, X } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { cn } from "@web/lib/utils";

interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface PortalLayoutProps {
    children: ReactNode;
    navItems: NavItem[];
    portalName: string;
    allowedType: UserType;
    loginRedirect: string;
}

export default function PortalLayout({
    children,
    navItems,
    portalName,
    allowedType,
    loginRedirect,
}: PortalLayoutProps) {
    const { user, logout, isLoading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Redirect if not authenticated or wrong user type
    useEffect(() => {
        if (!isLoading && (!user || user.type !== allowedType)) {
            router.replace(loginRedirect);
        }
    }, [isLoading, user, allowedType, loginRedirect, router]);

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    if (isLoading || !user || user.type !== allowedType) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--zyllen-bg-dark)]">
                <div className="animate-pulse flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-[var(--zyllen-highlight)] animate-bounce" />
                    <span className="text-white text-lg font-semibold">Carregando...</span>
                </div>
            </div>
        );
    }

    const sidebarContent = (
        <>
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--zyllen-border)] shrink-0">
                <div className="flex items-center justify-center size-8 rounded-lg bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg)]">
                    <span className="font-extrabold text-sm">Z</span>
                </div>
                {(!collapsed || mobileOpen) && (
                    <div className="flex flex-col">
                        <span className="font-bold text-sm text-white tracking-tight">
                            Zyllen <span className="text-[var(--zyllen-highlight)]">Gestão</span>
                        </span>
                        <span className="text-[10px] text-[var(--zyllen-muted)] uppercase tracking-wider">
                            {portalName}
                        </span>
                    </div>
                )}
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
                {navItems.map((item) => {
                    const active =
                        pathname === item.href ||
                        (item.href !== navItems[0]?.href && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={collapsed && !mobileOpen ? item.label : undefined}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                active
                                    ? "bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)] border border-[var(--zyllen-highlight)]/20"
                                    : "text-[var(--zyllen-muted)] hover:text-white hover:bg-white/5"
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
                    <div className="flex items-center justify-center size-8 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] font-bold text-xs">
                        {user.name?.charAt(0).toUpperCase()}
                    </div>
                    {(!collapsed || mobileOpen) && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user.name}</p>
                            <p className="text-xs text-[var(--zyllen-muted)] truncate">{user.email}</p>
                        </div>
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
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
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
                        <div className="flex items-center justify-center size-7 rounded-lg bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg)]">
                            <span className="font-extrabold text-xs">Z</span>
                        </div>
                        <span className="font-bold text-sm text-white">
                            {portalName}
                        </span>
                    </div>
                </header>

                <main className="flex-1 overflow-auto">
                    <div className="p-4 sm:p-6 lg:p-8">{children}</div>
                </main>
            </div>
        </div>
    );
}
