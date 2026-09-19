import * as React from "react"
import { Slot } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@web/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-[var(--zyllen-highlight)]/60 focus-visible:ring-[var(--zyllen-highlight)]/20 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer",
    {
        variants: {
            variant: {
                default: "border border-white/10 bg-white/[0.08] text-white hover:bg-white/[0.12]",
                destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
                outline: "border border-white/15 bg-transparent text-white/80 hover:border-white/25 hover:bg-white/[0.05] hover:text-white",
                secondary: "border border-white/10 bg-white/[0.06] text-white/80 hover:bg-white/[0.1] hover:text-white",
                ghost: "text-white/75 hover:bg-white/[0.05] hover:text-white",
                link: "text-primary underline-offset-4 hover:underline",
                highlight: "bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg-dark)] font-semibold hover:brightness-105",
                "highlight-outline": "border border-[var(--zyllen-highlight)] text-[var(--zyllen-highlight)] bg-transparent hover:bg-[var(--zyllen-highlight)]/10 font-medium",
                "highlight-ghost": "text-[var(--zyllen-highlight)] hover:bg-[var(--zyllen-highlight)]/10 font-medium",
            },
            size: {
                default: "h-9 px-4 py-2 has-[>svg]:px-3",
                sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
                lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
                icon: "size-9",
            },
        },
        defaultVariants: { variant: "default", size: "default" },
    }
)

function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
    const Comp = asChild ? Slot.Root : "button"
    return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
