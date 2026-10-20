"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function SharedOsVideoContent() {
    const params = useSearchParams();
    const token = params.get("token");
    const [error, setError] = useState(false);

    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
        return <main className="p-8">Link de vídeo inválido.</main>;
    }

    const source = new URL(`/media/shared/${token}`, API_BASE).href;
    return (
        <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center gap-4 p-6">
            <h1 className="text-xl font-semibold">Vídeo da ordem de serviço</h1>
            {error ? (
                <p role="alert">Não foi possível carregar o vídeo. O link pode ter expirado ou o formato pode não ser compatível com este aparelho.</p>
            ) : (
                <video src={source} controls playsInline preload="metadata"
                    className="max-h-[75vh] w-full rounded-lg bg-black"
                    onError={() => setError(true)}>
                    Seu navegador não oferece reprodução de vídeo.
                </video>
            )}
        </main>
    );
}

export default function SharedOsVideoScreen() {
    return <Suspense fallback={<main className="p-8">Carregando…</main>}><SharedOsVideoContent /></Suspense>;
}
