// ─── QR Code como bitmap ZPL (^GF) ───────────────────────────────────────
//
// O comando nativo de QR do ZPL (^BQ) ancora o símbolo num ponto diferente
// do ^FO usado pelos outros elementos, fazendo o QR sair fora do lugar.
// Para posicionar igual aos demais, geramos a matriz do QR e a desenhamos
// como um campo gráfico ^GF (que respeita o ^FO, como o logo).

import QRCodeLib from "qrcode";

const mmToDots = (mm: number, dpi: number) => Math.round((mm * dpi) / 25.4);

type Matrix = { size: number; data: Uint8Array };
const matrixCache = new Map<string, Matrix>();

/**
 * Matriz de módulos do QR (mesma usada na impressão ^GF). O preview desenha a
 * partir daqui para ficar IDÊNTICO ao impresso. `data[my*size+mx]` verdadeiro =
 * módulo escuro.
 */
export function getQrMatrix(data: string): { size: number; data: Uint8Array } {
    return getMatrix(data);
}

// Gera (e memoiza) a matriz de módulos do QR para um conteúdo.
function getMatrix(data: string): Matrix {
    let m = matrixCache.get(data);
    if (!m) {
        const qr = QRCodeLib.create(data || " ", { errorCorrectionLevel: "M" });
        m = { size: qr.modules.size, data: qr.modules.data as unknown as Uint8Array };
        matrixCache.set(data, m);
    }
    return m;
}

// Ampliação (dots por módulo) que melhor aproxima o tamanho desejado.
export function qrMagForSize(data: string, sizeMm: number, dpi: number): number {
    const { size } = getMatrix(data);
    return Math.max(1, Math.min(10, Math.round(mmToDots(sizeMm, dpi) / size)));
}

// Tamanho real (mm) que o QR vai ocupar — para o preview ser fiel.
export function qrPrintedSizeMm(data: string, sizeMm: number, dpi: number): number {
    const { size } = getMatrix(data);
    return (size * qrMagForSize(data, sizeMm, dpi) * 25.4) / dpi;
}

// Gera o comando ^GFA (bitmap 1-bit) do QR no tamanho pedido.
export function qrToZplGf(data: string, sizeMm: number, dpi: number): string {
    const { size, data: bits } = getMatrix(data);
    const mag = qrMagForSize(data, sizeMm, dpi);
    const widthDots = size * mag;
    const rowBytes = Math.ceil(widthDots / 8);
    const bytes = new Uint8Array(rowBytes * widthDots);

    for (let my = 0; my < size; my++) {
        for (let mx = 0; mx < size; mx++) {
            if (!bits[my * size + mx]) continue; // módulo claro
            for (let dy = 0; dy < mag; dy++) {
                const rowStart = (my * mag + dy) * rowBytes;
                for (let dx = 0; dx < mag; dx++) {
                    const xx = mx * mag + dx;
                    bytes[rowStart + (xx >> 3)] |= 0x80 >> (xx & 7);
                }
            }
        }
    }

    let hex = "";
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
    const total = rowBytes * widthDots;
    return `^GFA,${total},${total},${rowBytes},${hex.toUpperCase()}^FS`;
}
