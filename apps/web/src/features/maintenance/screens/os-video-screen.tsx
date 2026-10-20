"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@web/features/auth/context/auth-context";
import { LoginPage } from "@web/features/auth/screens/login-screen";
import { apiClient } from "@web/lib/api-client";
import { Button } from "@web/components/ui/button";

function OsVideoContent() {
    const params = useSearchParams();
    const { user, token, isLoading } = useAuth();
    const [ready, setReady] = useState(false);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    const kind = params.get("kind");
    const id = params.get("id");
    const valid = (kind === "maintenance" || kind === "os-followup") && !!id && /^[a-zA-Z0-9_-]{1,128}$/.test(id);

    useEffect(() => {
        setReady(false);
        setError("");
        if (!user || !token || !valid) return;
        let active = true;
        // Reestablish the private media cookie before the browser requests the video.
        apiClient.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } })
            .then(() => { if (active) setReady(true); })
            .catch(() => { if (active) setError("Não foi possível preparar o vídeo. Tente novamente."); });
        return () => { active = false; };
    }, [user, token, valid, attempt]);

    if (!valid) return <main className="p-8">Link de vídeo inválido.</main>;
    if (isLoading) return <main className="p-8">Carregando…</main>;
    if (!user) return <LoginPage stayOnPage />;

    const source = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/media/${kind}/${encodeURIComponent(id!)}/file`;
    return (
        <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-4 p-6">
            <h1 className="text-xl font-semibold">Vídeo da ordem de serviço</h1>
            {error ? <>
                <p role="alert">{error}</p>
                <Button onClick={() => setAttempt(value => value + 1)}>Tentar novamente</Button>
            </> : ready ? <video key={`${source}-${attempt}`} src={source} controls playsInline preload="metadata"
                className="max-h-[75vh] w-full rounded-lg bg-black"
                onError={() => setError("Não foi possível abrir o vídeo. Confira se sua conta tem acesso à OS e se este navegador suporta o formato do arquivo.")} />
                : <p>Preparando vídeo…</p>}
        </main>
    );
}

export default function OsVideoScreen() {
    return <Suspense fallback={<main className="p-8">Carregando…</main>}><OsVideoContent /></Suspense>;
}
