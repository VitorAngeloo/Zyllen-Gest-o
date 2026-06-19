// ─── Gerador de ZPL a partir do template ─────────────────────────────────
//
// Gera o ZPL (linguagem nativa da Zebra ZD220 — 203 DPI) percorrendo os
// elementos do template. É a MESMA fonte de dados do preview na tela, então
// o que aparece na tela é o que sai na impressora.

import {
    type LabelTemplate,
    type LabelData,
    type LabelElement,
    resolveElementText,
} from "./label-template";

// Mantido para compatibilidade com chamadas existentes.
export type { LabelData as LabelZplData };

export type PrintOptions = {
    copies?: number;
    offsetXMm?: number; // deslocamento global horizontal (+direita / −esquerda)
    offsetYMm?: number; // deslocamento global vertical (+baixo / −cima)
    logos?: Record<string, string>; // id-do-elemento → comando ^GF pré-renderizado
};

// Converte milímetros em dots conforme o DPI da impressora.
const mmToDots = (mm: number, dpi: number) => Math.round((mm * dpi) / 25.4);

// ^ e ~ são caracteres de controle do ZPL — removidos do texto para não
// corromper o comando.
const sanitize = (s: string) =>
    (s ?? "")
        .replace(/[\^~]/g, " ")
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1f]/g, " ")
        .trim();

// Estima a ampliação do QR a partir do tamanho desejado (mm). O número de
// módulos depende do volume de dados (~45 para o nosso JSON), então é uma
// aproximação; o usuário ajusta o tamanho no editor.
// Capacidade em bytes por versão do QR (índice = versão−1) com correção M.
const QR_BYTE_CAP_M = [
    14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450,
    504, 560, 624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370,
    1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331,
];

// Estima quantos módulos (lado) o QR terá para um certo volume de dados.
// Módulos da versão v = 17 + 4·v (v1 = 21, v2 = 25, …).
const qrModulesForData = (byteLen: number): number => {
    for (let v = 0; v < QR_BYTE_CAP_M.length; v++) {
        if (byteLen <= QR_BYTE_CAP_M[v]) return 17 + 4 * (v + 1);
    }
    return 177; // versão 40
};

// Ampliação que melhor aproxima o QR do tamanho desejado (sizeMm).
// Arredonda para o mais próximo — o preview mostra o tamanho real e corta na
// borda da etiqueta, então dá para ajustar visualmente se passar.
export const qrMagnification = (sizeMm: number, dpi: number, byteLen: number): number => {
    const modules = qrModulesForData(byteLen);
    return Math.max(1, Math.min(10, Math.round(mmToDots(sizeMm, dpi) / modules)));
};

// Tamanho real (mm) que o QR vai ocupar na impressão — usado para o preview
// ser fiel (módulos × ampliação convertidos de dots para mm).
export const qrPrintedSizeMm = (sizeMm: number, dpi: number, byteLen: number): number => {
    const modules = qrModulesForData(byteLen);
    const mag = qrMagnification(sizeMm, dpi, byteLen);
    return (modules * mag * 25.4) / dpi;
};

// Gera o comando ZPL de um único elemento, já com o deslocamento aplicado.
function elementZpl(el: LabelElement, data: LabelData, dpi: number, ox: number, oy: number, logos?: Record<string, string>): string {
    const d = (mm: number) => mmToDots(mm, dpi);
    // Clampa em 0 porque o ZPL não aceita coordenadas negativas.
    const x = Math.max(0, d(el.xMm) + ox);
    const y = Math.max(0, d(el.yMm) + oy);

    switch (el.type) {
        case "qrcode": {
            const qr = sanitize(data.qrContent);
            const mag = qrMagnification(el.sizeMm ?? 17, dpi, qr.length);
            return `^FO${x},${y}^BQN,2,${mag}^FDMA,${qr}^FS`;
        }
        case "barcode": {
            const value = sanitize(data.assetCode);
            const h = d(el.heightMm ?? 8);
            return `^FO${x},${y}^BCN,${h},Y,N,N^FD${value}^FS`;
        }
        case "line": {
            const w = d(el.widthMm ?? 40);
            const th = Math.max(1, d(el.heightMm ?? 0.3));
            return `^FO${x},${y}^GB${w},${th},${th}^FS`;
        }
        case "logo": {
            const gf = logos?.[el.id];
            return gf ? `^FO${x},${y}${gf}` : "";
        }
        default: {
            const text = sanitize(resolveElementText(el, data));
            if (!text) return "";
            const fh = d(el.fontMm ?? 3);
            const block = el.widthMm ? `^FB${d(el.widthMm)},${el.maxLines ?? 1},3,L` : "";
            return `^FO${x},${y}^A0N,${fh},${fh}${block}^FD${text}^FS`;
        }
    }
}

