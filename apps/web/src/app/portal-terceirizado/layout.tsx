"use client";
import PortalLayout from "@web/components/portal-layout";
import { Wrench, LayoutDashboard } from "lucide-react";

const CONTRACTOR_NAV = [
    { label: "Início", href: "/portal-terceirizado", icon: LayoutDashboard },
    { label: "Minhas OS", href: "/portal-terceirizado/manutencao", icon: Wrench },
];

export default function ContractorPortalLayout({ children }: { children: React.ReactNode }) {
    return (
        <PortalLayout
            navItems={CONTRACTOR_NAV}
            portalName="Portal Terceirizado"
            allowedType="contractor"
            loginRedirect="/?type=contractor"
        >
            {children}
        </PortalLayout>
    );
}
