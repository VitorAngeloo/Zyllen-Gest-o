"use client";
import { useRef, useState } from "react";
import { Label } from "@web/components/ui/label";
import { Paperclip, X, Video, Loader2, Camera, AlertCircle, Check } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface MediaAttachment {
    id: string;
    fileName: string;
    filePath: string;
    mimeType?: string | null;
    createdAt: string;
}

export interface LocalMediaFile {
    id: string;
    file: File;
    preview?: string;
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
    /** Local files pending upload (for new OS or during edit) */
    localFiles?: LocalMediaFile[];
    /** Callback to update local files */
    onLocalFilesChange?: (files: LocalMediaFile[]) => void;
    /** When true, queue new files to localFiles instead of uploading directly */
    editMode?: boolean;
}

const ACCEPTED = "image/jpeg,image/png,image/gif,image/webp,image/bmp,video/mp4,video/webm,video/quicktime,video/x-msvideo";

export function MediaUploader({ 
    osId, 
    attachments = [], 
    onRefresh, 
    apiBasePath, 
    readOnly,
    localFiles = [],
    onLocalFilesChange,
    editMode = false,
}: MediaUploaderProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const canUploadToServer = !!(osId && apiBasePath && onRefresh);

    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const addLocalFiles = (files: FileList | File[]) => {
        if (!files || files.length === 0) return;
        const newFiles: LocalMediaFile[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const id = `local-${Date.now()}-${Math.random()}`;
            newFiles.push({ id, file });
        }
        onLocalFilesChange?.([...localFiles, ...newFiles]);
    };

    const removeLocalFile = (fileId: string) => {
        const updated = localFiles.filter((f) => f.id !== fileId);
        onLocalFilesChange?.(updated);
    };

    const uploadFiles = async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;
        
        // In edit mode, always queue files locally (will be sent with form submit)
        if (editMode) {
            addLocalFiles(files);
            return;
        }
        
        // If OS doesn't exist yet, store locally
        if (!osId) {
            addLocalFiles(files);
            return;
        }

        // OS exists and not in edit mode, upload to server directly
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
            if (cameraRef.current) cameraRef.current.value = "";
        }
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

            {/* Drop zone / File upload area */}
            {!readOnly && (
                <>
                    {/* Hidden file inputs */}
                    <input
                        ref={fileRef}
                        type="file"
                        accept={ACCEPTED}
                        multiple
                        onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.currentTarget.value = ""; }}
                        className="hidden"
                    />
                    <input
                        ref={cameraRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.currentTarget.value = ""; }}
                        className="hidden"
                    />

                    {/* Info message about pending uploads */}
                    {!osId && localFiles.length > 0 && (
                        <div className="p-3 rounded-lg bg-[var(--zyllen-highlight)]/10 border border-[var(--zyllen-highlight)]/30 flex gap-2 items-start">
                            <AlertCircle size={16} className="text-[var(--zyllen-highlight)] flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-[var(--zyllen-highlight)]">
                                {localFiles.length} arquivo(s) será(ão) anexado(s) após você salvar a OS
                            </p>
                        </div>
                    )}

                    {/* Drop zone */}
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { handleDrop(e); }}
                        disabled={uploading || readOnly}
                        className={`w-full rounded-lg border-2 border-dashed py-8 flex flex-col items-center justify-center gap-2 transition-colors ${
                            dragOver
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
                            {uploading
                                ? "Enviando..."
                                : osId 
                                    ? "Clique para anexar fotos ou vídeos"
                                    : "Clique para adicionar fotos ou vídeos"}
                        </span>
                        <span className="text-xs text-[var(--zyllen-muted)]/50">
                            Máx. 20 MB por arquivo (imagens e vídeos)
                        </span>
                    </button>

                    {/* Camera button */}
                    <button
                        type="button"
                        onClick={() => cameraRef.current?.click()}
                        disabled={uploading || readOnly}
                        className={`w-full rounded-lg border py-3 flex items-center justify-center gap-2 text-sm transition-colors border-[var(--zyllen-border)] text-[var(--zyllen-muted)] bg-[var(--zyllen-bg-dark)] hover:border-[var(--zyllen-highlight)] hover:text-[var(--zyllen-highlight)] cursor-pointer`}
                    >
                        <Camera size={16} />
                        Tirar foto agora
                    </button>
                </>
            )}

            {error && (
                <p className="text-xs text-red-400">{error}</p>
            )}

            {/* Local files preview (waiting upload) */}
            {localFiles.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--zyllen-muted)]/70">Arquivos pendentes:</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)]">{localFiles.length}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {localFiles.map((item) => {
                            const isImage = item.file.type.startsWith("image/");
                            const isVideo = item.file.type.startsWith("video/");
                            const previewUrl = isImage || isVideo ? URL.createObjectURL(item.file) : undefined;
                            
                            return (
                                <div
                                    key={item.id}
                                    className="relative group rounded-lg overflow-hidden border border-[var(--zyllen-border)] bg-[var(--zyllen-bg-dark)]"
                                >
                                    {isImage ? (
                                        <img
                                            src={previewUrl}
                                            alt={item.file.name}
                                            className="w-full h-28 object-cover"
                                            onLoad={(e) => { if (previewUrl) URL.revokeObjectURL(previewUrl); }}
                                        />
                                    ) : isVideo ? (
                                        <div className="flex items-center justify-center h-28 bg-black/40">
                                            <Video size={32} className="text-[var(--zyllen-highlight)]" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-28">
                                            <Paperclip size={32} className="text-[var(--zyllen-muted)]" />
                                        </div>
                                    )}

                                    <div className="px-2 py-1">
                                        <p className="text-[10px] text-[var(--zyllen-muted)] truncate" title={item.file.name}>
                                            {item.file.name}
                                        </p>
                                    </div>

                                    {/* Pending badge */}
                                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-[var(--zyllen-highlight)]/20 text-[var(--zyllen-highlight)]">
                                        <span className="text-[9px] font-semibold">PENDENTE</span>
                                    </div>

                                    {/* Delete button */}
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={() => removeLocalFile(item.id)}
                                            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                            title="Remover"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Grid of attachments from server */}
            {attachments.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[var(--zyllen-muted)]/70">Arquivos salvos:</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                            <Check size={10} /> {attachments.length}
                        </span>
                    </div>
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
                </div>
            )}

            {attachments.length === 0 && readOnly && (
                <p className="text-xs text-[var(--zyllen-muted)]/50 italic">Nenhuma foto ou vídeo anexado</p>
            )}
        </div>
    );
}