/** Gera o ZPL de UMA etiqueta a partir do template e dos dados do item. */
export function buildLabelZplFromTemplate(
    template: LabelTemplate,
    data: LabelData,
    opts: PrintOptions = {},
): string {
    const dpi = template.dpi || 203;
    const ox = mmToDots(opts.offsetXMm ?? 0, dpi);
    const oy = mmToDots(opts.offsetYMm ?? 0, dpi);
    const pw = mmToDots(template.widthMm, dpi);
    const ll = mmToDots(template.heightMm, dpi);

    const body = template.elements
        .map((el) => elementZpl(el, data, dpi, ox, oy, opts.logos))
        .filter(Boolean)
        .join("\n");

    return [
        "^XA",
        "^CI28", // codificação UTF-8 (acentos)
        `^PW${pw}`,
        `^LL${ll}`,
        "^LH0,0",
        body,
        opts.copies && opts.copies > 1 ? `^PQ${opts.copies}` : "",
        "^XZ",
    ]
        .filter(Boolean)
        .join("\n");
}

/**
 * Gera o ZPL de VÁRIAS etiquetas (lote), respeitando as COLUNAS do template.
 *
 * Em mídia multi-coluna (ex.: rolo 2-across), a impressora trata a linha
 * inteira como uma única etiqueta. Por isso, para cada linha geramos UM bloco
 * ^XA com a largura total (colunas × largura + vãos) e posicionamos cada item
 * deslocado horizontalmente por (largura + espaçamento da coluna).
 */
export function buildBatchZplFromTemplate(
    template: LabelTemplate,
    items: Array<{ data: LabelData; copies?: number }>,
    opts: PrintOptions = {},
): string {
    const dpi = template.dpi || 203;
    const cols = Math.max(1, Math.round(template.columns || 1));
    const colW = template.widthMm;
    const gap = template.gapXMm || 0;

    const pw = mmToDots(cols * colW + (cols - 1) * gap, dpi);
    const ll = mmToDots(template.heightMm, dpi);
    const ox = mmToDots(opts.offsetXMm ?? 0, dpi);
    const oy = mmToDots(opts.offsetYMm ?? 0, dpi);

    // Expande por cópias para uma lista plana de etiquetas.
    const flat: LabelData[] = [];
    for (const it of items) {
        const n = Math.max(1, it.copies ?? 1);
        for (let i = 0; i < n; i++) flat.push(it.data);
    }

    // Agrupa em linhas de `cols` etiquetas → um bloco ^XA por linha.
    const rows: string[] = [];
    for (let i = 0; i < flat.length; i += cols) {
        const group = flat.slice(i, i + cols);
        const body = group
            .flatMap((data, col) => {
                const colOx = ox + mmToDots(col * (colW + gap), dpi);
                return template.elements.map((el) => elementZpl(el, data, dpi, colOx, oy, opts.logos));
            })
            .filter(Boolean)
            .join("\n");
        rows.push(["^XA", "^CI28", `^PW${pw}`, `^LL${ll}`, "^LH0,0", body, "^XZ"].join("\n"));
    }
    return rows.join("\n");
}
