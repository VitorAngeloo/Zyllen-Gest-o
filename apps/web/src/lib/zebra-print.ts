// ─── Cliente Zebra Browser Print ─────────────────────────────────────────
//
// O Zebra Browser Print é um app gratuito da Zebra que roda no computador onde
// a impressora USB está conectada. Ele expõe uma API HTTP local (porta 9100/9101)
// que permite ao navegador enviar comandos ZPL direto para a impressora — sem
// diálogo de impressão, sem problema de tamanho de página.
//
// Download: https://www.zebra.com/us/en/support-downloads/printer-software/browser-print.html
//
// Como a página roda em HTTPS (skylineti.com) e a API é local, o Chrome permite
// chamadas para 127.0.0.1 (loopback é tratado como contexto seguro).

const BP_HTTP = "http://127.0.0.1:9100";
const BP_HTTPS = "https://127.0.0.1:9101";

const STORAGE_KEY = "zebraPrintUrl";

const stripTrailingSlash = (url: string) => url.trim().replace(/\/+$/, "");

/** URL do Browser Print configurada na tela (salva no navegador). */
export function getZebraPrintUrl(): string {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

/** Salva (ou limpa) a URL do Browser Print no navegador. */
export function setZebraPrintUrl(url: string): void {
    if (typeof window === "undefined") return;
    const clean = stripTrailingSlash(url);
    if (clean) window.localStorage.setItem(STORAGE_KEY, clean);
    else window.localStorage.removeItem(STORAGE_KEY);
}

// Base configurada manualmente: campo da tela tem prioridade, depois a
// variável de ambiente NEXT_PUBLIC_ZEBRA_PRINT_URL (definida no build).
function getConfiguredBase(): string | null {
    const fromUi = getZebraPrintUrl();
    if (fromUi) return stripTrailingSlash(fromUi);
    const fromEnv = process.env.NEXT_PUBLIC_ZEBRA_PRINT_URL;
    if (fromEnv) return stripTrailingSlash(fromEnv);
    return null;
}

// Lista de endpoints a tentar. Se houver uma URL configurada (ex.: túnel do
// tunnelmole), usa só ela. Caso contrário, tenta os endpoints locais — em
// páginas HTTPS o Browser Print só aceita o endpoint HTTPS (9101).
function bpHosts(): string[] {
    const configured = getConfiguredBase();
    if (configured) return [configured];
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    return isHttps ? [BP_HTTPS, BP_HTTP] : [BP_HTTP, BP_HTTPS];
}

export type ZebraDevice = {
    name: string;
    deviceType: string;
    connection: string;
    uid: string;
    provider: string;
    manufacturer?: string;
    version?: number;
};

const withTimeout = (ms: number) => {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    return { signal: ctrl.signal, clear: () => clearTimeout(id) };
};

// Faz fetch tentando cada host do Browser Print em sequência.
async function bpFetch(path: string, init: RequestInit, timeoutMs = 4000): Promise<Response> {
    let lastErr: unknown;
    for (const host of bpHosts()) {
        const t = withTimeout(timeoutMs);
        try {
            const res = await fetch(host + path, { ...init, signal: t.signal });
            t.clear();
            if (res.ok) return res;
            lastErr = new Error(`HTTP ${res.status}`);
        } catch (e) {
            t.clear();
            lastErr = e;
        }
    }
    throw lastErr ?? new Error("Browser Print indisponível");
}

/** Verifica se o Zebra Browser Print está rodando na máquina. */
export async function isBrowserPrintAvailable(): Promise<boolean> {
    try {
        await bpFetch("/available", { method: "GET" }, 2500);
        return true;
    } catch {
        return false;
    }
}

/** Retorna a impressora padrão configurada no Browser Print. */
export async function getDefaultPrinter(): Promise<ZebraDevice> {
    const res = await bpFetch("/default?type=printer", { method: "GET" });
    const text = await res.text();
    try {
        return JSON.parse(text) as ZebraDevice;
    } catch {
        throw new Error("Não foi possível obter a impressora padrão do Browser Print.");
    }
}

/** Envia uma string ZPL para a impressora padrão. */
export async function sendZpl(zpl: string, device?: ZebraDevice): Promise<void> {
    const printer = device ?? (await getDefaultPrinter());
    await bpFetch("/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device: printer, data: zpl }),
    });
}
