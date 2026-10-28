import type { ProjectStatistics } from '@zyllen/shared';

/** Aggregates only. The caller supplies its own period; no mutation or private notes. */
export function ProjectChronogramMetrics({ data, compact = false }: { data: NonNullable<ProjectStatistics['chronogram']>; compact?: boolean }) {
    return <section aria-label="Indicadores do cronograma" className="space-y-3 rounded-md border border-[var(--zyllen-border)] p-3">
        <h4 className="text-sm font-medium text-white">Cronograma e Planejamento</h4>
        <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'sm:grid-cols-4'}`}>
            <div data-project-chronogram="open-actions"><strong className="font-mono text-xl text-[var(--zyllen-highlight)]">{data.actions.open}</strong><p className="text-xs text-[var(--zyllen-muted)]">Ações manuais abertas</p></div>
            <div data-project-chronogram="projects-with-actions"><strong className="font-mono text-xl text-white">{data.actions.projects}</strong><p className="text-xs text-[var(--zyllen-muted)]">Projetos com ações abertas</p></div>
            {(['installations', 'removals'] as const).map(type => <div key={type} data-project-chronogram={type}><strong className="font-mono text-xl text-white">{data.completed[type].total}</strong><p className="text-xs text-[var(--zyllen-muted)]">{type === 'installations' ? 'Instalações' : 'Desinstalações'} concluídas no período</p><p className="mt-1 text-[10px] text-[var(--zyllen-muted)]">Salas {data.completed[type].rooms} · Telas {data.completed[type].screens} · Sem classificação {data.completed[type].unknown}</p></div>)}
        </div>
        <p className="text-[11px] text-[var(--zyllen-muted)]">Ações representam a situação atual. Conclusões usam a data real no período consultado.</p>
        {data.completionWithoutRealDate > 0 && <p role="status" className="text-xs text-amber-200">{data.completionWithoutRealDate} projeto(s) com conclusão indicada sem data real. Não entram nas conclusões do período.</p>}
    </section>;
}
