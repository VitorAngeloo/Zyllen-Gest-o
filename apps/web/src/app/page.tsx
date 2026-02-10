"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@web/lib/api-client";

export default function Home() {
  const [apiStatus, setApiStatus] = useState<"loading" | "online" | "offline">(
    "loading"
  );

  useEffect(() => {
    apiClient
      .get<{ status: string }>("/health")
      .then((data) => {
        if (data.status === "ok") {
          setApiStatus("online");
        } else {
          setApiStatus("offline");
        }
      })
      .catch(() => {
        setApiStatus("offline");
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--zyllen-bg)]">
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-[var(--zyllen-highlight)]">Zyllen</span>{" "}
          <span className="text-white">Gestão</span>
        </h1>
        <p className="mt-3 text-[var(--zyllen-muted)] text-lg">
          Sistema de gestão de estoque, patrimônio e chamados
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-[var(--zyllen-bg-light)] border border-[var(--zyllen-border)] rounded-xl p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-6">
          Status do Sistema
        </h2>

        {/* API Status */}
        <div className="flex items-center justify-between py-3 border-b border-[var(--zyllen-border)]">
          <span className="text-[var(--zyllen-muted)]">API Backend</span>
          <div className="flex items-center gap-2">
            {apiStatus === "loading" && (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                <span className="text-yellow-400 text-sm font-medium">
                  Verificando...
                </span>
              </>
            )}
            {apiStatus === "online" && (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--zyllen-success)]" />
                <span className="text-[var(--zyllen-success)] text-sm font-medium">
                  Online
                </span>
              </>
            )}
            {apiStatus === "offline" && (
              <>
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--zyllen-error)]" />
                <span className="text-[var(--zyllen-error)] text-sm font-medium">
                  Offline
                </span>
              </>
            )}
          </div>
        </div>

        {/* Web Status */}
        <div className="flex items-center justify-between py-3">
          <span className="text-[var(--zyllen-muted)]">Web Frontend</span>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--zyllen-success)]" />
            <span className="text-[var(--zyllen-success)] text-sm font-medium">
              Online
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-[var(--zyllen-muted)] text-sm">
        v0.1.0 — Passo 1: Setup e Validação de Vida
      </p>
    </div>
  );
}
