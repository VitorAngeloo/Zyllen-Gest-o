"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@web/components/ui/button";
import { Label } from "@web/components/ui/label";
import { Check, CheckCircle2, Eraser, PenLine, X } from "lucide-react";

interface SignaturePadProps {
    label?: string;
    value?: string;
    onChange?: (dataUrl: string) => void;
    onCaptureStateChange?: (pending: boolean) => void;
    readOnly?: boolean;
}

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 280;

export function SignaturePad({
    label = "Assinatura eletrônica de quem acompanhou",
    value = "",
    onChange,
    onCaptureStateChange,
    readOnly = false,
}: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const captureCallback = useRef(onCaptureStateChange);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);
    const drawingRef = useRef(false);
    const pendingRef = useRef(false);
    const signatureBounds = useRef({ minX: Infinity, minY: Infinity, maxX: 0, maxY: 0, distance: 0 });
    const [expanded, setExpanded] = useState(false);
    const [hasContent, setHasContent] = useState(Boolean(value));
    const [error, setError] = useState("");

    const reportPending = (next: boolean) => {
        pendingRef.current = next;
        captureCallback.current?.(next);
    };

    const drawStoredValue = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        setHasContent(Boolean(value));
        if (!value) return;
        const image = new Image();
        image.onload = () => ctx.drawImage(image, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        image.src = value;
    };

    useEffect(() => {
        if (expanded) drawStoredValue();
        // value is intentionally redrawn whenever a capture panel opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expanded, value]);

    useEffect(() => {
        captureCallback.current = onCaptureStateChange;
    }, [onCaptureStateChange]);

    useEffect(() => () => captureCallback.current?.(false), []);

    const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
            y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
        };
    };

    const startDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drawingRef.current = true;
        setError("");
        lastPoint.current = pointFromEvent(event);
    };

    const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current || !lastPoint.current) return;
        event.preventDefault();
        const ctx = event.currentTarget.getContext("2d");
        if (!ctx) return;
        const point = pointFromEvent(event);
        const previous = lastPoint.current;

        ctx.beginPath();
        ctx.moveTo(previous.x, previous.y);
        ctx.lineTo(point.x, point.y);
        ctx.strokeStyle = "#171717";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        const bounds = signatureBounds.current;
        bounds.minX = Math.min(bounds.minX, previous.x, point.x);
        bounds.minY = Math.min(bounds.minY, previous.y, point.y);
        bounds.maxX = Math.max(bounds.maxX, previous.x, point.x);
        bounds.maxY = Math.max(bounds.maxY, previous.y, point.y);
        bounds.distance += Math.hypot(point.x - previous.x, point.y - previous.y);
        lastPoint.current = point;
        setHasContent(true);
        if (!pendingRef.current) reportPending(true);
    };

    const endDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        drawingRef.current = false;
        lastPoint.current = null;
    };

    const openCapture = () => {
        signatureBounds.current = { minX: Infinity, minY: Infinity, maxX: 0, maxY: 0, distance: 0 };
        setError("");
        reportPending(true);
        setExpanded(true);
    };

    const cancelCapture = () => {
        setExpanded(false);
        drawingRef.current = false;
        setError("");
        reportPending(false);
    };

    const clearDraft = () => {
        const canvas = canvasRef.current;
        canvas?.getContext("2d")?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        signatureBounds.current = { minX: Infinity, minY: Infinity, maxX: 0, maxY: 0, distance: 0 };
        setHasContent(false);
        setError("");
        reportPending(Boolean(value));
    };

    const confirmSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasContent) {
            setError("Faça a assinatura antes de confirmar.");
            return;
        }
        const bounds = signatureBounds.current;
        if (pendingRef.current && !value && (
            bounds.distance < 50
            || bounds.maxX - bounds.minX < 30
            || bounds.maxY - bounds.minY < 12
        )) {
            setError("A assinatura ficou muito curta. Limpe e assine novamente.");
            return;
        }
        onChange?.(canvas.toDataURL("image/png"));
        setExpanded(false);
        setError("");
        reportPending(false);
    };

    if (readOnly) {
        return (
            <div className="space-y-2">
                <Label className="text-[var(--zyllen-muted)]">{label}</Label>
                {value ? (
                    <div className="rounded-lg border border-[var(--zyllen-border)] bg-white p-2">
                        <img src={value} alt="Assinatura" className="w-full h-[140px] object-contain" />
                    </div>
                ) : (
                    <p className="text-xs text-[var(--zyllen-muted)]/50 italic">Nenhuma assinatura registrada</p>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <Label className="text-[var(--zyllen-muted)]">{label}</Label>

            {!expanded ? (
                <button
                    type="button"
                    onClick={openCapture}
                    className="w-full rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] px-4 py-3 flex items-center gap-3 text-left hover:border-[var(--zyllen-highlight)] transition-colors"
                >
                    {value ? (
                        <CheckCircle2 size={20} className="text-green-400 shrink-0" />
                    ) : (
                        <PenLine size={20} className="text-[var(--zyllen-highlight)] shrink-0" />
                    )}
                    <span className="flex-1">
                        <span className="block text-sm font-medium text-white">
                            {value ? "Assinatura confirmada" : "Clique para assinar"}
                        </span>
                        <span className="block text-xs text-[var(--zyllen-muted)] mt-0.5">
                            {value ? "Clique para conferir ou refazer" : "O quadro de assinatura só abre quando necessário"}
                        </span>
                    </span>
                </button>
            ) : (
                <div className="rounded-lg border-2 border-[var(--zyllen-highlight)] bg-white overflow-hidden shadow-lg">
                    <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
                        <div>
                            <p className="text-sm font-semibold text-gray-900">Assine com o dedo ou mouse</p>
                            <p className="text-xs text-gray-500 mt-0.5">Confira a assinatura e toque em Confirmar.</p>
                        </div>
                        <button type="button" onClick={cancelCapture} className="p-1 text-gray-500 hover:text-gray-900" aria-label="Cancelar assinatura">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="relative mx-4 border border-gray-200 rounded-md overflow-hidden aspect-[45/14]">
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                            className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                            onPointerDown={startDraw}
                            onPointerMove={draw}
                            onPointerUp={endDraw}
                            onPointerCancel={endDraw}
                        />
                        {!hasContent && (
                            <div className="absolute bottom-5 left-5 right-5 flex items-end pointer-events-none select-none">
                                <span className="text-3xl text-gray-300 mr-2 leading-none">×</span>
                                <div className="flex-1 border-b border-gray-300 mb-1" />
                            </div>
                        )}
                    </div>

                    {error && <p className="px-4 pt-2 text-xs font-medium text-red-600">{error}</p>}

                    <div className="flex items-center justify-between gap-2 px-4 py-3">
                        <Button type="button" variant="ghost" size="sm" onClick={clearDraft} disabled={!hasContent} className="text-gray-600 gap-1">
                            <Eraser size={14} /> Limpar
                        </Button>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={cancelCapture} className="text-gray-700 border-gray-300">
                                Cancelar
                            </Button>
                            <Button type="button" size="sm" onClick={confirmSignature} className="gap-1 bg-green-600 hover:bg-green-700 text-white">
                                <Check size={14} /> Confirmar assinatura
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
