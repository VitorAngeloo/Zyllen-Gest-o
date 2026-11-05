"use client";
import { followupsApi } from "@web/features/followups/api/followups-api";
import { ShareAttachment } from '@web/components/media/share-attachment';
import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";

import { Card, CardContent } from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import { toast } from "sonner";
import { ClipboardList, Trash2, Edit, MessageSquare, Image, FileText, Send, X, ChevronDown, Upload, FileArchive, PenLine, Download } from "lucide-react";
import type { FollowupBlock } from "../types/followup.types";
import { API_URL } from "../followup.constants";
import { AttachmentImage } from "./attachment-image";
import { FollowupChecklist } from "./followup-checklist";

export function BlockCard({ block, followupId, index, fetchOpts, qc, readOnly }: {
    block: FollowupBlock;
    followupId: string;
    index: number;
    fetchOpts: any;
    qc: any;
    readOnly: boolean;
}) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(block.title ?? "");
    const [content, setContent] = useState(block.content ?? "");
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pdfFileInputRef = useRef<HTMLInputElement>(null);

    // Signature canvas state
    const sigCanvasRef = useRef<HTMLCanvasElement>(null);
    const [sigDrawing, setSigDrawing] = useState(false);
    const sigLastPos = useRef<{ x: number; y: number } | null>(null);
    const [savingSig, setSavingSig] = useState(false);

    const updateBlock = useMutation({
        mutationFn: (body: any) => followupsApi.updateBlock(followupId, block.id, body, fetchOpts),
        onSuccess: () => {
            toast.success("Bloco atualizado");
            qc.invalidateQueries({ queryKey: ["followup", followupId] });
            setEditing(false);
        },
        onError: (e: any) => toast.error(e.message),
    });

    const removeBlock = useMutation({
        mutationFn: () => followupsApi.deleteBlock(followupId, block.id, fetchOpts),
        onSuccess: () => {
            toast.success("Bloco removido");
            qc.invalidateQueries({ queryKey: ["followup", followupId] });
        },
        onError: (e: any) => toast.error(e.message),
    });

    const addComment = useMutation({
        mutationFn: (text: string) => followupsApi.createComment(followupId, block.id, { text }, fetchOpts),
        onSuccess: () => {
            toast.success("Comentário adicionado");
            qc.invalidateQueries({ queryKey: ["followup", followupId] });
            setNewComment("");
        },
        onError: (e: any) => toast.error(e.message),
    });

    const removeAttachment = useMutation({
        mutationFn: (attId: string) => followupsApi.deleteAttachment(followupId, block.id, attId, fetchOpts),
        onSuccess: () => {
            toast.success("Arquivo removido");
            qc.invalidateQueries({ queryKey: ["followup", followupId] });
        },
        onError: (e: any) => toast.error(e.message),
    });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        setUploading(true);
        try {
            const formData = new FormData();
            for (const f of Array.from(files)) formData.append("files", f);
            await followupsApi.uploadAttachments(followupId, block.id, formData, fetchOpts);
            toast.success("Upload concluído!");
            qc.invalidateQueries({ queryKey: ["followup", followupId] });
        } catch (e: any) {
            toast.error(e.message || "Erro no upload");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        setUploading(true);
        try {
            const formData = new FormData();
            for (const f of Array.from(files)) formData.append("files", f);
            await followupsApi.uploadAttachments(followupId, block.id, formData, fetchOpts);
            toast.success("PDF enviado!");
            qc.invalidateQueries({ queryKey: ["followup", followupId] });
        } catch (e: any) {
            toast.error(e.message || "Erro no upload");
        } finally {
            setUploading(false);
            if (pdfFileInputRef.current) pdfFileInputRef.current.value = "";
        }
    };

    // ── Signature canvas helpers ──
    const getSigPos = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const sigStartMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = sigCanvasRef.current;
        if (!canvas) return;
        setSigDrawing(true);
        sigLastPos.current = getSigPos(canvas, e.clientX, e.clientY);
    };

    const sigDrawMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!sigDrawing) return;
        const canvas = sigCanvasRef.current;
        if (!canvas || !sigLastPos.current) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const pos = getSigPos(canvas, e.clientX, e.clientY);
        ctx.beginPath();
        ctx.moveTo(sigLastPos.current.x, sigLastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        sigLastPos.current = pos;
    };

    const sigStartTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = sigCanvasRef.current;
        if (!canvas) return;
        setSigDrawing(true);
        const touch = e.touches[0];
        sigLastPos.current = getSigPos(canvas, touch.clientX, touch.clientY);
    };

    const sigDrawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (!sigDrawing) return;
        const canvas = sigCanvasRef.current;
        if (!canvas || !sigLastPos.current) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const touch = e.touches[0];
        const pos = getSigPos(canvas, touch.clientX, touch.clientY);
        ctx.beginPath();
        ctx.moveTo(sigLastPos.current.x, sigLastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        sigLastPos.current = pos;
    };

    const sigStop = () => {
        setSigDrawing(false);
        sigLastPos.current = null;
    };

    const clearSignature = () => {
        const canvas = sigCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
    };

    const saveSignature = async () => {
        const canvas = sigCanvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL("image/png");
        setSavingSig(true);
        try {
            await followupsApi.updateBlock(followupId, block.id, { title: block.title ?? "", content: dataUrl }, fetchOpts);
            toast.success("Assinatura salva!");
            qc.invalidateQueries({ queryKey: ["followup", followupId] });
        } catch (e: any) {
            toast.error(e.message || "Erro ao salvar assinatura");
        } finally {
            setSavingSig(false);
        }
    };

    const isText = block.type === "TEXT";
    const isMedia = block.type === "MEDIA";
    const isChecklist = block.type === "CHECKLIST";
    const isPdf = block.type === "PDF";
    const isSignature = block.type === "SIGNATURE";

    const blockIconColor = isText
        ? "bg-blue-500/15 text-blue-400"
        : isMedia
        ? "bg-purple-500/15 text-purple-400"
        : isChecklist
        ? "bg-green-500/15 text-green-400"
        : isPdf
        ? "bg-orange-500/15 text-orange-400"
        : "bg-pink-500/15 text-pink-400";

    const blockIcon = isText ? <FileText size={14} />
        : isMedia ? <Image size={14} />
        : isChecklist ? <ClipboardList size={14} />
        : isPdf ? <FileArchive size={14} />
        : <PenLine size={14} />;

    const blockLabel = isText ? "Texto"
        : isMedia ? "Mídia"
        : isChecklist ? "Checklist"
        : isPdf ? "PDF"
        : "Assinatura";

    return (
        <Card className="bg-[var(--zyllen-bg)] border-[var(--zyllen-border)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Block header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)]/50">
                <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center size-7 rounded ${blockIconColor}`}>
                        {blockIcon}
                    </div>
                    {editing ? (
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Título do bloco (opcional)"
                            className="h-7 px-2 rounded bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/30"
                            autoFocus
                        />
                    ) : (
                        <span className="text-white text-sm font-medium">
                            {block.title || `Bloco ${index + 1}`}
                        </span>
                    )}
                    <span className="text-xs text-[var(--zyllen-muted)]">{blockLabel}</span>
                </div>
                {!readOnly && (
                    <div className="flex items-center gap-1">
                        {editing ? (
                            <>
                                <Button size="sm" variant="ghost" onClick={() => updateBlock.mutate({ title, content })} className="text-[var(--zyllen-highlight)] text-xs h-7">Salvar</Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setTitle(block.title ?? ""); setContent(block.content ?? ""); }} className="text-[var(--zyllen-muted)] text-xs h-7">Cancelar</Button>
                            </>
                        ) : (
                            <>
                                <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="text-[var(--zyllen-muted)] hover:text-white h-7 w-7 p-0">
                                    <Edit size={14} />
                                </Button>
                                <Button
                                    size="sm" variant="ghost"
                                    onClick={() => { if (confirm("Remover este bloco?")) removeBlock.mutate(); }}
                                    className="text-[var(--zyllen-muted)] hover:text-[var(--zyllen-error)] h-7 w-7 p-0"
                                >
                                    <Trash2 size={14} />
                                </Button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Block content */}
            <CardContent className="p-4 space-y-3">
                {/* Text content */}
                {isText && (
                    editing ? (
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                            placeholder="Digite suas anotações aqui..."
                            className="w-full px-3 py-2 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm placeholder:text-[var(--zyllen-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30 resize-y"
                        />
                    ) : (
                        <div className="text-white text-sm whitespace-pre-wrap min-h-[2rem]">
                            {block.content || <span className="text-[var(--zyllen-muted)] italic">Sem conteúdo. Clique em editar para adicionar texto.</span>}
                        </div>
                    )
                )}

                {/* Media zone */}
                {isMedia && (
                    <div className="space-y-3">
                        {block.attachments.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {block.attachments.map((att) => {
                                    const isImg = att.mimeType?.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp)$/i.test(att.fileName);
                                    const isVid = att.mimeType?.startsWith("video/") || /\.(mp4|webm|mov|avi)$/i.test(att.fileName);
                                    const baseUrl = `${API_URL}/media/followup/${encodeURIComponent(att.id)}/file`;
                                    return (
                                        <div key={att.id} className="relative group rounded-lg overflow-hidden border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)]">
                                            <ShareAttachment kind="followup" id={att.id} fileName={att.fileName} />
                                            {isImg && (
                                                <AttachmentImage
                                                    baseUrl={baseUrl}
                                                    alt={att.fileName}
                                                    className="w-full h-32 object-cover"
                                                />
                                            )}
                                            {isVid && (
                                                <video src={baseUrl} controls playsInline preload="metadata" className="w-full h-32 object-cover bg-black" />
                                            )}
                                            {!isImg && !isVid && (
                                                <div className="w-full h-20 flex items-center justify-center text-[var(--zyllen-muted)]">
                                                    <FileText size={32} />
                                                </div>
                                            )}
                                            <div className={`${isImg ? "absolute bottom-0 left-0 right-0 bg-black/70" : ""} px-2 py-1 flex items-center justify-between`}>
                                                <span className="text-xs text-white truncate flex-1">{att.fileName}</span>
                                                {!readOnly && (
                                                    <button onClick={() => removeAttachment.mutate(att.id)} className="text-[var(--zyllen-error)] hover:text-white ml-1">
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {!readOnly && (
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    multiple
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="gap-1 border-dashed border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)] hover:border-[var(--zyllen-highlight)]/30"
                                >
                                    <Upload size={14} />
                                    {uploading ? "Enviando..." : "Upload de imagem/vídeo"}
                                </Button>
                            </div>
                        )}
                        {/* Also allow text caption for media blocks */}
                        {editing ? (
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={2}
                                placeholder="Descrição / legenda do bloco (opcional)"
                                className="w-full px-3 py-2 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-sm placeholder:text-[var(--zyllen-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--zyllen-highlight)]/30 resize-y"
                            />
                        ) : block.content ? (
                            <p className="text-white text-sm whitespace-pre-wrap">{block.content}</p>
                        ) : null}
                    </div>
                )}

                {/* Checklist */}
                {isChecklist && (
                    <FollowupChecklist items={block.checklistItems} followupId={followupId} blockId={block.id} fetchOpts={fetchOpts} readOnly={readOnly} />
                )}

                {/* PDF block */}
                {isPdf && (
                    <div className="space-y-3">
                        {block.attachments.length > 0 ? (
                            <div className="space-y-2">
                                {block.attachments.map((att) => {
                                    const tkn = typeof window !== "undefined" ? localStorage.getItem("accessToken") : "";
                                    const url = `${API_URL}/media/followup/${encodeURIComponent(att.id)}/file`;
                                    return (
                                        <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)]">
                                            <div className="size-8 rounded flex items-center justify-center bg-orange-500/15 text-orange-400 shrink-0">
                                                <FileArchive size={16} />
                                            </div>
                                            <span className="text-sm text-white flex-1 truncate">{att.fileName}</span>
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)] transition-colors"
                                                title="Abrir PDF"
                                            >
                                                <Download size={16} />
                                            </a>
                                            <ShareAttachment kind="followup" id={att.id} fileName={att.fileName} />
                                            {!readOnly && (
                                                <button onClick={() => removeAttachment.mutate(att.id)} className="text-[var(--zyllen-error)] hover:text-white">
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-[var(--zyllen-muted)] italic">Nenhum PDF anexado.</p>
                        )}
                        {!readOnly && (
                            <>
                                <input
                                    ref={pdfFileInputRef}
                                    type="file"
                                    accept="application/pdf"
                                    multiple
                                    onChange={handlePdfUpload}
                                    className="hidden"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => pdfFileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="gap-1 border-dashed border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-[var(--zyllen-highlight)] hover:border-[var(--zyllen-highlight)]/30"
                                >
                                    <Upload size={14} />
                                    {uploading ? "Enviando..." : "Adicionar PDF"}
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {/* Signature block */}
                {isSignature && (
                    <div className="space-y-3">
                        {block.content?.startsWith("data:image/") ? (
                            <div className="space-y-2">
                                <img
                                    src={block.content}
                                    alt="Assinatura"
                                    className="max-w-full rounded-lg border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)]"
                                    style={{ maxHeight: 200 }}
                                />
                                {!readOnly && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateBlock.mutate({ title: block.title ?? "", content: "" })}
                                        className="gap-1 border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-[var(--zyllen-error)] hover:border-[var(--zyllen-error)]/30"
                                    >
                                        <X size={14} /> Refazer Assinatura
                                    </Button>
                                )}
                            </div>
                        ) : !readOnly ? (
                            <div className="space-y-2">
                                <p className="text-xs text-[var(--zyllen-muted)]">Assine no campo abaixo com o mouse ou toque:</p>
                                <canvas
                                    ref={sigCanvasRef}
                                    width={600}
                                    height={200}
                                    className="w-full rounded-lg border-2 border-dashed border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] cursor-crosshair touch-none"
                                    style={{ maxHeight: 200 }}
                                    onMouseDown={sigStartMouse}
                                    onMouseMove={sigDrawMouse}
                                    onMouseUp={sigStop}
                                    onMouseLeave={sigStop}
                                    onTouchStart={sigStartTouch}
                                    onTouchMove={sigDrawTouch}
                                    onTouchEnd={sigStop}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={clearSignature}
                                        className="gap-1 border-[var(--zyllen-border)] text-[var(--zyllen-muted)] hover:text-white"
                                    >
                                        <X size={14} /> Limpar
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={saveSignature}
                                        disabled={savingSig}
                                        className="gap-1 bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg-dark)] hover:bg-[var(--zyllen-highlight)]/90"
                                    >
                                        <PenLine size={14} /> {savingSig ? "Salvando..." : "Salvar Assinatura"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-[var(--zyllen-muted)] italic">Nenhuma assinatura registrada.</p>
                        )}
                    </div>
                )}

                {/* Comments section */}
                <div className="pt-2 border-t border-[var(--zyllen-border)]">
                    <button
                        onClick={() => setShowComments(!showComments)}
                        className="flex items-center gap-1.5 text-xs text-[var(--zyllen-muted)] hover:text-white transition-colors"
                    >
                        <MessageSquare size={12} />
                        {block.comments.length} comentário(s)
                        <ChevronDown size={12} className={`transition-transform ${showComments ? "rotate-180" : ""}`} />
                    </button>

                    {showComments && (
                        <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            {block.comments.map((c) => (
                                <div key={c.id} className="flex gap-2 text-xs">
                                    <div className="size-6 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)] flex items-center justify-center font-bold text-[10px] shrink-0">
                                        {c.author.name.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="text-white font-medium">{c.author.name}</span>
                                        <span className="text-[var(--zyllen-muted)] ml-2">{new Date(c.createdAt).toLocaleString("pt-BR")}</span>
                                        <p className="text-[var(--zyllen-muted)] mt-0.5">{c.text}</p>
                                    </div>
                                </div>
                            ))}

                            {/* New comment input */}
                            {!readOnly && (
                                <div className="flex gap-2 mt-2">
                                    <input
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter" && newComment.trim()) addComment.mutate(newComment.trim()); }}
                                        placeholder="Escreva um comentário..."
                                        className="flex-1 h-8 px-3 rounded-md bg-[var(--zyllen-bg-dark)] border border-[var(--zyllen-border)] text-white text-xs placeholder:text-[var(--zyllen-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--zyllen-highlight)]/30"
                                    />
                                    <Button
                                        size="sm"
                                        disabled={!newComment.trim()}
                                        onClick={() => { if (newComment.trim()) addComment.mutate(newComment.trim()); }}
                                        className="h-8 w-8 p-0 bg-[var(--zyllen-highlight)] text-[var(--zyllen-bg-dark)]"
                                    >
                                        <Send size={12} />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
