"use client";
import { MonitorPlay, Monitor, MonitorOff, Headset, Wrench, HardHat } from "lucide-react";
import { Card, CardContent } from "@web/components/ui/card";
import type { OsFormType, OsFormTypeConfig } from "./os-form-types";
import { OS_FORM_CONFIG } from "./os-form-types";

const ICON_MAP: Record<string, React.ElementType> = {
    HardHat,
    MonitorPlay,
    Monitor,
    MonitorOff,
    Headset,
    Wrench,
};

interface OsFormTypeSelectorProps {
    availableTypes: OsFormType[];
    selected: OsFormType | null;
    onSelect: (type: OsFormType) => void;
}

export function OsFormTypeSelector({ availableTypes, selected, onSelect }: OsFormTypeSelectorProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableTypes.map((type) => {
                const config: OsFormTypeConfig = OS_FORM_CONFIG[type];
                const Icon = ICON_MAP[config.icon] || Wrench;
                const isSelected = selected === type;

                return (
                    <Card
                        key={type}
                        onClick={() => onSelect(type)}
                        className={`cursor-pointer transition-all border-2 ${
                            isSelected
                                ? "border-[var(--zyllen-highlight)] bg-[var(--zyllen-highlight-dim)]"
                                : "border-[var(--zyllen-border)] bg-[var(--zyllen-bg)] hover:border-[var(--zyllen-highlight)]/30"
                        }`}
                    >
                        <CardContent className="py-4 px-4 flex items-start gap-3">
                            <div
                                className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${
                                    isSelected
                                        ? "bg-[var(--zyllen-highlight)]/20"
                                        : "bg-white/5"
                                }`}
                            >
                                <Icon
                                    size={20}
                                    className={isSelected ? "text-[var(--zyllen-highlight)]" : "text-[var(--zyllen-muted)]"}
                                />
                            </div>
                            <div className="min-w-0">
                                <p className={`text-sm font-medium truncate ${
                                    isSelected ? "text-[var(--zyllen-highlight)]" : "text-white"
                                }`}>
                                    {config.shortLabel}
                                </p>
                                <p className="text-xs text-[var(--zyllen-muted)] mt-0.5 line-clamp-2">
                                    {config.description}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
