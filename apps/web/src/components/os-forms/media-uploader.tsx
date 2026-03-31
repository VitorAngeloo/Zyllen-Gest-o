"use client";
import { useRef, useState } from "react";
import { Label } from "@web/components/ui/label";
import { Paperclip, X, Video, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface MediaAttachment {
    id: string;
    fileName: string;
    filePath: string;
    mimeType?: string | null;
    createdAt: string;
}

interface MediaUploaderProps {
    /** OS id — when undefined (new OS), shows disabled placeholder */
    osId?: string;
    /** Current list of attachments from the server */
    attachments?: MediaAttachment[];
    /** Callback after upload/delete to refresh list */
    onRefresh?: () => void;
    /** API base path (e.g. '/maintenance' or '/contractor/maintenance') */
    apiBasePath?: string;
    /** When true, hide upload/delete controls */
    readOnly?: boolean;
}

const ACCEPTED = "image/jpeg,image/png,image/gif,image/webp,image/bmp,video/mp4,video/webm,video/quicktime,video/x-msvideo";

export function MediaUploader({ osId, attachments = [], onRefresh, apiBasePath, readOnly }: MediaUploaderProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const enabled = !!(osId && apiBasePath && onRefresh);

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const uploadFiles = async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;
        setError(null);
        setUploading(true);
        try {
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append("files", files[i]);
            }
            const res = await fetch(`${API_BASE}${apiBasePath}/${osId}/attachments`, {
                method: "POST",
                headers,
                body: formData,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || "Erro ao enviar arquivos");
            }
            onRefresh?.();
        } catch (err: any) {
            setError(err.message || "Erro ao enviar arquivos");
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) uploadFiles(e.target.files);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (!readOnly && e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
    };

    const handleDelete = async (attachmentId: string) => {
        if (!confirm("Remover este arquivo?")) return;
        setDeletingId(attachmentId);
        try {
            const res = await fetch(`${API_BASE}${apiBasePath}/${osId}/attachments/${attachmentId}`, {
                method: "DELETE",
                headers,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || "Erro ao remover");
            }
            onRefresh?.();
        } catch (err: any) {
            setError(err.message || "Erro ao remover arquivo");
        } finally {
            setDeletingId(null);
        }
    };

    const isImage = (mime?: string | null) => mime?.startsWith("image/");
    const isVideo = (mime?: string | null) => mime?.startsWith("video/");
    const fileUrl = (att: MediaAttachment) =>
        `${API_BASE}${apiBasePath}/${osId}/attachments/${att.id}/file`;

    return (
        <div className="space-y-3">
            <Label className="text-[var(--zyllen-muted)]">Anexos (opcional)</Label>

            {/* Drop zone */}
            {!readOnly && (
                <>
                    <input
                        ref={fileRef}
                        type="file"
                        accept={ACCEPTED}
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={!enabled}
                    />
                    <button
                        type="button"
                        onClick={() => enabled && fileRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); if (enabled) setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { if (enabled) handleDrop(e); else e.preventDefault(); }}
                        disabled={uploading || !enabled}
                        className={`w-full rounded-lg border-2 border-dashed py-8 flex flex-col items-center justify-center gap-2 transition-colors ${
                            !enabled
                                ? "border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)] opacity-50 cursor-not-allowed"
                                : dragOver
                                    ? "border-[var(--zyllen-highlight)] bg-[var(--zyllen-highlight)]/5 cursor-pointer"
                                    : "border-[var(--zyllen-border)] hover:border-[var(--zyllen-muted)] bg-[var(--zyllen-bg-dark)] cursor-pointer"
                        }`}
                    >
                        {uploading ? (
                            <Loader2 size={24} className="text-[var(--zyllen-muted)] animate-spin" />
                        ) : (
                            <Paperclip size={24} className="text-[var(--zyllen-muted)]" />
                        )}
                        <span className="text-sm text-[var(--zyllen-muted)]">
                            {!enabled
                                ? "Salve a OS primeiro para habilitar o upload de anexos"
                                : uploading
                                    ? "Enviando..."
                                    : "Clique para anexar fotos ou vídeos"}
                        </span>
                        <span className="text-xs text-[var(--zyllen-muted)]/50">
                            Máx. 20 MB por arquivo (imagens e vídeos)
                        </span>
                    </button>
                </>
            )}

            {error && (
                <p className="text-xs text-red-400">{error}</p>
            )}

            {/* Grid of attachments */}
            {attachments.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                    {attachments.map((att) => (
                        <div
                            key={att.id}
                            className="relative group rounded-lg overflow-hidden border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)]"
                        >
                            {isImage(att.mimeType) ? (
                                <a href={fileUrl(att)} target="_blank" rel="noopener noreferrer">
                                    <img
                                        src={fileUrl(att)}
                                        alt={att.fileName}
                                        className="w-full h-28 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                    />
                                </a>
                            ) : isVideo(att.mimeType) ? (
                                <a href={fileUrl(att)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-28 bg-black/40 hover:bg-black/60 transition-colors cursor-pointer">
                                    <Video size={32} className="text-[var(--zyllen-highlight)]" />
                                </a>
                            ) : (
                                <a href={fileUrl(att)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-28 hover:bg-[var(--zyllen-bg)] transition-colors cursor-pointer">
                                    <Paperclip size={32} className="text-[var(--zyllen-muted)]" />
                                </a>
                            )}

                            {/* File name */}
                            <div className="px-2 py-1">
                                <p className="text-[10px] text-[var(--zyllen-muted)] truncate" title={att.fileName}>
                                    {att.fileName}
                                </p>
                            </div>

                            {/* Delete button */}
                            {!readOnly && (
                                <button
                                    type="button"
                                    onClick={() => handleDelete(att.id)}
                                    disabled={deletingId === att.id}
                                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    title="Remover"
                                >
                                    {deletingId === att.id ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                        <X size={12} />
                                    )}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {attachments.length === 0 && readOnly && (
                <p className="text-xs text-[var(--zyllen-muted)]/50 italic">Nenhuma foto ou vídeo anexado</p>
            )}
        </div>
    );
}
