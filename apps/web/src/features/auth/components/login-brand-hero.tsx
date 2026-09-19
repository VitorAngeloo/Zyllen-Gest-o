import Image from "next/image";

import { PartnershipLogos } from "@web/components/brand/zyllen-logo";
import { cn } from "@web/lib/utils";

export function LoginBrandHero({ compact = false }: { compact?: boolean }) {
    return (
        <section
            aria-label="Zyllen Systems — experiências que transformam"
            className={cn(
                "relative isolate overflow-hidden bg-[#171917] text-white",
                compact ? "h-56 lg:hidden" : "hidden min-h-screen lg:flex lg:flex-col",
            )}
        >
            <Image
                src="/brand/zyllen-automation-control.jpg"
                alt=""
                fill
                priority
                quality={88}
                sizes={compact ? "100vw" : "58vw"}
                className="-z-30 object-cover object-[48%_center]"
            />
            <div className={cn("absolute inset-0 -z-20", compact ? "bg-black/35" : "bg-black/[0.08]")} />
            <div
                className={cn(
                    "absolute inset-0 -z-20",
                    compact
                        ? "bg-[linear-gradient(90deg,rgba(11,13,12,0.96)_0%,rgba(11,13,12,0.72)_38%,rgba(11,13,12,0.1)_75%),linear-gradient(0deg,rgba(11,13,12,0.9)_0%,transparent_58%)]"
                        : "bg-[linear-gradient(90deg,rgba(11,13,12,0.92)_0%,rgba(11,13,12,0.55)_38%,rgba(11,13,12,0.04)_72%),linear-gradient(0deg,rgba(11,13,12,0.75)_0%,transparent_55%)]",
                )}
            />
            <div className="absolute inset-x-0 top-0 h-px bg-[var(--zyllen-highlight)]/60" />

            <div
                aria-hidden="true"
                className="absolute -right-20 top-[18%] h-32 w-72 border border-[var(--zyllen-highlight)]/40 [clip-path:polygon(24%_0,100%_0,76%_100%,0_100%)]"
            />
            <div
                aria-hidden="true"
                className="absolute bottom-[18%] left-[45%] h-px w-[45%] -rotate-[28deg] bg-[var(--zyllen-highlight)]/55"
            />

            {compact ? (
                <div className="flex h-full flex-col justify-between p-5">
                    <PartnershipLogos height={43} variant="horizontal" />
                    <div className="max-w-xs pb-1">
                        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--zyllen-highlight)]">Zyllen Gestão</p>
                        <h2 className="font-brand text-2xl font-medium leading-[1.08] tracking-[-0.035em]">
                            Experiências que transformam.
                        </h2>
                    </div>
                </div>
            ) : (
                <div className="flex min-h-screen flex-col justify-between p-10 xl:p-14">
                    <PartnershipLogos height={62} variant="horizontal" />

                    <div className="max-w-xl py-16">
                        <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--zyllen-highlight)]">
                            Zyllen Gestão
                        </p>
                        <h2 className="font-brand text-4xl font-medium leading-[1.04] tracking-[-0.045em] xl:text-[3.35rem]">
                            Experiências<br />
                            <span className="text-[var(--zyllen-highlight)]">que transformam.</span>
                        </h2>
                        <p className="mt-6 max-w-md text-sm leading-7 text-white/68">
                            Atendimento, operação e gestão reunidos em um ambiente que coloca o trabalho no lugar certo.
                        </p>
                    </div>

                    <p className="text-[10px] tracking-wide text-white/42">Zyllen Systems & Grupo Skyline © 2026</p>
                </div>
            )}
        </section>
    );
}
