import {
    OS_ATTACHMENT_IMAGE_MAX_BYTES,
    OS_ATTACHMENT_IMAGE_MIME_TYPES,
    OS_ATTACHMENT_REQUEST_MAX_FILES,
    OS_ATTACHMENT_VIDEO_MAX_BYTES,
    OS_ATTACHMENT_VIDEO_MIME_TYPES,
} from "@zyllen/shared";
import { maintenanceApi } from "@web/features/maintenance/api/maintenance-api";

const REQUEST_MAX_BYTES = OS_ATTACHMENT_VIDEO_MAX_BYTES;
const imageTypes = new Set<string>(OS_ATTACHMENT_IMAGE_MIME_TYPES);
const videoTypes = new Set<string>(OS_ATTACHMENT_VIDEO_MIME_TYPES);

export function validateMaintenanceAttachment(file: File): string | null {
    if (imageTypes.has(file.type)) {
        return file.size > OS_ATTACHMENT_IMAGE_MAX_BYTES
            ? `${file.name}: fotos podem ter no máximo 20 MB.`
            : null;
    }
    if (videoTypes.has(file.type)) {
        return file.size > OS_ATTACHMENT_VIDEO_MAX_BYTES
            ? `${file.name}: vídeos podem ter no máximo 80 MB.`
            : null;
    }
    return `${file.name}: formato não permitido. Use uma foto ou vídeo MP4, WebM, MOV ou AVI.`;
}

export function validateMaintenanceAttachments(files: File[]): void {
    const error = files.map(validateMaintenanceAttachment).find(Boolean);
    if (error) throw new Error(error);
}

function buildBatches(files: File[]): File[][] {
    const batches: File[][] = [];
    let current: File[] = [];
    let currentBytes = 0;

    for (const file of files) {
        if (
            current.length >= OS_ATTACHMENT_REQUEST_MAX_FILES
            || (current.length > 0 && currentBytes + file.size > REQUEST_MAX_BYTES)
        ) {
            batches.push(current);
            current = [];
            currentBytes = 0;
        }
        current.push(file);
        currentBytes += file.size;
    }
    if (current.length > 0) batches.push(current);
    return batches;
}

export async function uploadMaintenanceAttachments(
    endpointBasePath: string,
    osId: string | undefined,
    files: File[] | undefined,
    options?: { headers?: Record<string, string> },
) {
    if (!files || files.length === 0) return;
    if (!osId) throw new Error("Não foi possível identificar a OS para anexar os arquivos.");

    validateMaintenanceAttachments(files);
    for (const batch of buildBatches(files)) {
        const formData = new FormData();
        for (const file of batch) formData.append("files", file);
        await maintenanceApi.uploadAttachments(endpointBasePath, osId, formData, options);
    }
}
