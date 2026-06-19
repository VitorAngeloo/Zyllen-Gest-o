"use client";
// ─── Preview fiel da etiqueta (com modo de edição opcional) ──────────────
//
// Renderiza a etiqueta a partir do MESMO template usado para gerar o ZPL.
// Em modo `editable`, cada elemento pode ser ARRASTADO (mover) e
// REDIMENSIONADO (alça no canto), atualizando o template ao vivo.

import QRCode from "react-qr-code";
import {
    type LabelTemplate,
    type LabelData,
    type LabelElement,
    resolveElementText,
} from "@web/lib/label-template";
import { qrPrintedSizeMm } from "@web/lib/label-zpl";

type Props = {
    template: LabelTemplate;
    data: LabelData;
    pxPerMm?: number;
    selectedId?: string | null;
    onSelect?: (id: string) => void;
    editable?: boolean;
    onElementChange?: (id: string, patch: Partial<LabelElement>) => void;
};

const snap = (v: number) => Math.round(v * 2) / 2; // passo de 0,5mm

export function LabelPreview({ template, data, pxPerMm = 5, selectedId, onSelect, editable, onElementChange }: Props) {
    const s = pxPerMm;
    const w = template.widthMm * s;
    const h = template.heightMm * s;

    // Arrastar (mover) um elemento.
    const startDrag = (e: React.PointerEvent, el: LabelElement) => {
        if (!editable || !onElementChange) return;
        e.preventDefault();
        onSelect?.(el.id);
        const startX = e.clientX, startY = e.clientY;
        const elX = el.xMm, elY = el.yMm;
        const move = (ev: PointerEvent) => {
            const nx = snap(Math.max(0, Math.min(template.widthMm, elX + (ev.clientX - startX) / s)));
            const ny = snap(Math.max(0, Math.min(template.heightMm, elY + (ev.clientY - startY) / s)));
            onElementChange(el.id, { xMm: nx, yMm: ny });
        };
        const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    // Redimensionar pela alça do canto inferior direito.
    const startResize = (e: React.PointerEvent, el: LabelElement) => {
        if (!editable || !onElementChange) return;
        e.preventDefault();
        e.stopPropagation();
        const wrapper = (e.currentTarget as HTMLElement).parentElement;
        if (!wrapper) return;
        const startX = e.clientX, startY = e.clientY;
        const startWmm = wrapper.offsetWidth / s;
        const startHmm = wrapper.offsetHeight / s;
        const move = (ev: PointerEvent) => {
            const wMm = Math.max(2, snap(startWmm + (ev.clientX - startX) / s));
            const hMm = Math.max(1, snap(startHmm + (ev.clientY - startY) / s));
            onElementChange(el.id, setBox(el, wMm, hMm));
        };
        const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    };

    return (
        <div
            className="relative bg-white shadow-lg overflow-hidden"
            style={{ width: w, height: h, border: "1px solid #e5e7eb", backgroundImage: editable ? "linear-gradient(#0001 1px,transparent 1px),linear-gradient(90deg,#0001 1px,transparent 1px)" : undefined, backgroundSize: editable ? `${s}px ${s}px` : undefined }}
        >
            {template.elements.map((el) => (
                <ElementView
                    key={el.id}
                    el={el}
                    data={data}
                    s={s}
                    dpi={template.dpi || 203}
                    labelWmm={template.widthMm}
                    labelHmm={template.heightMm}
                    selected={selectedId === el.id}
                    editable={editable}
                    onSelect={onSelect}
                    onStartDrag={startDrag}
                    onStartResize={startResize}
                />
            ))}
        </div>
    );
}

// Mapeia a caixa redimensionada (mm) de volta para os campos do elemento.
function setBox(el: LabelElement, wMm: number, hMm: number): Partial<LabelElement> {
    switch (el.type) {
        case "qrcode": return { sizeMm: Math.max(5, snap(Math.max(wMm, hMm))) };
        case "line": return { widthMm: wMm, heightMm: Math.max(0.1, hMm) };
        case "barcode": return { widthMm: wMm, heightMm: hMm };
        case "logo": return { heightMm: hMm };
        default: {
            // Texto: altura → fonte; largura → bloco (quando aplicável).
            const lines = el.maxLines && el.maxLines > 0 ? el.maxLines : 1;
            const patch: Partial<LabelElement> = { fontMm: Math.max(1, snap(hMm / lines)) };
            if (el.widthMm != null) patch.widthMm = wMm;
            return patch;
        }
    }
}

function ElementView({
    el, data, s, dpi, labelWmm, labelHmm, selected, editable, onSelect, onStartDrag, onStartResize,
}: {
    el: LabelElement;
    data: LabelData;
    s: number;
    dpi: number;
    labelWmm: number;
    labelHmm: number;
    selected?: boolean;
    editable?: boolean;
    onSelect?: (id: string) => void;
    onStartDrag: (e: React.PointerEvent, el: LabelElement) => void;
    onStartResize: (e: React.PointerEvent, el: LabelElement) => void;
}) {
    const left = el.xMm * s;
    const top = el.yMm * s;
    const ring = selected ? "0 0 0 1.5px var(--zyllen-highlight)" : undefined;

    const baseStyle: React.CSSProperties = {
        position: "absolute",
        left,
        top,
        cursor: editable ? "move" : (onSelect ? "pointer" : "default"),
        boxShadow: ring,
        touchAction: "none",
    };
    const handlers = {
        onPointerDown: (e: React.PointerEvent) => editable ? onStartDrag(e, el) : onSelect?.(el.id),
    };

    const resizeHandle = editable && selected ? (
        <div
            onPointerDown={(e) => onStartResize(e, el)}
            style={{ position: "absolute", right: -5, bottom: -5, width: 10, height: 10, background: "var(--zyllen-highlight)", borderRadius: 2, cursor: "nwse-resize", touchAction: "none" }}
        />
    ) : null;

    if (el.type === "qrcode") {
        // Tamanho real que será impresso, já encolhido para caber na etiqueta.
        const availMm = Math.min(labelWmm - el.xMm, labelHmm - el.yMm);
        const printedMm = qrPrintedSizeMm(el.sizeMm ?? 17, dpi, (data.qrContent || " ").length, availMm);
        const size = printedMm * s;
        return (
            <div style={baseStyle} {...handlers}>
                <QRCode value={data.qrContent || " "} size={size} level="M" />
                {resizeHandle}
            </div>
        );
    }

    if (el.type === "line") {
        return (
            <div style={{ ...baseStyle, width: (el.widthMm ?? 40) * s, height: Math.max(1, (el.heightMm ?? 0.3) * s), background: "#111" }} {...handlers}>
                {resizeHandle}
            </div>
        );
    }

    if (el.type === "barcode") {
        return (
            <div style={{ ...baseStyle, width: (el.widthMm ?? 30) * s, height: (el.heightMm ?? 8) * s, background: "repeating-linear-gradient(90deg,#111 0 2px,#fff 2px 4px)" }} {...handlers} title="Código de barras">
                {resizeHandle}
            </div>
        );
    }

    if (el.type === "logo") {
        return (
            <div style={baseStyle} {...handlers}>
                <img src="/brand/logo-skyline-black.svg" alt="Logo" style={{ height: (el.heightMm ?? 3) * s, pointerEvents: "none" }} />
                {resizeHandle}
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
            {...handlers}
        >
            {text}
            {resizeHandle}
        </div>
    );
}
