"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";



export function SkuSearchCombobox({ skus, value, onChange }: { skus: any[]; value: string; onChange: (id: string) => void }) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const selected = skus?.find((s: any) => s.id === value);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const normalize = (str: string) => str?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") ?? "";

    const filtered = query.trim()
        ? skus?.filter((s: any) => {
            const q = normalize(query);
            return normalize(s.name).includes(q)
                || normalize(s.skuCode).includes(q)
                || (s.barcode && normalize(s.barcode).includes(q))
                || (s.brand && normalize(s.brand).includes(q));
        }) ?? []
        : skus ?? [];

    return (
        <div ref={ref} className="relative">
            {selected ? (
                <div className="flex items-center gap-2 h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white px-3 text-sm">
                    <span className="font-mono text-[var(--zyllen-highlight)] text-xs">{selected.skuCode}</span>
                    <span className="truncate flex-1">{selected.name}</span>
                    {selected.barcode && <span className="text-[var(--zyllen-muted)] text-xs hidden sm:inline">({selected.barcode})</span>}
                    <button type="button" onClick={() => { onChange(""); setQuery(""); }} className="text-[var(--zyllen-muted)] hover:text-white ml-1">
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--zyllen-muted)]" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        placeholder="Buscar por nome, código do item ou código de barras..."
                        className="w-full h-9 rounded-md border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white pl-9 pr-3 text-sm placeholder:text-[var(--zyllen-muted)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50"
                    />
                </div>
            )}
            {open && !selected && (
                <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] shadow-xl">
                    {filtered.length ? filtered.map((s: any) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => { onChange(s.id); setQuery(""); setOpen(false); }}
                            className="w-full text-left px-3 py-2 hover:bg-[var(--zyllen-highlight)]/10 transition-colors flex items-center gap-2 text-sm border-b border-[var(--zyllen-border)]/30 last:border-0"
                        >
                            <span className="font-mono text-[var(--zyllen-highlight)] text-xs w-16 shrink-0">{s.skuCode}</span>
                            <span className="text-white truncate flex-1">{s.name}</span>
                            {s.barcode && <span className="text-[var(--zyllen-muted)] text-xs shrink-0">{s.barcode}</span>}
                        </button>
                    )) : (
                        <div className="px-3 py-4 text-center text-[var(--zyllen-muted)] text-sm">Nenhum item encontrado</div>
                    )}
                </div>
            )}
            {/* Hidden input for form validation */}
            <input type="text" value={value} required tabIndex={-1} className="sr-only" onChange={() => {}} />
        </div>
    );
}
