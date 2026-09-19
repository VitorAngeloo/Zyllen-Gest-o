"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, Clock, Wrench } from "lucide-react";

import { PageHeader } from "@web/components/ui/page-header";
import { ListSectionHeader } from "@web/components/ui/workspace";
import { useAuth } from "@web/features/auth/context/auth-context";

const ACTIONS = [
    {
        label: "Abrir nova OS",
        description: "Registre o serviço, relacione o patrimônio e adicione as informações necessárias.",
        icon: Wrench,
        href: "/portal-terceirizado/manutencao?new=1",
        color: "var(--zyllen-highlight)",
    },
    {
        label: "Continuar trabalho em andamento",
        description: "Consulte ordens abertas ou em execução e atualize o serviço.",
        icon: Clock,
        href: "/portal-terceirizado/manutencao?status=OPEN",
        color: "var(--zyllen-warning)",
    },
    {
        label: "Consultar OS finalizadas",
        description: "Acesse o histórico de ordens encerradas e seus registros.",
        icon: CheckCircle2,
        href: "/portal-terceirizado/manutencao?status=CLOSED",
        color: "var(--zyllen-success)",
    },
];

export default function ContractorPortalHome() {
    const { user } = useAuth();

    return (
        <div className="space-y-10">
            <PageHeader
                eyebrow="Portal do parceiro"
                title={<>Olá, <span className="text-[var(--zyllen-highlight)]">{user?.name}</span></>}
                description="Registre o serviço com clareza e acompanhe cada ordem até a conclusão."
            />

            <section className="space-y-4" aria-labelledby="partner-actions-title">
                <ListSectionHeader title="Por onde começar" description="Escolha a ação de acordo com a etapa atual do trabalho." />
                <div className="divide-y divide-white/10 border-y border-white/10">
                    {ACTIONS.map((action, index) => (
                        <Link
                            key={action.label}
                            href={action.href}
                            className="group grid grid-cols-[2rem_auto_1fr_auto] items-start gap-3 px-1 py-5 transition-colors hover:bg-white/[0.02] sm:grid-cols-[3rem_auto_1fr_auto] sm:gap-5 sm:px-4"
                        >
                            <span className="pt-1 font-mono text-xs tabular-nums text-white/35">0{index + 1}</span>
                            <action.icon size={19} className="mt-0.5 shrink-0" style={{ color: action.color }} />
                            <div>
                                <p id={index === 0 ? "partner-actions-title" : undefined} className="text-sm font-semibold text-white">{action.label}</p>
                                <p className="mt-1 text-xs leading-relaxed text-[var(--zyllen-muted)]">{action.description}</p>
                            </div>
                            <ArrowRight size={16} className="mt-0.5 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-[var(--zyllen-highlight)]" />
                        </Link>
                    ))}
                </div>
            </section>

            <aside className="border-l-2 border-[var(--zyllen-highlight)] pl-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <AlertCircle size={16} className="text-[var(--zyllen-highlight)]" />
                    Fluxo da ordem de serviço
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--zyllen-muted)]">
                    Use o portal para registrar e acompanhar serviços de manutenção em patrimônios cadastrados. Ao terminar o trabalho, solicite o encerramento da OS a um colaborador interno.
                </p>
            </aside>
        </div>
    );
}
