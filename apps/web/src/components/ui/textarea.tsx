import * as React from "react"
import { cn } from "@web/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(
                "flex min-h-[80px] w-full rounded-md border border-white/15 bg-white/[0.025] px-3 py-2 text-sm text-white transition-[color,background-color,border-color,box-shadow] outline-none hover:border-white/25",
                "placeholder:text-white/35",
                "focus-visible:border-[var(--zyllen-highlight)]/60 focus-visible:ring-[var(--zyllen-highlight)]/15 focus-visible:ring-[3px]",
                "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
                "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                className
            )}
            {...props}
        />
    )
}

export { Textarea }
