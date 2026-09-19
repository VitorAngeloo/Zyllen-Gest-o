"use client"
import * as React from "react"
import { cn } from "@web/lib/utils"

interface TabsProps {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
    className?: string;
}

const TabsContext = React.createContext<{ value: string; onValueChange: (v: string) => void }>({ value: "", onValueChange: () => {} });

function Tabs({ value, onValueChange, children, className }: TabsProps) {
    return (
        <TabsContext.Provider value={{ value, onValueChange }}>
            <div data-slot="tabs" className={cn("space-y-4", className)}>{children}</div>
        </TabsContext.Provider>
    );
}

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="tabs-list"
            className={cn(
                "inline-flex items-center gap-1 border-b border-white/10",
                className
            )}
            {...props}
        />
    );
}

function TabsTrigger({ className, value, children, ...props }: React.ComponentProps<"button"> & { value: string }) {
    const ctx = React.useContext(TabsContext);
    const active = ctx.value === value;
    return (
        <button
            data-slot="tabs-trigger"
            data-state={active ? "active" : "inactive"}
            onClick={() => ctx.onValueChange(value)}
            className={cn(
                "-mb-px inline-flex items-center justify-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                    ? "border-[var(--zyllen-highlight)] text-white"
                    : "border-transparent text-[var(--zyllen-muted)] hover:border-white/20 hover:text-white",
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}

function TabsContent({ className, value, children, ...props }: React.ComponentProps<"div"> & { value: string }) {
    const ctx = React.useContext(TabsContext);
    if (ctx.value !== value) return null;
    return (
        <div
            data-slot="tabs-content"
            className={cn("animate-in fade-in-0 slide-in-from-bottom-1", className)}
            {...props}
        >
            {children}
        </div>
    );
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
