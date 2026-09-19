"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Save, ToggleLeft, ToggleRight } from "lucide-react";
import type { Installer } from "../types/schedule.types";
import { DEFAULT_COLOR } from "../schedule.constants";

export interface InstallerCardProps {
    installer: Installer;
    canManage: boolean;
    onSave: (id: string, color: string, active: boolean) => void;
    isSaving: boolean;
}

export function InstallerCard({ installer, canManage, onSave, isSaving }: InstallerCardProps) {
    const [color, setColor] = useState(installer.agendaColor ?? DEFAULT_COLOR);
    const [active, setActive] = useState(installer.agendaActive ?? false);
    const [dirty, setDirty] = useState(false);

    // Sync when server data changes (e.g. after save)
    useEffect(() => {
        setColor(installer.agendaColor ?? DEFAULT_COLOR);
        setActive(installer.agendaActive ?? false);
        setDirty(false);
    }, [installer.agendaColor, installer.agendaActive]);

    function handleColorChange(val: string) {
        setColor(val);
        setDirty(true);
    }

    function handleToggle() {
        if (!canManage) return;
        setActive((prev) => !prev);
        setDirty(true);
    }

    return (
        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] relative">
            {dirty && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[var(--zyllen-highlight)] animate-pulse" />
            )}
            <CardContent className="p-4 space-y-4">
                {/* Header row */}
                <div className="flex items-center gap-3">
                    {/* Color swatch */}
                    <div
                        className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-white/10"
                        style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0">
                        <p className="text-white font-medium truncate">{installer.name}</p>
                        <p className="text-[var(--zyllen-muted)] text-xs truncate">{installer.email}</p>
                        {installer.sector && (
                            <p className="text-[var(--zyllen-muted)] text-xs">{installer.sector}</p>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                    {/* Color picker */}
                    {canManage && (
                        <div className="flex items-center gap-2">
                            <label className="text-[var(--zyllen-muted)] text-xs whitespace-nowrap">Cor</label>
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => handleColorChange(e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer border border-[var(--zyllen-border)] bg-transparent"
                                title="Cor na agenda"
                            />
                        </div>
                    )}

                    {/* Active toggle */}
                    <button
                        onClick={handleToggle}
                        disabled={!canManage}
                        className="flex items-center gap-1.5 ml-auto"
                        title={active ? "Visível na agenda" : "Oculto na agenda"}
                    >
                        {active ? (
                            <ToggleRight className="w-6 h-6 text-[var(--zyllen-highlight)]" />
                        ) : (
                            <ToggleLeft className="w-6 h-6 text-[var(--zyllen-muted)]" />
                        )}
                        <span className={`text-xs ${active ? "text-[var(--zyllen-highlight)]" : "text-[var(--zyllen-muted)]"}`}>
                            {active ? "Ativo" : "Oculto"}
                        </span>
                    </button>
                </div>

                {/* Save button */}
                {canManage && dirty && (
                    <Button
                        size="sm"
                        className="w-full bg-[var(--zyllen-highlight)] hover:bg-[var(--zyllen-highlight)]/80 text-white"
                        onClick={() => onSave(installer.id, color, active)}
                        disabled={isSaving}
                    >
                        <Save className="w-3.5 h-3.5 mr-1.5" />
                        {isSaving ? "Salvando…" : "Salvar"}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
