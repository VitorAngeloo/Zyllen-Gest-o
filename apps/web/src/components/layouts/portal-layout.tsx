"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, type UserType } from "@web/features/auth/context/auth-context";
import { LogOut, ChevronLeft, Menu, X } from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { cn } from "@web/lib/utils";
import { ZyllenIcon, ZyllenTextLogo, SkyLineLogo } from "@web/components/brand/zyllen-logo";

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
                <div className="flex animate-pulse items-center gap-3">
                    <div className="size-8 border border-[var(--zyllen-highlight)]/40 bg-[var(--zyllen-highlight)]/15" />
                    <span className="text-sm font-medium text-white">Carregando portal...</span>
                </div>
            </div>
        );
    }

    const sidebarContent = (
        <>
            {/* Logo */}
            <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--zyllen-border)] shrink-0">
                <ZyllenIcon height={collapsed && !mobileOpen ? 28 : 32} />
                {(!collapsed || mobileOpen) && (
                    <>
                        <ZyllenTextLogo size="default" />
                        <div className="h-5 w-px bg-[var(--zyllen-border)]" />
                        <SkyLineLogo height={32} />
                    </>
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
            <nav aria-label={portalName} className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
                {(!collapsed || mobileOpen) && (
                    <p className="mb-3 px-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">{portalName}</p>
                )}
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
                                "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zyllen-highlight)]/50",
                                active
                                    ? "bg-white/[0.07] text-white"
                                    : "text-[var(--zyllen-muted)] hover:bg-white/[0.04] hover:text-white"
                            )}
                        >
                            {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--zyllen-highlight)]" />}
                            <item.icon size={18} className={active ? "text-[var(--zyllen-highlight)]" : "text-white/55"} />
                            {(!collapsed || mobileOpen) && item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* User */}
            <div className="border-t border-[var(--zyllen-border)] p-3 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center border border-[var(--zyllen-highlight)]/25 bg-[var(--zyllen-highlight)]/10 text-xs font-bold text-[var(--zyllen-highlight)]">
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
                    "hidden lg:flex flex-col border-r border-white/10 bg-[var(--zyllen-bg)] transition-all duration-300",
                    collapsed ? "w-16" : "w-68"
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
                        <ZyllenIcon height={28} />
                        <div className="h-4 w-px bg-[var(--zyllen-border)]" />
                        <SkyLineLogo height={26} />
                    </div>
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">{portalName}</span>
                </header>

                <main className="flex-1 overflow-auto">
                    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
                </main>
            </div>
        </div>
    );
}
