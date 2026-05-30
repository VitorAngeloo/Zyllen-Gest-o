"use client";
import PortalLayout from "@web/components/portal-layout";
import { Headset, LayoutDashboard, Wrench, ClipboardList } from "lucide-react";

const CLIENT_NAV = [
    { label: "Início", href: "/portal-cliente", icon: LayoutDashboard },
    { label: "Meus Chamados", href: "/portal-cliente/chamados", icon: Headset },
    { label: "Ordens de Serviço", href: "/portal-cliente/manutencao", icon: Wrench },
    { label: "Acompanhamentos", href: "/portal-cliente/acompanhamentos", icon: ClipboardList },
];

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
    return (
        <PortalLayout
            navItems={CLIENT_NAV}
            portalName="Portal Cliente"
            allowedType="external"
            loginRedirect="/?type=client"
        >
            {children}
        </PortalLayout>
    );
}
