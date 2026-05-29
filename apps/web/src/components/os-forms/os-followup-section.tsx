"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@web/lib/api-client";
import { Card, CardContent, CardHeader } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { Badge } from "@web/components/ui/badge";
import { toast } from "sonner";
import {
    Calendar, FileText, Image as ImageIcon, PenLine, Plus, Trash2, X,
    Loader2, Upload, Video, Check, Eraser, Lock,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const ALLOWED_MIME = /^(image\/(jpeg|png|gif|webp|bmp)|video\/(mp4|webm|quicktime|x-msvideo))$/;

type BlockType = "TEXT" | "MEDIA" | "SIGNATURE";

interface FollowupAttachment {
    id: string;
    fileName: string;
    filePath: string;
    mimeType?: string | null;
    createdAt: string;
}

interface FollowupBlock {
    id: string;
    type: BlockType;
    content?: string | null;
    order: number;
    isLocked?: boolean;
    createdAt: string;
    attachments: FollowupAttachment[];
}

interface OSFollowupSectionProps {
    osId: string;
    apiBasePath: string; // e.g. '/maintenance'
    fetchOpts: any;
    readOnly?: boolean;
    /** clientMode: client can only sign SIGNATURE blocks, cannot add/delete/edit other blocks */
    clientMode?: boolean;
}

// ── Inline Signature Canvas ─────────────────────────────────────────────
export function InlineSignaturePad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [drawing, setDrawing] = useState(false);
    const [hasContent, setHasContent] = useState(!!value);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);

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
        if (value) {
            const img = new Image();
            img.onload = () => { ctx.clearRect(0, 0, rect.width, rect.height); ctx.drawImage(img, 0, 0, rect.width, rect.height); setHasContent(true); };
            img.src = value;
        }
    }, [value]);

    useEffect(() => {
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        return () => window.removeEventListener("resize", resizeCanvas);
    }, [resizeCanvas]);

    const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
        const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setDrawing(true);
        lastPoint.current = getPoint(e);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!drawing) return;
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
        const canvas = canvasRef.current;
        if (canvas) onChange(canvas.toDataURL("image/png"));
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        setHasContent(false);
        onChange("");
    };

    return (
        <div className="rounded-lg border-2 border-dashed border-[var(--zyllen-border)] bg-white overflow-hidden">
            <div className="text-center pt-3 pb-1 px-4">
                <p className="text-sm font-medium text-gray-700">Assine abaixo com o dedo ou mouse.</p>
            </div>
            <div ref={containerRef} className="relative mx-4 mb-3" style={{ height: 140 }}>
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 cursor-crosshair touch-none"
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
                />
                {!hasContent && (
                    <div className="absolute bottom-4 left-4 right-4 flex items-end pointer-events-none select-none">
                        <span className="text-3xl text-gray-300 mr-1 leading-none">×</span>
                        <div className="flex-1 border-b border-gray-300 mb-1" />
                    </div>
                )}
            </div>
            <div className="flex justify-end px-4 pb-3">
                <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!hasContent} className="text-gray-500 hover:text-gray-800 text-xs gap-1 h-7">
                    <Eraser size={14} /> Limpar
                </Button>
            </div>
        </div>
    );
}

