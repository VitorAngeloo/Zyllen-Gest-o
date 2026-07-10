"use client";

import { useEffect, useState } from "react";
import { ESTADOS_BR } from "@web/lib/brasil-data";
import { Select, SelectOption } from "@web/components/ui/select";
import { SearchableSelect } from "@web/components/ui/searchable-select";
import { Label } from "@web/components/ui/label";

// Municípios completos por UF, direto do IBGE
const IBGE_API = "https://servicodados.ibge.gov.br/api/v1/localidades/estados";

interface StateCitySelectorProps {
    state: string;
    city: string;
    onStateChange: (uf: string) => void;
    onCityChange: (city: string) => void;
    className?: string;
    required?: boolean;
}

export function StateCitySelector({
    state,
    city,
    onStateChange,
    onCityChange,
    className = "",
    required = false,
}: StateCitySelectorProps) {
    const [cities, setCities] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Busca todos os municípios do estado selecionado
    useEffect(() => {
        if (!state) { setCities([]); return; }
        let active = true;
        setLoading(true);
        fetch(`${IBGE_API}/${state}/municipios?orderBy=nome`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("IBGE"))))
            .then((data: { nome: string }[]) => { if (active) setCities(data.map((c) => c.nome)); })
            .catch(() => { if (active) setCities([]); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [state]);

    return (
        <div className={`grid grid-cols-2 gap-3 ${className}`}>
            <div className="space-y-2">
                <Label className="text-[var(--zyllen-muted)]">Estado</Label>
                <Select
                    value={state}
                    onValueChange={onStateChange}
                    placeholder="Selecione o estado..."
                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                    required={required}
                >
                    {ESTADOS_BR.map((e) => (
                        <SelectOption key={e.uf} value={e.uf}>
                            {e.uf} - {e.nome}
                        </SelectOption>
                    ))}
                </Select>
            </div>
            <div className="space-y-2">
                <Label className="text-[var(--zyllen-muted)]">Cidade</Label>
                <SearchableSelect
                    value={city}
                    onValueChange={onCityChange}
                    options={cities}
                    disabled={!state}
                    loading={loading}
                    placeholder={state ? "Selecione a cidade..." : "Selecione o estado primeiro"}
                    emptyText={state ? "Nenhuma cidade encontrada" : "Selecione o estado primeiro"}
                    loadingText="Carregando cidades..."
                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                />
            </div>
        </div>
    );
}
