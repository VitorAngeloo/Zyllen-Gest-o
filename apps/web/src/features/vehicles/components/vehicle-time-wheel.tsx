"use client";
import { useId, useLayoutEffect, useRef } from 'react';

interface Props { label: string; count: number; value: number; onChange: (value: number) => void }
const rowHeight = 40;
export function VehicleTimeWheel({ label, count, value, onChange }: Props) {
    const id = useId(), ref = useRef<HTMLDivElement>(null), scrolledValue = useRef<number | null>(null);
    useLayoutEffect(() => {
        if (scrolledValue.current === value) { scrolledValue.current = null; return; }
        if (ref.current) ref.current.scrollTop = value * rowHeight;
    }, [value]);
    const select = (next: number) => { const selected = Math.max(0, Math.min(count - 1, next)); scrolledValue.current = null; onChange(selected); if (ref.current) { ref.current.scrollTop = selected * rowHeight; ref.current.focus(); } };
    return <div className="min-w-0 flex-1"><p id={id} className="mb-2 text-center text-xs text-[var(--zyllen-muted)]">{label}</p><div className="relative">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-20 z-10 h-10 rounded-md border-y border-[var(--zyllen-highlight)]/50 bg-[var(--zyllen-highlight)]/10" />
        <div ref={ref} role="listbox" aria-labelledby={id} aria-activedescendant={`${id}-${value}`} tabIndex={0} data-time-wheel={label} className="h-[200px] touch-pan-y snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-lg border border-[var(--zyllen-border)] py-20 outline-none focus-visible:ring-2 focus-visible:ring-[var(--zyllen-highlight)] [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }} onScroll={event => {
            const next = Math.max(0, Math.min(count - 1, Math.round(event.currentTarget.scrollTop / rowHeight)));
            if (next !== value) { scrolledValue.current = next; onChange(next); }
        }} onKeyDown={event => {
            const offsets: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 };
            if (event.key in offsets) { event.preventDefault(); select(value + offsets[event.key]); }
            else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); select(event.key === 'Home' ? 0 : count - 1); }
            else if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
        }}>{Array.from({ length: count }, (_, index) => <button key={index} id={`${id}-${index}`} role="option" aria-selected={index === value} type="button" tabIndex={-1} className={`block h-10 w-full snap-center text-center font-mono text-xl ${index === value ? 'font-semibold text-[var(--zyllen-highlight)]' : 'text-[var(--zyllen-muted)]'}`} onMouseDown={event => event.preventDefault()} onClick={() => select(index)}>{String(index).padStart(2, '0')}</button>)}</div>
    </div></div>;
}
