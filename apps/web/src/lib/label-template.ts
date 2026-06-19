// ─── Modelo de dados do template de etiqueta ─────────────────────────────
//
// Fonte ÚNICA de verdade do layout da etiqueta. Tanto o preview na tela
// quanto o ZPL enviado para a impressora são gerados a partir deste modelo.
// Cada elemento tem posição (xMm/yMm) e tamanho próprios — não há mais
// posições fixas no código, o que elimina sobreposição e mantém o preview
// fiel à impressão real.

export type LabelElementType =
    | "text"        // texto fixo (digitado pelo usuário)
    | "itemName"    // nome do item (SKU)
    | "assetCode"   // código do patrimônio
    | "sku"         // código do SKU
    | "location"    // local atual
    | "date"        // data de impressão
    | "barcode"     // código de barras (Code 128)
    | "qrcode"      // QR Code
    | "logo"        // logo da empresa (Fase 4 — bitmap)
    | "line";       // linha divisória

export interface LabelElement {
    id: string;
    type: LabelElementType;
    xMm: number;
    yMm: number;
    // Texto
    text?: string;      // conteúdo do texto fixo ou prefixo (ex.: "SKU ")
    fontMm?: number;    // altura da fonte em mm
    widthMm?: number;   // largura do bloco (quebra de linha) / comprimento (linha, barras)
    maxLines?: number;  // máximo de linhas para quebra de texto
    // QR Code
    sizeMm?: number;    // lado do QR em mm
    // Barras / linha / logo
    heightMm?: number;  // altura em mm
}

export interface LabelTemplate {
    id?: string;
    name: string;
    description?: string;
    widthMm: number;
    heightMm: number;
    columns: number;
    gapXMm: number;
    gapYMm: number;
    marginTopMm: number;
    marginLeftMm: number;
    dpi: number;
    offsetXMm?: number; // calibragem de impressão (+direita / −esquerda)
    offsetYMm?: number; // calibragem de impressão (+baixo / −cima)
    elements: LabelElement[];
}

// Dados de um item, usados para preencher os campos dinâmicos do template.
export interface LabelData {
    assetCode: string;
    skuName: string;
    skuCode: string;
    qrContent: string;
    location?: string;
    date?: string;
}

// Resolve o texto a exibir/imprimir de um elemento, conforme os dados do item.
export function resolveElementText(el: LabelElement, data: LabelData): string {
    switch (el.type) {
        case "text": return el.text ?? "";
        case "itemName": return data.skuName ?? "";
        case "assetCode": return data.assetCode ?? "";
        case "sku": return `${el.text ?? "SKU "}${data.skuCode ?? ""}`;
        case "location": return data.location ?? "";
        case "date": return data.date ?? new Date().toLocaleDateString("pt-BR");
        default: return "";
    }
}

// Template padrão (equivale ao layout 50×30 atual de patrimônio), agora
// expresso como elementos posicionáveis individualmente.
export const DEFAULT_TEMPLATE: LabelTemplate = {
    name: "Padrão 50×30",
    description: "Patrimônio com QR, código, nome e SKU",
    widthMm: 50,
    heightMm: 30,
    columns: 1,
    gapXMm: 2,
    gapYMm: 0,
    marginTopMm: 1.5,
    marginLeftMm: 1.5,
    dpi: 203,
    offsetXMm: 0,
    offsetYMm: 0,
    elements: [
        { id: "header", type: "text", text: "SKYLINE", xMm: 2, yMm: 1.2, fontMm: 3.2 },
        { id: "divider", type: "line", xMm: 2, yMm: 5.6, widthMm: 46, heightMm: 0.3 },
        { id: "qr", type: "qrcode", xMm: 1.5, yMm: 6.8, sizeMm: 17 },
        { id: "asset", type: "assetCode", xMm: 20, yMm: 7, fontMm: 4.2 },
        { id: "name", type: "itemName", xMm: 20, yMm: 12.5, fontMm: 3, widthMm: 28, maxLines: 2 },
        { id: "sku", type: "sku", text: "SKU ", xMm: 20, yMm: 22, fontMm: 2.6 },
    ],
};

// Cria um identificador curto para novos elementos no editor.
export function newElementId(): string {
    return `el_${Math.random().toString(36).slice(2, 8)}`;
}

// Tipos de elemento disponíveis no editor, com rótulo amigável.
export const ELEMENT_TYPES: { type: LabelElementType; label: string }[] = [
    { type: "text", label: "Texto fixo" },
    { type: "itemName", label: "Nome do item" },
    { type: "assetCode", label: "Código do patrimônio" },
    { type: "sku", label: "Código SKU" },
    { type: "location", label: "Local" },
    { type: "date", label: "Data" },
    { type: "qrcode", label: "QR Code" },
    { type: "barcode", label: "Código de barras" },
    { type: "line", label: "Linha divisória" },
    { type: "logo", label: "Logo" },
];

export const ELEMENT_LABEL: Record<LabelElementType, string> =
    Object.fromEntries(ELEMENT_TYPES.map((e) => [e.type, e.label])) as Record<LabelElementType, string>;

// Cria um novo elemento do tipo informado, com valores padrão sensatos.
export function newElement(type: LabelElementType): LabelElement {
    const base: LabelElement = { id: newElementId(), type, xMm: 5, yMm: 5 };
    switch (type) {
        case "text": return { ...base, text: "Texto", fontMm: 3 };
        case "itemName": return { ...base, fontMm: 3, widthMm: 28, maxLines: 2 };
        case "assetCode": return { ...base, fontMm: 4 };
        case "sku": return { ...base, text: "SKU ", fontMm: 2.6 };
        case "location": return { ...base, fontMm: 2.6 };
        case "date": return { ...base, fontMm: 2.6 };
        case "qrcode": return { ...base, sizeMm: 17 };
        case "barcode": return { ...base, widthMm: 30, heightMm: 10 };
        case "line": return { ...base, widthMm: 40, heightMm: 0.3 };
        case "logo": return { ...base, heightMm: 4 };
        default: return base;
    }
}

// Template em branco para "Novo template".
export function blankTemplate(): LabelTemplate {
    return {
        name: "Novo template",
        description: "",
        widthMm: 50,
        heightMm: 30,
        columns: 1,
        gapXMm: 2,
        gapYMm: 0,
        marginTopMm: 1.5,
        marginLeftMm: 1.5,
        dpi: 203,
        offsetXMm: 0,
        offsetYMm: 0,
        elements: [],
    };
}

// Serializa o template para JSON (salvo no campo `layout` do backend).
export function serializeTemplate(t: LabelTemplate): string {
    return JSON.stringify(t);
}

// Lê o JSON do `layout`. Retorna null se for um formato legado/ inválido
// (templates antigos sem `elements`).
export function parseTemplate(layout: string): LabelTemplate | null {
    try {
        const obj = JSON.parse(layout);
        if (!obj || !Array.isArray(obj.elements)) return null;
        return { ...blankTemplate(), ...obj, elements: obj.elements };
    } catch {
        return null;
    }
}

// Dados de exemplo para o preview do editor.
export const SAMPLE_DATA: LabelData = {
    assetCode: "AST-000123",
    skuName: "Notebook Dell Latitude 3440",
    skuCode: "NOTE-001",
    qrContent: JSON.stringify({ contractVersion: "v1", assetId: "exemplo", assetCode: "AST-000123", skuId: "sku", skuCode: "NOTE-001" }),
    location: "Sala TI",
};
