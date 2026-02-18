"use client";
import PortalLayout from "@web/components/portal-layout";
import { Headset, LayoutDashboard } from "lucide-react";

const CLIENT_NAV = [
    { label: "Início", href: "/portal-cliente", icon: LayoutDashboard },
    { label: "Meus Chamados", href: "/portal-cliente/chamados", icon: Headset },
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
