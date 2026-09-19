import type { ReactNode } from "react";
import { cn } from "@web/lib/utils";

interface PageHeaderProps {
    eyebrow?: string;
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
    return (
        <header
            data-slot="page-header"
            className={cn(
                "relative flex flex-col gap-5 border-b border-white/10 pb-6 after:absolute after:-bottom-px after:left-0 after:h-px after:w-16 after:bg-[var(--zyllen-highlight)] sm:flex-row sm:items-end sm:justify-between",
                className,
            )}
        >
            <div className="flex min-w-0 max-w-3xl items-start gap-4">
                <span
                    aria-hidden="true"
                    className="mt-1.5 h-10 w-1.5 shrink-0 bg-[var(--zyllen-highlight)] [clip-path:polygon(0_0,100%_0,100%_85%,0_100%)]"
                />
                <div className="min-w-0">
                    {eyebrow && (
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                            {eyebrow}
                        </p>
                    )}
                    <h1 className="text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">{title}</h1>
                    {description && (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--zyllen-muted)]">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
    );
}
