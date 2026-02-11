"use client";
import { useAuth } from "@web/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardLayout from "@web/components/dashboard-layout";

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace("/");
        }
    }, [isLoading, user, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--zyllen-bg-dark)]">
                <div className="animate-pulse flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-[var(--zyllen-highlight)] animate-bounce" />
                    <span className="text-white text-lg font-semibold">Carregando...</span>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return <DashboardLayout>{children}</DashboardLayout>;
}
