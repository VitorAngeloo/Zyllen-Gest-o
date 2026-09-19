import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@web/lib/utils";

export function WorkspaceBar({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div
            data-slot="workspace-bar"
            className={cn(
                "flex flex-col gap-4 border-y border-white/10 bg-white/[0.015] py-4 sm:flex-row sm:items-end sm:justify-between",
                className,
            )}
        >
            {children}
        </div>
    );
}

export function WorkspaceGroup({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
    return (
        <div className={cn("space-y-2", className)}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{label}</p>
            {children}
        </div>
    );
}

export function ListSectionHeader({
    title,
    count,
    description,
    actions,
    className,
}: {
    title: string;
    count?: number;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
            <div>
                <div className="flex items-baseline gap-2">
                    <h2 className="text-base font-semibold text-white">{title}</h2>
                    {typeof count === "number" && (
                        <span className="font-mono text-xs tabular-nums text-[var(--zyllen-highlight)]" aria-label={`${count} registros`}>
                            {String(count).padStart(2, "0")}
                        </span>
                    )}
                </div>
                {description && <p className="mt-1 text-xs leading-relaxed text-[var(--zyllen-muted)]">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export function RecordList({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div data-slot="record-list" className={cn("divide-y divide-white/10 border-y border-white/10", className)}>
            {children}
        </div>
    );
}

export function RecordRow({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            type="button"
            data-slot="record-row"
            className={cn(
                "group relative block w-full px-3 py-4 text-left transition-colors before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:origin-center before:scale-y-0 before:bg-[var(--zyllen-highlight)] before:transition-transform hover:bg-white/[0.025] hover:before:scale-y-100 focus-visible:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--zyllen-highlight)]/35 focus-visible:before:scale-y-100 sm:px-4",
                className,
            )}
            {...props}
        >
            {children}
        </button>
    );
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: {
    icon?: ReactNode;
    title: string;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div
            role="status"
            className={cn("flex min-h-48 items-center border-y border-white/10 py-8", className)}
        >
            <div className="flex max-w-lg items-start gap-4">
                {icon && <div className="mt-0.5 text-white/30" aria-hidden="true">{icon}</div>}
                <div>
                    <h2 className="text-sm font-semibold text-white">{title}</h2>
                    {description && <p className="mt-1 text-sm leading-relaxed text-[var(--zyllen-muted)]">{description}</p>}
                    {action && <div className="mt-4">{action}</div>}
                </div>
            </div>
        </div>
    );
}
