"use client";
// ─── Editor de Templates (incremento 1: por campos) ──────────────────────
//
// Edita o template do novo modelo: tamanho/colunas/margens e cada elemento
// com posição (x/y), tamanho e conteúdo. O preview à direita é fiel à
// impressão (mesma fonte do ZPL). Próximo incremento: arrastar e soltar.

import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import {
    type LabelTemplate,
    type LabelElement,
    type LabelElementType,
    ELEMENT_TYPES,
    ELEMENT_LABEL,
    newElement,
    SAMPLE_DATA,
} from "@web/lib/label-template";
import { LabelPreview } from "@web/components/etiquetas/label-preview";

type Props = {
    template: LabelTemplate;
    onChange: (t: LabelTemplate) => void;
};

const inputCls = "h-8 w-full rounded border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] text-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/50";

function Num({ label, value, onChange, step = 1, min }: { label: string; value: number | undefined; onChange: (v: number) => void; step?: number; min?: number }) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--zyllen-muted)]">{label}</span>
            <input
                type="number"
                step={step}
                value={value ?? 0}
                onChange={(e) => onChange(min != null ? Math.max(min, Number(e.target.value)) : Number(e.target.value))}
                className={inputCls}
            />
        </label>
    );
}

function Txt({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string) => void }) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--zyllen-muted)]">{label}</span>
            <input type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={inputCls} />
        </label>
    );
}

export function TemplateEditor({ template, onChange }: Props) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [addType, setAddType] = useState<LabelElementType>("text");

    const patch = (p: Partial<LabelTemplate>) => onChange({ ...template, ...p });
    const updateEl = (id: string, p: Partial<LabelElement>) =>
        onChange({ ...template, elements: template.elements.map((e) => (e.id === id ? { ...e, ...p } : e)) });
    const removeEl = (id: string) =>
        onChange({ ...template, elements: template.elements.filter((e) => e.id !== id) });
    const addEl = () => {
        const el = newElement(addType);
        onChange({ ...template, elements: [...template.elements, el] });
        setSelectedId(el.id);
    };
    const moveEl = (id: string, dir: -1 | 1) => {
        const idx = template.elements.findIndex((e) => e.id === id);
        const next = idx + dir;
        if (idx < 0 || next < 0 || next >= template.elements.length) return;
        const els = [...template.elements];
        [els[idx], els[next]] = [els[next], els[idx]];
        patch({ elements: els });
    };

    return (
        <div className="grid lg:grid-cols-2 gap-4">
            {/* ─── Coluna de edição ─── */}
            <div className="space-y-4">
                {/* Dados do template */}
                <div className="space-y-3 rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] p-3">
                    <Txt label="Nome do template" value={template.name} onChange={(v) => patch({ name: v })} />
                    <Txt label="Descrição" value={template.description} onChange={(v) => patch({ description: v })} />
                    <div className="grid grid-cols-3 gap-2">
                        <Num label="Largura (mm)" value={template.widthMm} min={5} onChange={(v) => patch({ widthMm: v })} />
                        <Num label="Altura (mm)" value={template.heightMm} min={5} onChange={(v) => patch({ heightMm: v })} />
                        <Num label="Colunas" value={template.columns} min={1} onChange={(v) => patch({ columns: v })} />
                    </div>
                    <p className="text-[10px] text-[var(--zyllen-muted)] leading-snug">
                        <b>Colunas = 1</b> na maioria dos casos: a impressora separa as etiquetas sozinha (mídia com espaço entre elas).
                        Use <b>2</b> só se a impressora imprime as duas de uma vez como um bloco único. Largura/Altura são de <b>uma</b> etiqueta.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        <Num label="Margem topo" value={template.marginTopMm} step={0.5} min={0} onChange={(v) => patch({ marginTopMm: v })} />
                        <Num label="Margem esq." value={template.marginLeftMm} step={0.5} min={0} onChange={(v) => patch({ marginLeftMm: v })} />
                        <Num label="Espaço col." value={template.gapXMm} step={0.5} min={0} onChange={(v) => patch({ gapXMm: v })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--zyllen-border)]/50">
                        <Num label="Calibragem ↔ (mm)" value={template.offsetXMm} step={0.5} onChange={(v) => patch({ offsetXMm: v })} />
                        <Num label="Calibragem ↕ (mm)" value={template.offsetYMm} step={0.5} onChange={(v) => patch({ offsetYMm: v })} />
                    </div>
                </div>

                {/* Adicionar elemento */}
                <div className="flex items-center gap-2">
                    <select value={addType} onChange={(e) => setAddType(e.target.value as LabelElementType)} className={inputCls + " flex-1"}>
                        {ELEMENT_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                    </select>
                    <button onClick={addEl} className="h-8 px-3 rounded bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg)] text-xs font-medium flex items-center gap-1 shrink-0">
                        <Plus size={14} /> Adicionar
                    </button>
                </div>

                {/* Lista de elementos */}
                <div className="space-y-2">
                    {template.elements.length === 0 && (
                        <p className="text-xs text-[var(--zyllen-muted)] text-center py-4">Nenhum elemento. Adicione acima.</p>
                    )}
                    {template.elements.map((el, idx) => {
                        const open = selectedId === el.id;
                        return (
                            <div key={el.id} className={`rounded-lg border ${open ? "border-[var(--zyllen-highlight)]/50" : "border-[var(--zyllen-border)]"} bg-[var(--zyllen-bg-dark)]`}>
                                <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => setSelectedId(open ? null : el.id)}>
                                    <span className="text-xs text-white flex-1">{ELEMENT_LABEL[el.type]}</span>
                                    <span className="text-[10px] text-[var(--zyllen-muted)] font-mono">{el.xMm},{el.yMm}mm</span>
                                    <button onClick={(e) => { e.stopPropagation(); moveEl(el.id, -1); }} disabled={idx === 0} className="text-[var(--zyllen-muted)] hover:text-white disabled:opacity-30"><ChevronUp size={14} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); moveEl(el.id, 1); }} disabled={idx === template.elements.length - 1} className="text-[var(--zyllen-muted)] hover:text-white disabled:opacity-30"><ChevronDown size={14} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); removeEl(el.id); }} className="text-[var(--zyllen-muted)] hover:text-red-400"><Trash2 size={14} /></button>
                                </div>
                                {open && (
                                    <div className="px-3 pb-3 space-y-2 border-t border-[var(--zyllen-border)]/50 pt-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Num label="X (mm)" value={el.xMm} step={0.5} min={0} onChange={(v) => updateEl(el.id, { xMm: v })} />
                                            <Num label="Y (mm)" value={el.yMm} step={0.5} min={0} onChange={(v) => updateEl(el.id, { yMm: v })} />
                                        </div>
                                        <ElementProps el={el} onChange={(p) => updateEl(el.id, p)} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── Preview ─── */}
            <div className="lg:sticky lg:top-4 h-fit">
                <div className="rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] p-6 flex flex-col items-center">
                    <p className="text-xs text-[var(--zyllen-muted)] mb-4">Arraste para mover · alça no canto para redimensionar</p>
                    <LabelPreview
                        template={template}
                        data={SAMPLE_DATA}
                        pxPerMm={7}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        editable
                        onElementChange={updateEl}
                    />
                    <p className="text-[10px] text-[var(--zyllen-muted)] mt-3">{template.widthMm}×{template.heightMm}mm · {template.columns} coluna(s)</p>
                </div>
            </div>
        </div>
    );
}

