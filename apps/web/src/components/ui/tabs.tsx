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
                "inline-flex items-center gap-1 rounded-md p-1 bg-[var(--zyllen-bg)] border border-[var(--zyllen-border)]",
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
                "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-4 py-2 text-sm font-medium transition-all",
                active
                    ? "bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg-dark)] shadow-sm"
                    : "text-[var(--zyllen-muted)] hover:text-white",
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
