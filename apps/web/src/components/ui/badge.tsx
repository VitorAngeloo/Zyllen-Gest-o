import * as React from "react"
import { cn } from "@web/lib/utils"

function Badge({ className, variant = "default", ...props }: React.ComponentProps<"span"> & { variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }) {
    const variants: Record<string, string> = {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-white",
        outline: "border text-foreground",
        success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    }
    return (
        <span
            data-slot="badge"
            className={cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors", variants[variant], className)}
            {...props}
        />
    )
}

export { Badge }
