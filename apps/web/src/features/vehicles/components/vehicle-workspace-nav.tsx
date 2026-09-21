"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@web/features/auth/context/auth-context';

export function VehicleWorkspaceNav() {
    const pathname = usePathname();
    const { user } = useAuth();
    const manager = user?.type === 'internal' && ['Administrador', 'Gestor'].includes(user.role.name);
    const links = [
        { href: '/dashboard/carros', label: 'Reservas' },
        { href: '/dashboard/carros/movimentacoes', label: 'Retiradas e devoluções' },
        ...(manager ? [{ href: '/dashboard/carros/painel', label: 'Painel' }] : []),
    ];
    return <nav aria-label="Áreas de carros" className="flex flex-wrap gap-1 border-b border-white/10">
        {links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined}
            className={`rounded-t-md px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--zyllen-highlight)] ${pathname === link.href ? 'border-b-2 border-[var(--zyllen-highlight)] bg-white/[0.05] text-white' : 'text-[var(--zyllen-muted)] hover:bg-white/[0.03] hover:text-white'}`}>{link.label}</Link>)}
    </nav>;
}
