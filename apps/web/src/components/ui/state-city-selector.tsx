"use client";

import { ESTADOS_BR, getCidadesPorEstado } from "@web/lib/brasil-data";
import { Select, SelectOption } from "@web/components/ui/select";
import { Label } from "@web/components/ui/label";

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
    const cidades = state ? getCidadesPorEstado(state) : [];

    const handleStateChange = (uf: string) => {
        onStateChange(uf);
        // city reset is handled by the parent in onStateChange
    };

    return (
        <div className={`grid grid-cols-2 gap-3 ${className}`}>
            <div className="space-y-2">
                <Label className="text-[var(--zyllen-muted)]">Estado</Label>
                <Select
                    value={state}
                    onValueChange={handleStateChange}
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
                <Select
                    value={city}
                    onValueChange={onCityChange}
                    placeholder={state ? "Selecione a cidade..." : "Selecione o estado primeiro"}
                    className="bg-[var(--zyllen-bg-dark)] border-[var(--zyllen-border)] text-white"
                    required={required}
                    disabled={!state}
                >
                    {cidades.map((c) => (
                        <SelectOption key={c} value={c}>
                            {c}
                        </SelectOption>
                    ))}
                </Select>
            </div>
        </div>
    );
}
