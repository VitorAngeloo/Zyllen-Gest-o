// ─── Gerador de ZPL para etiquetas Zebra (ZD220 — 203 DPI) ───────────────
//
// Gera o código ZPL (Zebra Programming Language) nativo da impressora a partir
// dos dados do patrimônio. Enviado direto para a ZD220 via Zebra Browser Print,
// sem passar pelo diálogo de impressão do navegador.

export type LabelZplData = {
    assetCode: string;
    skuName: string;
    skuCode: string;
    qrContent: string;
};

export type LabelZplOptions = {
    widthMm?: number;   // largura da etiqueta em mm (padrão 50)
    heightMm?: number;  // altura da etiqueta em mm (padrão 30)
    dpi?: number;       // resolução da impressora (ZD220 = 203)
    qrMagnification?: number; // ampliação do QR (1–10, padrão 3)
    copies?: number;    // cópias por etiqueta (padrão 1)
    offsetXMm?: number; // deslocamento horizontal (mm; +direita / −esquerda)
    offsetYMm?: number; // deslocamento vertical (mm; +baixo / −cima)
};

const DEFAULTS = {
    widthMm: 50,
    heightMm: 30,
    dpi: 203,
    qrMagnification: 3,
    copies: 1,
    offsetXMm: 0,
    offsetYMm: 0,
};

// Converte milímetros em dots conforme o DPI da impressora.
const mmToDots = (mm: number, dpi: number) => Math.round((mm * dpi) / 25.4);

// ^ e ~ são caracteres de controle do ZPL — precisam ser removidos do texto
// para não corromper o comando. Também remove caracteres de controle.
const sanitize = (s: string) =>
    (s ?? "")
        .replace(/[\^~]/g, " ")
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1f]/g, " ")
        .trim();

/**
 * Gera o ZPL de UMA etiqueta.
 *
 * Layout (50×30mm):
 *   SKYLINE                    ← cabeçalho
 *   ────────────────────────
 *   ┌──────┐  ASSET-CODE       ← código do patrimônio (grande)
 *   │  QR  │  Nome do item     ← nome do SKU (com quebra de linha)
 *   └──────┘  SKU CÓDIGO       ← código do SKU
 */
export function buildLabelZpl(data: LabelZplData, options: LabelZplOptions = {}): string {
    const opt = { ...DEFAULTS, ...options };
    const dpi = opt.dpi;
    const d = (mm: number) => mmToDots(mm, dpi);

    const pw = d(opt.widthMm);
    const ll = d(opt.heightMm);

    // Deslocamento aplicado a todos os elementos (calibragem fina de posição).
    const ox = d(opt.offsetXMm);
    const oy = d(opt.offsetYMm);
    // Coordenada de origem (^FO) de um elemento, em mm, já com deslocamento.
    // Clampa em 0 porque o ZPL não aceita coordenadas negativas.
    const at = (xMm: number, yMm: number) =>
        `${Math.max(0, d(xMm) + ox)},${Math.max(0, d(yMm) + oy)}`;

    const headerH = d(3.2);
    const lineW = d(opt.widthMm - 4);
    const codeH = d(4.2);
    const nameH = d(3);
    const nameBlockW = d(opt.widthMm - 21);
    const skuH = d(2.6);

    const assetCode = sanitize(data.assetCode);
    const skuName = sanitize(data.skuName);
    const skuCode = sanitize(data.skuCode);
    // O conteúdo do QR é JSON — não contém ^ nem ~, mas sanitizamos por segurança.
    const qr = sanitize(data.qrContent);

    return [
        "^XA",
        "^CI28", // codificação UTF-8 (acentos)
        `^PW${pw}`,
        `^LL${ll}`,
        "^LH0,0",
        `^FO${at(2, 1.2)}^A0N,${headerH},${headerH}^FDSKYLINE^FS`,
        `^FO${at(2, 5.6)}^GB${lineW},2,2^FS`,
        `^FO${at(1.5, 6.8)}^BQN,2,${opt.qrMagnification}^FDMA,${qr}^FS`,
        `^FO${at(20, 7)}^A0N,${codeH},${codeH}^FD${assetCode}^FS`,
        `^FO${at(20, 12.5)}^A0N,${nameH},${nameH}^FB${nameBlockW},2,3,L^FD${skuName}^FS`,
        `^FO${at(20, 22)}^A0N,${skuH},${skuH}^FDSKU ${skuCode}^FS`,
        opt.copies > 1 ? `^PQ${opt.copies}` : "",
        "^XZ",
    ]
        .filter(Boolean)
        .join("\n");
}

/**
 * Gera o ZPL de VÁRIAS etiquetas concatenadas (impressão em lote).
 * Cada etiqueta é um bloco ^XA…^XZ independente.
 */
export function buildBatchZpl(labels: LabelZplData[], options: LabelZplOptions = {}): string {
    return labels.map((l) => buildLabelZpl(l, options)).join("\n");
}
