"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@web/lib/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                {children}
                <Toaster
                    position="top-right"
                    richColors
                    toastOptions={{
                        style: {
                            background: "var(--zyllen-bg-light)",
                            border: "1px solid var(--zyllen-border)",
                            color: "var(--zyllen-white)",
                        },
                    }}
                />
            </AuthProvider>
        </QueryClientProvider>
    );
}
