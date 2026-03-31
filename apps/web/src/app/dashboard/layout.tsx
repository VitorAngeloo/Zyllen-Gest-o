"use client";
import { useState } from "react";
import { useAuth, useAuthedFetch } from "@web/lib/auth-context";
import { apiClient } from "@web/lib/api-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardLayout from "@web/components/dashboard-layout";
import { Lock, X } from "lucide-react";
import { toast } from "sonner";

function PinSetupModal() {
    const { clearNeedsPin, token } = useAuth();
    const fetchOpts = useAuthedFetch();
    const [pin, setPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"enter" | "confirm">("enter");

    const handleSubmit = async () => {
        if (pin !== confirmPin) {
            toast.error("Os PINs não coincidem");
            setConfirmPin("");
            setStep("enter");
            return;
        }
        setLoading(true);
        try {
            await apiClient.post("/auth/setup-pin", { pin }, fetchOpts);
            toast.success("PIN definido com sucesso!");
            clearNeedsPin();
        } catch (err: any) {
            toast.error(err.message || "Erro ao definir PIN");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[var(--zyllen-bg)] border border-[var(--zyllen-border)] rounded-xl p-6 w-full max-w-sm space-y-4 shadow-lg">
                <div className="flex items-center gap-2">
                    <Lock size={20} className="text-[var(--zyllen-highlight)]" />
                    <h3 className="text-white font-medium text-lg">Defina seu PIN</h3>
                </div>
                <p className="text-sm text-[var(--zyllen-muted)]">
                    Crie um PIN de 4 dígitos para confirmar operações importantes. 
                    <strong className="text-[var(--zyllen-highlight)]"> O PIN não poderá ser alterado depois.</strong>
                </p>
                {step === "enter" ? (
                    <div className="space-y-3">
                        <label className="text-sm text-[var(--zyllen-muted)]">Digite um PIN de 4 dígitos</label>
                        <input
                            type="password" maxLength={4} inputMode="numeric" pattern="[0-9]*"
                            placeholder="••••" value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                            className="w-full h-12 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter" && pin.length === 4) setStep("confirm"); }}
                        />
                        <button
                            disabled={pin.length !== 4}
                            onClick={() => setStep("confirm")}
                            className="w-full h-10 rounded-md bg-[var(--zyllen-highlight)] text-white font-medium text-sm disabled:opacity-40 transition-opacity"
                        >
                            Continuar
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <label className="text-sm text-[var(--zyllen-muted)]">Confirme o PIN</label>
                        <input
                            type="password" maxLength={4} inputMode="numeric" pattern="[0-9]*"
                            placeholder="••••" value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                            className="w-full h-12 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter" && confirmPin.length === 4) handleSubmit(); }}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setStep("enter"); setConfirmPin(""); }}
                                className="flex-1 h-10 rounded-md border border-[var(--zyllen-border)] text-[var(--zyllen-muted)] text-sm hover:text-white transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                disabled={confirmPin.length !== 4 || loading}
                                onClick={handleSubmit}
                                className="flex-1 h-10 rounded-md bg-[var(--zyllen-highlight)] text-white font-medium text-sm disabled:opacity-40 transition-opacity"
                            >
                                {loading ? "Salvando..." : "Confirmar PIN"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user, isLoading, needsPin } = useAuth();
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

    return (
        <DashboardLayout>
            {needsPin && <PinSetupModal />}
            {children}
        </DashboardLayout>
    );
}
