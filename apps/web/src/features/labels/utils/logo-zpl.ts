// ─── Rasterização de imagem para ZPL (^GF) ───────────────────────────────
//
// O ZPL não entende SVG/PNG: imagens precisam virar um bitmap 1-bit
// (preto/branco) embutido no comando ^GF. Aqui rasterizamos a imagem num
// canvas no tamanho-alvo (em dots) e geramos o ^GFA hexadecimal.

const mmToDots = (mm: number, dpi: number) => Math.round((mm * dpi) / 25.4);

// Cache por chave (src + altura em dots) para não re-rasterizar a cada impressão.
const cache = new Map<string, string>();

// Carrega a imagem (mesma origem) e devolve o elemento já decodificado.
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Rasteriza uma imagem para um comando ZPL `^GFA,...^FS` (sem o `^FO`).
 * Pixels escuros viram "tinta" (bit 1). Retorna string vazia em caso de erro.
 */
export async function imageToZplGf(src: string, heightMm: number, dpi: number): Promise<string> {
    const hDots = Math.max(1, mmToDots(heightMm, dpi));
    const key = `${src}@${hDots}`;
    const cached = cache.get(key);
    if (cached != null) return cached;

    try {
        const img = await loadImage(src);
        const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 4;
        const wDots = Math.max(1, Math.round(hDots * ratio));

        const canvas = document.createElement("canvas");
        canvas.width = wDots;
        canvas.height = hDots;
        const ctx = canvas.getContext("2d");
        if (!ctx) return "";
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, wDots, hDots);
        ctx.drawImage(img, 0, 0, wDots, hDots);

        const { data } = ctx.getImageData(0, 0, wDots, hDots);
        const rowBytes = Math.ceil(wDots / 8);
        const bytes = new Uint8Array(rowBytes * hDots);
        for (let y = 0; y < hDots; y++) {
            for (let x = 0; x < wDots; x++) {
                const i = (y * wDots + x) * 4;
                const a = data[i + 3];
                // Transparente = branco; senão usa luminância.
                const lum = a < 128 ? 255 : 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                if (lum < 128) bytes[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
            }
        }

        let hex = "";
        for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
        const total = rowBytes * hDots;
        const cmd = `^GFA,${total},${total},${rowBytes},${hex.toUpperCase()}^FS`;
        cache.set(key, cmd);
        return cmd;
    } catch {
        return "";
    }
}

import type { LabelTemplate } from "./label-template";

const LOGO_SRC = "/brand/logo-skyline-black.svg";

/**
 * Pré-renderiza todos os elementos de logo de um template, devolvendo um
 * mapa id-do-elemento → comando ^GF pronto para o ZPL.
 */
export async function prepareTemplateLogos(template: LabelTemplate): Promise<Record<string, string>> {
    const dpi = template.dpi || 203;
    const logos: Record<string, string> = {};
    for (const el of template.elements) {
        if (el.type !== "logo") continue;
        const gf = await imageToZplGf(LOGO_SRC, el.heightMm ?? 4, dpi);
        if (gf) logos[el.id] = gf;
    }
    return logos;
}