// ── Block Card ──────────────────────────────────────────────────────────
function FollowupBlockCard({
    block, osId, apiBasePath, fetchOpts, qc, readOnly, clientMode,
}: {
    block: FollowupBlock;
    osId: string;
    apiBasePath: string;
    fetchOpts: any;
    qc: ReturnType<typeof useQueryClient>;
    readOnly?: boolean;
    clientMode?: boolean;
}) {
    const [textValue, setTextValue] = useState(block.content ?? "");
    const [sigValue, setSigValue] = useState(block.content ?? "");
    const [editing, setEditing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const isLocked = !!block.isLocked;
    const invalidate = () => qc.invalidateQueries({ queryKey: ["os-followup-blocks", osId] });

    const removeBlock = useMutation({
        mutationFn: () => apiClient.delete(`${apiBasePath}/${osId}/followup-blocks/${block.id}`, fetchOpts),
        onSuccess: () => { toast.success("Bloco removido"); invalidate(); },
        onError: (e: any) => toast.error(e.message),
    });

    const saveText = useMutation({
        mutationFn: (content: string) => apiClient.put(`${apiBasePath}/${osId}/followup-blocks/${block.id}`, { content }, fetchOpts),
        onSuccess: () => { toast.success("Salvo"); setEditing(false); invalidate(); },
        onError: (e: any) => toast.error(e.message),
    });

    const saveSignature = useMutation({
        mutationFn: (content: string) => apiClient.put(`${apiBasePath}/${osId}/followup-blocks/${block.id}`, { content }, fetchOpts),
        onSuccess: () => { toast.success("Assinatura salva"); setEditing(false); invalidate(); },
        onError: (e: any) => toast.error(e.message),
    });

    const lockSignature = useMutation({
        mutationFn: () => apiClient.post(`${apiBasePath}/${osId}/followup-blocks/${block.id}/lock`, {}, fetchOpts),
        onSuccess: () => { toast.success("Assinatura confirmada e bloqueada"); invalidate(); },
        onError: (e: any) => toast.error(e.message),
    });

    const removeAtt = useMutation({
        mutationFn: (attId: string) => apiClient.delete(`${apiBasePath}/${osId}/followup-blocks/${block.id}/attachments/${attId}`, fetchOpts),
        onSuccess: () => { invalidate(); },
        onError: (e: any) => toast.error(e.message),
    });

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        for (let i = 0; i < files.length; i++) {
            if (!ALLOWED_MIME.test(files[i].type)) {
                toast.error(`Tipo não permitido: ${files[i].name}`);
                return;
            }
        }
        setUploading(true);
        try {
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
            await apiClient.upload(`${apiBasePath}/${osId}/followup-blocks/${block.id}/attachments`, formData, fetchOpts);
            invalidate();
        } catch (e: any) {
            toast.error(e.message || "Erro no upload");
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const isImg = (mime?: string | null, name?: string) =>
        mime?.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp)$/i.test(name ?? "");
    const isVid = (mime?: string | null, name?: string) =>
        mime?.startsWith("video/") || /\.(mp4|webm|mov|avi)$/i.test(name ?? "");

    const attUrl = (att: FollowupAttachment) =>
        `${API_URL}${apiBasePath}/${osId}/followup-blocks/${block.id}/attachments/${att.id}/file`;

    const BLOCK_CONFIG: Record<BlockType, { label: string; icon: React.ReactNode; color: string }> = {
        TEXT: { label: "Texto", icon: <FileText size={14} />, color: "bg-blue-500/15 text-blue-400" },
        MEDIA: { label: "Mídia", icon: <ImageIcon size={14} />, color: "bg-purple-500/15 text-purple-400" },
        SIGNATURE: { label: "Assinatura", icon: <PenLine size={14} />, color: "bg-amber-500/15 text-amber-400" },
    };
    const cfg = BLOCK_CONFIG[block.type];

    // Canblock be deleted: not in clientMode, not locked, not readOnly
    const canDelete = !readOnly && !clientMode && !isLocked;
    // Can sign a SIGNATURE block: not readOnly, not locked, (full edit or clientMode)
    const canSign = !readOnly && !isLocked && block.type === "SIGNATURE";
    // Can confirm/lock: not readOnly, not locked, block is SIGNATURE and has content
    const canConfirm = !readOnly && !isLocked && block.type === "SIGNATURE" && !!block.content;

    return (
        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)]">
            <CardHeader className="p-3 pb-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${cfg.color}`}>
                            {cfg.icon} {cfg.label}
                        </div>
                        {isLocked && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-500/15 text-green-400">
                                <Lock size={11} /> Confirmado
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {/* TEXT edit — only in full edit mode */}
                        {block.type === "TEXT" && !editing && !readOnly && !clientMode && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[var(--zyllen-muted)] hover:text-white" onClick={() => { setTextValue(block.content ?? ""); setEditing(true); }}>
                                Editar
                            </Button>
                        )}
                        {/* SIGNATURE sign button */}
                        {canSign && !editing && !block.content && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-[var(--zyllen-muted)] hover:text-white" onClick={() => setEditing(true)}>
                                Assinar
                            </Button>
                        )}
                        {/* Confirm/lock signature button */}
                        {canConfirm && !editing && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 gap-1"
                                onClick={() => {
                                    if (confirm("Confirmar assinatura? Após confirmar, não poderá ser alterada.")) {
                                        lockSignature.mutate();
                                    }
                                }}
                                disabled={lockSignature.isPending}
                            >
                                {lockSignature.isPending ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
                                Confirmar
                            </Button>
                        )}
                        {/* Delete block — only in full edit mode, not locked */}
                        {canDelete && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[var(--zyllen-error)] hover:text-red-400" onClick={() => { if (confirm("Remover este bloco?")) removeBlock.mutate(); }} disabled={removeBlock.isPending}>
                                <Trash2 size={12} />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-3 pt-2 space-y-2">
                {/* TEXT block */}
                {block.type === "TEXT" && (
                    editing ? (
                        <div className="space-y-2">
                            <textarea
                                value={textValue}
                                onChange={(e) => setTextValue(e.target.value)}
                                rows={4}
                                placeholder="Digite o texto..."
                                className="w-full px-3 py-2 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm placeholder:text-[var(--zyllen-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30 resize-y"
                            />
                            <div className="flex gap-2">
                                <Button size="sm" variant="highlight" onClick={() => saveText.mutate(textValue)} disabled={saveText.isPending} className="gap-1 text-xs">
                                    {saveText.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Salvar
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-xs text-[var(--zyllen-muted)]">Cancelar</Button>
                            </div>
                        </div>
                    ) : (
                        <p className={`text-sm whitespace-pre-wrap min-h-[2rem] ${block.content ? "text-white" : "text-[var(--zyllen-muted)] italic"}`}>
                            {block.content || "Sem conteúdo."}
                        </p>
                    )
                )}

                {/* MEDIA block */}
                {block.type === "MEDIA" && (
                    <div className="space-y-3">
                        {block.attachments.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {block.attachments.map((att) => (
                                    <div key={att.id} className="relative group rounded-lg overflow-hidden border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)]">
                                        {isImg(att.mimeType, att.fileName) ? (
                                            <a href={attUrl(att)} target="_blank" rel="noopener noreferrer">
                                                <img src={attUrl(att)} alt={att.fileName} className="w-full h-28 object-cover cursor-pointer hover:opacity-80 transition-opacity" />
                                            </a>
                                        ) : isVid(att.mimeType, att.fileName) ? (
                                            <a href={attUrl(att)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-28 bg-black/40 hover:bg-black/60 transition-colors cursor-pointer">
                                                <Video size={28} className="text-[var(--zyllen-highlight)]" />
                                            </a>
                                        ) : (
                                            <div className="flex items-center justify-center h-28"><Upload size={28} className="text-[var(--zyllen-muted)]" /></div>
                                        )}
                                        <div className="px-2 py-1"><p className="text-[10px] text-[var(--zyllen-muted)] truncate">{att.fileName}</p></div>
                                        {!readOnly && !clientMode && (
                                            <button
                                                type="button"
                                                onClick={() => removeAtt.mutate(att.id)}
                                                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {!readOnly && !clientMode && (
                            <>
                                <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    disabled={uploading}
                                    className="w-full rounded-lg border-2 border-dashed border-[var(--zyllen-border)] py-5 flex flex-col items-center gap-1 text-[var(--zyllen-muted)] hover:border-[var(--zyllen-highlight)] hover:text-[var(--zyllen-highlight)] transition-colors cursor-pointer"
                                >
                                    {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                                    <span className="text-xs">{uploading ? "Enviando..." : "Clique para adicionar fotos ou vídeos"}</span>
                                </button>
                            </>
                        )}
                        {block.attachments.length === 0 && (readOnly || clientMode) && (
                            <p className="text-xs text-[var(--zyllen-muted)] italic">Nenhuma mídia adicionada</p>
                        )}
                    </div>
                )}

                {/* SIGNATURE block */}
                {block.type === "SIGNATURE" && (
                    isLocked ? (
                        // Locked: show signature read-only with confirmation badge
                        <div className="space-y-2">
                            {block.content ? (
                                <div className="rounded-md border border-green-500/30 bg-white p-2">
                                    <img src={block.content} alt="Assinatura" className="w-full h-24 object-contain" />
                                </div>
                            ) : (
                                <p className="text-sm text-[var(--zyllen-muted)] italic">Assinatura não registrada</p>
                            )}
                            <p className="text-xs text-green-400 flex items-center gap-1">
                                <Lock size={11} /> Assinatura confirmada — não pode ser alterada
                            </p>
                        </div>
                    ) : editing ? (
                        <div className="space-y-2">
                            <InlineSignaturePad value={sigValue} onChange={setSigValue} />
                            <div className="flex gap-2">
                                <Button size="sm" variant="highlight" onClick={() => saveSignature.mutate(sigValue)} disabled={saveSignature.isPending || !sigValue} className="gap-1 text-xs">
                                    {saveSignature.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Salvar Assinatura
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-xs text-[var(--zyllen-muted)]">Cancelar</Button>
                            </div>
                        </div>
                    ) : block.content ? (
                        <div className="space-y-2">
                            <div className="rounded-md border border-[var(--zyllen-border)] bg-white p-2">
                                <img src={block.content} alt="Assinatura" className="w-full h-24 object-contain" />
                            </div>
                            {canSign && (
                                <Button size="sm" variant="ghost" onClick={() => { setSigValue(block.content ?? ""); setEditing(true); }} className="text-xs text-[var(--zyllen-muted)] hover:text-white">
                                    Substituir assinatura
                                </Button>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-[var(--zyllen-muted)] italic">
                            {readOnly ? "Nenhuma assinatura registrada" : "Clique em 'Assinar' para adicionar a assinatura."}
                        </p>
                    )
                )}
            </CardContent>
        </Card>
    );
}

// ── Main Section ────────────────────────────────────────────────────────
export function OSFollowupSection({ osId, apiBasePath, fetchOpts, readOnly, clientMode }: OSFollowupSectionProps) {
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ["os-followup-blocks", osId],
        queryFn: () => apiClient.get<{ data: FollowupBlock[] }>(`${apiBasePath}/${osId}/followup-blocks`, fetchOpts),
        enabled: !!osId,
    });

    const blocks: FollowupBlock[] = data?.data ?? [];

    const addBlock = useMutation({
        mutationFn: (type: BlockType) =>
            apiClient.post(`${apiBasePath}/${osId}/followup-blocks`, { type, order: blocks.length }, fetchOpts),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["os-followup-blocks", osId] }),
        onError: (e: any) => toast.error(e.message),
    });

    return (
        <div className="space-y-4">
            {/* Section header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-[var(--zyllen-highlight)]" />
                    <span className="text-sm font-semibold text-white">Acompanhamento de 7 dias</span>
                    {blocks.length > 0 && (
                        <Badge variant="default" className="text-xs">{blocks.length} {blocks.length === 1 ? "bloco" : "blocos"}</Badge>
                    )}
                </div>
            </div>

            {/* Blocks */}
            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2].map((i) => <div key={i} className="h-20 rounded-lg bg-[var(--zyllen-bg)] border border-[var(--zyllen-border)] animate-pulse" />)}
                </div>
            ) : blocks.length === 0 && (readOnly || clientMode) ? (
                <p className="text-xs text-[var(--zyllen-muted)] italic">Nenhum registro de acompanhamento</p>
            ) : (
                <div className="space-y-3">
                    {blocks.map((block) => (
                        <FollowupBlockCard
                            key={block.id}
                            block={block}
                            osId={osId}
                            apiBasePath={apiBasePath}
                            fetchOpts={fetchOpts}
                            qc={qc}
                            readOnly={readOnly}
                            clientMode={clientMode}
                        />
                    ))}
                </div>
            )}

            {/* Add block buttons — only in full edit mode */}
            {!readOnly && !clientMode && (
                <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addBlock.mutate("TEXT")}
                        disabled={addBlock.isPending}
                        className="gap-1.5 border-dashed border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-blue-400 hover:border-blue-400/30 text-xs"
                    >
                        <FileText size={13} /> + Texto
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addBlock.mutate("MEDIA")}
                        disabled={addBlock.isPending}
                        className="gap-1.5 border-dashed border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-purple-400 hover:border-purple-400/30 text-xs"
                    >
                        <ImageIcon size={13} /> + Mídia
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addBlock.mutate("SIGNATURE")}
                        disabled={addBlock.isPending}
                        className="gap-1.5 border-dashed border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-amber-400 hover:border-amber-400/30 text-xs"
                    >
                        <PenLine size={13} /> + Assinatura
                    </Button>
                </div>
            )}
        </div>
    );
}
