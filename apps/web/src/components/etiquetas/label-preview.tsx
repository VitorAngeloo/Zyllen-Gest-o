"use client";
// ─── Preview fiel da etiqueta ────────────────────────────────────────────
//
// Renderiza a etiqueta a partir do MESMO template usado para gerar o ZPL.
// Cada elemento é posicionado em escala mm→px, então o que se vê aqui é o
// que sai na impressora.

import QRCode from "react-qr-code";
import {
    type LabelTemplate,
    type LabelData,
    type LabelElement,
    resolveElementText,
} from "@web/lib/label-template";

type Props = {
    template: LabelTemplate;
    data: LabelData;
    pxPerMm?: number;          // escala do preview (padrão 5 px/mm)
    selectedId?: string | null; // elemento destacado (usado pelo editor)
    onSelect?: (id: string) => void;
};

export function LabelPreview({ template, data, pxPerMm = 5, selectedId, onSelect }: Props) {
    const s = pxPerMm;
    const w = template.widthMm * s;
    const h = template.heightMm * s;

    return (
        <div
            className="relative bg-white shadow-lg overflow-hidden"
            style={{ width: w, height: h, border: "1px solid #e5e7eb" }}
        >
            {template.elements.map((el) => (
                <ElementView
                    key={el.id}
                    el={el}
                    data={data}
                    s={s}
                    selected={selectedId === el.id}
                    onSelect={onSelect}
                />
            ))}
        </div>
    );
}

function ElementView({
    el, data, s, selected, onSelect,
}: {
    el: LabelElement;
    data: LabelData;
    s: number;
    selected?: boolean;
    onSelect?: (id: string) => void;
}) {
    const left = el.xMm * s;
    const top = el.yMm * s;
    const ring = selected ? "0 0 0 1.5px var(--zyllen-highlight)" : undefined;

    const baseStyle: React.CSSProperties = {
        position: "absolute",
        left,
        top,
        cursor: onSelect ? "pointer" : "default",
        boxShadow: ring,
    };
    const handleClick = () => onSelect?.(el.id);

    if (el.type === "qrcode") {
        const size = (el.sizeMm ?? 17) * s;
        return (
            <div style={{ ...baseStyle }} onClick={handleClick}>
                <QRCode value={data.qrContent || " "} size={size} level="M" />
            </div>
        );
    }

    if (el.type === "line") {
        return (
            <div
                style={{
                    ...baseStyle,
                    width: (el.widthMm ?? 40) * s,
                    height: Math.max(1, (el.heightMm ?? 0.3) * s),
                    background: "#111",
                }}
                onClick={handleClick}
            />
        );
    }

    if (el.type === "barcode") {
        // Placeholder visual até a Fase 4 (barras reais no preview).
        return (
            <div
                style={{
                    ...baseStyle,
                    width: (el.widthMm ?? 30) * s,
                    height: (el.heightMm ?? 8) * s,
                    background: "repeating-linear-gradient(90deg,#111 0 2px,#fff 2px 4px)",
                }}
                onClick={handleClick}
                title="Código de barras"
            />
        );
    }

    if (el.type === "logo") {
        return (
            <div style={{ ...baseStyle }} onClick={handleClick}>
                <img src="/brand/logo-skyline-black.svg" alt="Logo" style={{ height: (el.heightMm ?? 3) * s }} />
            </div>
        );
    }

    // Elementos de texto
    const text = resolveElementText(el, data);
    const fontPx = (el.fontMm ?? 3) * s;
    const isMono = el.type === "assetCode" || el.type === "sku";
    return (
        <div
            style={{
                ...baseStyle,
                color: "#111",
                fontFamily: isMono ? "monospace" : "Arial, sans-serif",
                fontSize: fontPx,
                fontWeight: el.type === "assetCode" ? 700 : 400,
                lineHeight: 1.15,
                width: el.widthMm ? el.widthMm * s : undefined,
                maxHeight: el.widthMm && el.maxLines ? fontPx * 1.15 * el.maxLines : undefined,
                overflow: "hidden",
                whiteSpace: el.widthMm ? "normal" : "nowrap",
            }}
            onClick={handleClick}
        >
            {text}
        </div>
    );
}