// Campos específicos por tipo de elemento.
function ElementProps({ el, onChange }: { el: LabelElement; onChange: (p: Partial<LabelElement>) => void }) {
    switch (el.type) {
        case "text":
            return (
                <div className="grid grid-cols-2 gap-2">
                    <Txt label="Texto" value={el.text} onChange={(v) => onChange({ text: v })} />
                    <Num label="Fonte (mm)" value={el.fontMm} step={0.2} min={1} onChange={(v) => onChange({ fontMm: v })} />
                </div>
            );
        case "sku":
            return (
                <div className="grid grid-cols-2 gap-2">
                    <Txt label="Prefixo" value={el.text} onChange={(v) => onChange({ text: v })} />
                    <Num label="Fonte (mm)" value={el.fontMm} step={0.2} min={1} onChange={(v) => onChange({ fontMm: v })} />
                </div>
            );
        case "itemName":
            return (
                <div className="grid grid-cols-3 gap-2">
                    <Num label="Fonte (mm)" value={el.fontMm} step={0.2} min={1} onChange={(v) => onChange({ fontMm: v })} />
                    <Num label="Largura (mm)" value={el.widthMm} step={0.5} min={1} onChange={(v) => onChange({ widthMm: v })} />
                    <Num label="Máx. linhas" value={el.maxLines} min={1} onChange={(v) => onChange({ maxLines: v })} />
                </div>
            );
        case "assetCode":
        case "location":
        case "date":
            return (
                <div className="grid grid-cols-2 gap-2">
                    <Num label="Fonte (mm)" value={el.fontMm} step={0.2} min={1} onChange={(v) => onChange({ fontMm: v })} />
                </div>
            );
        case "qrcode":
            return (
                <div className="grid grid-cols-2 gap-2">
                    <Num label="Tamanho (mm)" value={el.sizeMm} step={0.5} min={5} onChange={(v) => onChange({ sizeMm: v })} />
                </div>
            );
        case "barcode":
            return (
                <div className="grid grid-cols-2 gap-2">
                    <Num label="Largura (mm)" value={el.widthMm} step={0.5} min={5} onChange={(v) => onChange({ widthMm: v })} />
                    <Num label="Altura (mm)" value={el.heightMm} step={0.5} min={2} onChange={(v) => onChange({ heightMm: v })} />
                </div>
            );
        case "line":
            return (
                <div className="grid grid-cols-2 gap-2">
                    <Num label="Comprimento (mm)" value={el.widthMm} step={0.5} min={1} onChange={(v) => onChange({ widthMm: v })} />
                    <Num label="Espessura (mm)" value={el.heightMm} step={0.1} min={0.1} onChange={(v) => onChange({ heightMm: v })} />
                </div>
            );
        case "logo":
            return (
                <div className="grid grid-cols-2 gap-2">
                    <Num label="Altura (mm)" value={el.heightMm} step={0.5} min={1} onChange={(v) => onChange({ heightMm: v })} />
                </div>
            );
        default:
            return null;
    }
}
