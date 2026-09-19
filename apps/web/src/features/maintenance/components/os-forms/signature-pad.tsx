"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { Label } from "@web/components/ui/label";
import { Button } from "@web/components/ui/button";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
    /** Label exibido acima do canvas */
    label?: string;
    /** Valor atual (base64 data URL ou string vazia) */
    value?: string;
    /** Callback para notificar alteração (base64 ou "") */
    onChange?: (dataUrl: string) => void;
    /** Quando true, exibe somente a imagem da assinatura */
    readOnly?: boolean;
}

export function SignaturePad({
    label = "Assinatura eletrônica de quem acompanhou",
    value = "",
    onChange,
    readOnly = false,
}: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [drawing, setDrawing] = useState(false);
    const [hasContent, setHasContent] = useState(false);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);

    // ── Resize canvas to fit container ──
    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.scale(dpr, dpr);

        // Redraw saved value if any
        if (value) {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, rect.width, rect.height);
                ctx.drawImage(img, 0, 0, rect.width, rect.height);
                setHasContent(true);
            };
            img.src = value;
        }
    }, [value]);

    useEffect(() => {
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        return () => window.removeEventListener("resize", resizeCanvas);
    }, [resizeCanvas]);

    // ── Load saved signature when value changes externally ──
    useEffect(() => {
        if (!value || readOnly) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;

        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            setHasContent(true);
        };
        img.src = value;
    }, [value, readOnly]);

    // ── Get point from mouse/touch event ──
    const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
        const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    // ── Drawing handlers ──
    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        if (readOnly) return;
        e.preventDefault();
        setDrawing(true);
        lastPoint.current = getPoint(e);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!drawing || readOnly) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const pt = getPoint(e);
        if (!pt || !lastPoint.current) return;

        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        lastPoint.current = pt;
        setHasContent(true);
    };

    const endDraw = () => {
        if (!drawing) return;
        setDrawing(false);
        lastPoint.current = null;
        save();
    };

    const save = () => {
        const canvas = canvasRef.current;
        if (!canvas || !onChange) return;
        const dataUrl = canvas.toDataURL("image/png");
        onChange(dataUrl);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        setHasContent(false);
        onChange?.("");
    };

    // ── Readonly: show saved image ──
    if (readOnly) {
        return (
            <div className="space-y-2">
                <Label className="text-[var(--zyllen-muted)]">{label}</Label>
                {value ? (
                    <div className="rounded-lg border border-[var(--zyllen-border)] bg-white p-2">
                        <img
                            src={value}
                            alt="Assinatura"
                            className="w-full h-[140px] object-contain"
                        />
                    </div>
                ) : (
                    <p className="text-xs text-[var(--zyllen-muted)]/50 italic">
                        Nenhuma assinatura registrada
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <Label className="text-[var(--zyllen-muted)]">{label}</Label>

            <div className="rounded-lg border-2 border-dashed border-[var(--zyllen-border)] bg-white overflow-hidden">
                {/* Header */}
                <div className="text-center pt-3 pb-1 px-4">
                    <p className="text-sm font-medium text-gray-800">
                        Assine abaixo com o dedo ou mouse.
                    </p>
                    <p className="text-[11px] text-red-400 mt-0.5">
                        Tudo bem se não ficar 100% idêntico ao papel.
                    </p>
                </div>

                {/* Canvas */}
                <div
                    ref={containerRef}
                    className="relative mx-4 mb-3"
                    style={{ height: 140 }}
                >
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 cursor-crosshair touch-none"
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={endDraw}
                        onMouseLeave={endDraw}
                        onTouchStart={startDraw}
                        onTouchMove={draw}
                        onTouchEnd={endDraw}
                    />

                    {/* Guide: X and line */}
                    {!hasContent && (
                        <div className="absolute bottom-4 left-4 right-4 flex items-end pointer-events-none select-none">
                            <span className="text-3xl text-gray-300 mr-1 leading-none">×</span>
                            <div className="flex-1 border-b border-gray-300 mb-1" />
                        </div>
                    )}
                </div>

                {/* Clear button */}
                <div className="flex justify-end px-4 pb-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clear}
                        disabled={!hasContent}
                        className="text-gray-500 hover:text-gray-800 text-xs gap-1 h-7"
                    >
                        <Eraser size={14} />
                        Limpar
                    </Button>
                </div>
            </div>
        </div>
    );
}
