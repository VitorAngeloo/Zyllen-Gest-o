import * as React from "react"
import { cn } from "@web/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(
                "file:text-foreground placeholder:text-white/35 selection:bg-[var(--zyllen-highlight)] selection:text-[var(--zyllen-bg-dark)]",
                "flex h-9 w-full min-w-0 rounded-md border border-white/15 bg-white/[0.025] px-3 py-1 text-base text-white transition-[color,background-color,border-color,box-shadow] outline-none hover:border-white/25",
                "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
                "disabled:pointer-events-none disabled:opacity-50 md:text-sm",
                "focus-visible:border-[var(--zyllen-highlight)]/60 focus-visible:ring-[var(--zyllen-highlight)]/15 focus-visible:ring-[3px]",
                "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
                className
            )}
            {...props}
        />
    )
}

export { Input }
