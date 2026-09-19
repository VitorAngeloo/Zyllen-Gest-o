"use client";

import * as React from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@web/lib/utils";

// Combobox com filtro por digitação — busca acento-insensível.
// Usa HTML nativo por baixo (input + lista), sem dependência pesada.

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
const norm = (s: string) =>
    s.normalize("NFD").replace(DIACRITICS, "").toLowerCase();

export interface SearchableSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    options: (string | { value: string; label: string })[];
    id?: string;
    ariaLabel?: string;
    searchPlaceholder?: string;
    placeholder?: string;
    emptyText?: string;
    loadingText?: string;
    disabled?: boolean;
    loading?: boolean;
    className?: string;
}

export function SearchableSelect({
    value,
    onValueChange,
    options,
    id,
    ariaLabel,
    searchPlaceholder = "Digite para filtrar...",
    placeholder = "Selecione...",
    emptyText = "Nenhum resultado",
    loadingText = "Carregando...",
    disabled = false,
    loading = false,
    className,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const [highlight, setHighlight] = React.useState(0);
    const wrapRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const restoreFocus = React.useRef(false);
    const listId = React.useId();
    const items = React.useMemo(() => options.map(option => typeof option === "string" ? { value: option, label: option } : option), [options]);
    const selected = items.find(option => option.value === value)?.label ?? value;

    const filtered = React.useMemo(() => {
        if (!query) return items;
        const q = norm(query);
        return items.filter((o) => norm(o.label).includes(q));
    }, [items, query]);

    // Fecha ao clicar fora
    React.useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    React.useEffect(() => { setHighlight(0); }, [query, open]);
    React.useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
    React.useLayoutEffect(() => {
        if (open && !disabled) inputRef.current?.focus();
        else if (restoreFocus.current) {
            restoreFocus.current = false;
            wrapRef.current?.querySelector<HTMLButtonElement>('button[role="combobox"]')?.focus();
        }
    }, [open, disabled]);

    const choose = (v: string) => {
        onValueChange(v);
        setQuery("");
        restoreFocus.current = true;
        setOpen(false);
    };

    const openAndFocus = () => {
        if (disabled) return;
        setOpen(true);
        setQuery("");
    };

    return (
        <div ref={wrapRef} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
            {open ? (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 opacity-50 pointer-events-none" />
                    <input
                        ref={inputRef}
                        id={id}
                        role="combobox"
                        aria-label={ariaLabel}
                        aria-expanded="true"
                        aria-controls={listId}
                        aria-autocomplete="list"
                        aria-activedescendant={filtered[highlight] ? `${listId}-${highlight}` : undefined}
                        autoComplete="off"
                        disabled={disabled}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                        className={cn(
                            "flex h-9 w-full rounded-md border bg-transparent pl-9 pr-3 py-2 text-sm",
                            "focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring",
                            className,
                        )}
                        onKeyDown={(e) => {
                            if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.max(0, Math.min(h + 1, filtered.length - 1))); }
                            else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
                            else if (e.key === "Enter") { e.preventDefault(); if (!loading && filtered[highlight]) choose(filtered[highlight].value); }
                            else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); restoreFocus.current = true; setOpen(false); }
                        }}
                    />
                </div>
            ) : (
                <button
                    type="button"
                    id={id}
                    role="combobox"
                    aria-label={ariaLabel}
                    aria-expanded="false"
                    aria-controls={listId}
                    aria-haspopup="listbox"
                    disabled={disabled}
                    onClick={openAndFocus}
                    onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); openAndFocus(); } }}
                    style={{ colorScheme: "dark" }}
                    className={cn(
                        "flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        className,
                    )}
                >
                    <span className={cn("truncate", !value && "opacity-50")}>{selected || placeholder}</span>
                    <ChevronDown className="size-4 opacity-50 shrink-0" />
                </button>
            )}

            {open && (
                <div id={listId} role="listbox" aria-label={ariaLabel} className="absolute z-50 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] shadow-lg">
                    {loading ? (
                        <div className="px-3 py-2 text-sm text-[var(--zyllen-muted)]">{loadingText}</div>
                    ) : filtered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-[var(--zyllen-muted)]">{emptyText}</div>
                    ) : (
                        filtered.map((o, i) => (
                            <button
                                key={o.value}
                                id={`${listId}-${i}`}
                                role="option"
                                aria-selected={o.value === value}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => choose(o.value)}
                                onMouseEnter={() => setHighlight(i)}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm text-white border-b border-[var(--zyllen-border)]/40 last:border-0",
                                    i === highlight ? "bg-[var(--zyllen-highlight)]/20" : "hover:bg-[var(--zyllen-highlight)]/10",
                                    o.value === value && "text-[var(--zyllen-highlight)]",
                                )}
                            >
                                {o.label}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
