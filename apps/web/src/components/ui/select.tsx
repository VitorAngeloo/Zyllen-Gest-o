import * as React from "react"
import { cn } from "@web/lib/utils"
import { ChevronDown } from "lucide-react"

// Lightweight Select built with native HTML — no radix dependency needed
// This avoids the heavy radix-ui/select bundle while matching the design system

function Select({ children, value, onValueChange, ...props }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
}) {
    return <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>;
}

const SelectContext = React.createContext<{ value?: string; onValueChange?: (v: string) => void }>({});

function SelectNative({
    className,
    value,
    onValueChange,
    children,
    placeholder,
    ...props
}: React.ComponentProps<"select"> & { onValueChange?: (value: string) => void; placeholder?: string }) {
    return (
        <div className="relative">
            <select
                data-slot="select"
                value={value}
                onChange={(e) => onValueChange?.(e.target.value)}
                className={cn(
                    "flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs",
                    "placeholder:text-muted-foreground focus:outline-none focus:ring-[3px] focus:ring-ring/50 focus:border-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50 appearance-none",
                    className
                )}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {children}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 opacity-50 pointer-events-none" />
        </div>
    );
}

function SelectOption({ value, children, ...props }: React.ComponentProps<"option"> & { value: string }) {
    return <option value={value} {...props}>{children}</option>;
}

export { SelectNative as Select, SelectOption }
