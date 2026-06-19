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
