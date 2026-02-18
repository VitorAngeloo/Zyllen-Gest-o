"use client";
import { useAuth } from "@web/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@web/components/ui/card";
import { Wrench, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ContractorPortalHome() {
    const { user } = useAuth();

    const cards = [
        { label: "Abrir OS", description: "Registre uma nova ordem de serviço", icon: Wrench, href: "/portal-terceirizado/manutencao?new=1", color: "var(--zyllen-highlight)" },
        { label: "Em Andamento", description: "OS abertas ou em progresso", icon: Clock, href: "/portal-terceirizado/manutencao?status=OPEN", color: "var(--zyllen-warning)" },
        { label: "Finalizadas", description: "OS encerradas", icon: CheckCircle2, href: "/portal-terceirizado/manutencao?status=CLOSED", color: "var(--zyllen-success)" },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white">
                    Olá, <span className="text-[var(--zyllen-highlight)]">{user?.name}</span>
                </h1>
                <p className="text-[var(--zyllen-muted)] mt-1">
                    Bem-vindo ao portal do terceirizado. Gerencie suas ordens de serviço de manutenção.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cards.map((card) => (
                    <Link key={card.label} href={card.href}>
                        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] hover:border-[var(--zyllen-highlight)]/30 transition-all cursor-pointer group">
                            <CardHeader className="flex flex-row items-center gap-3 pb-2">
                                <div
                                    className="flex items-center justify-center size-10 rounded-lg"
                                    style={{ backgroundColor: `color-mix(in srgb, ${card.color} 15%, transparent)` }}
                                >
                                    <card.icon size={20} style={{ color: card.color }} />
                                </div>
                                <CardTitle className="text-sm text-white group-hover:text-[var(--zyllen-highlight)] transition-colors">
                                    {card.label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-[var(--zyllen-muted)]">{card.description}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <AlertCircle size={18} className="text-[var(--zyllen-highlight)]" />
                        Informações
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-[var(--zyllen-muted)] space-y-2">
                    <p>Utilize este portal para registrar e acompanhar ordens de serviço de manutenção.</p>
                    <p>Você pode abrir OS para patrimônios cadastrados e acompanhar o andamento na seção &quot;Minhas OS&quot;.</p>
                    <p>O encerramento da OS deve ser solicitado a um colaborador interno.</p>
                </CardContent>
            </Card>
        </div>
    );
}
