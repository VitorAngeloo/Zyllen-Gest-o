"use client"
import * as React from "react"
import { cn } from "@web/lib/utils"
import { X } from "lucide-react"

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in-0"
                onClick={() => onOpenChange(false)}
            />
            {/* Content wrapper */}
            <div className="fixed inset-0 flex items-center justify-center p-4">
                {children}
            </div>
        </div>
    );
}

function DialogContent({
    className,
    children,
    onClose,
    ...props
}: React.ComponentProps<"div"> & { onClose?: () => void }) {
    return (
        <div
            data-slot="dialog-content"
            className={cn(
                "relative z-50 w-full max-w-lg rounded-xl border bg-[var(--zyllen-bg)] shadow-2xl",
                "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2",
                "max-h-[85vh] overflow-y-auto",
                className
            )}
            onClick={(e) => e.stopPropagation()}
            {...props}
        >
            {children}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-[var(--zyllen-muted)]"
                >
                    <X className="size-4" />
                    <span className="sr-only">Fechar</span>
                </button>
            )}
        </div>
    );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog-header"
            className={cn("flex flex-col gap-1.5 p-6 pb-0", className)}
            {...props}
        />
    );
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
    return (
        <h2
            data-slot="dialog-title"
            className={cn("text-lg font-semibold leading-none text-white", className)}
            {...props}
        />
    );
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
    return (
        <p
            data-slot="dialog-description"
            className={cn("text-sm text-[var(--zyllen-muted)]", className)}
            {...props}
        />
    );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog-footer"
            className={cn("flex justify-end gap-2 p-6 pt-4", className)}
            {...props}
        />
    );
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="dialog-body"
            className={cn("p-6", className)}
            {...props}
        />
    );
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody }
