import * as React from "react"
import { cn } from "@web/lib/utils"

function Badge({ className, variant = "default", ...props }: React.ComponentProps<"span"> & { variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "neon" }) {
    const variants: Record<string, string> = {
        default: "border-white/10 bg-white/[0.08] text-white",
        secondary: "border-white/10 bg-white/[0.06] text-white/75",
        destructive: "bg-destructive text-white",
        outline: "border-white/15 bg-transparent text-white/75",
        success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
        neon: "bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)] border-[var(--zyllen-highlight)]/20",
    }
    return (
        <span
            data-slot="badge"
            className={cn("inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium transition-colors", variants[variant], className)}
            {...props}
        />
    )
}

export { Badge }
