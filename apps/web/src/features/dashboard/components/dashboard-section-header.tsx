import type { ReactNode } from 'react';

interface Props {
    index: string;
    eyebrow: string;
    title: string;
    description: ReactNode;
    meta?: ReactNode;
}

export function DashboardSectionHeader({ index, eyebrow, title, description, meta }: Props) {
    return <header data-dashboard-section-header className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b border-white/10 pb-4 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-4">
        <span aria-hidden="true" className="pt-0.5 font-mono text-[10px] font-semibold tabular-nums tracking-[0.16em] text-[var(--zyllen-highlight)]">{index}</span>
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{eyebrow}</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">{title}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--zyllen-muted)]">{description}</p>
            </div>
            {meta && <div className="shrink-0 text-[11px] text-white/40">{meta}</div>}
        </div>
    </header>;
}
