import { apiClient, type RequestOptions } from "@web/lib/api-client";
import { printOsPdf, type OsPdfData } from "@web/features/maintenance/utils/os-pdf";
import { toast } from "sonner";

type Attachment = NonNullable<OsPdfData["attachments"]>[number];
let generating = false;

export function hasOsVideos(data: OsPdfData): boolean {
    return !!data.attachments?.some(att => att.mimeType?.startsWith("video/"))
        || !!data.followupBlocks?.some(block => block.attachments.some(att => att.mimeType?.startsWith("video/")));
}

/** Generating a PDF as manager grants its video recipients the existing 24-hour access. */
export async function printOsPdfWithVideoSharing(data: OsPdfData, canShare: boolean, options: RequestOptions, popup: Window | null): Promise<void> {
    if (!canShare || !hasOsVideos(data)) {
        printOsPdf(data, popup);
        return;
    }
    if (generating) {
        popup?.close();
        return;
    }
    generating = true;
    const created: string[] = [];
    const urls = new Map<string, string>();
    try {
        const share = async (kind: "maintenance" | "os-followup", att: Attachment): Promise<Attachment> => {
            if (!att.mimeType?.startsWith("video/")) return att;
            const key = `${kind}:${att.id}`;
            let url = urls.get(key);
            if (!url) {
                const response = await apiClient.post<{ data: { id: string; expiresAt: string; url: string } }>(
                    `/media/${kind}/${encodeURIComponent(att.id)}/shares`, {}, options,
                );
                created.push(response.data.id);
                const match = response.data.url.match(/^\/media\/shared\/([A-Za-z0-9_-]{43})$/);
                if (!match) throw new Error("Resposta de compartilhamento inválida");
                const viewer = new URL("/os/video-compartilhado", window.location.origin);
                viewer.searchParams.set("token", match[1]);
                url = viewer.href;
                urls.set(key, url);
            }
            return { ...att, fileUrl: url };
        };
        const attachments: Attachment[] = [];
        for (const att of data.attachments ?? []) attachments.push(await share("maintenance", att));
        const followupBlocks: NonNullable<OsPdfData["followupBlocks"]> = [];
        for (const block of data.followupBlocks ?? []) {
            const blockAttachments: Attachment[] = [];
            for (const att of block.attachments) blockAttachments.push(await share("os-followup", att));
            followupBlocks.push({ ...block, attachments: blockAttachments });
        }
        printOsPdf({ ...data, attachments, followupBlocks }, popup);
    } catch (error) {
        await Promise.allSettled(created.map(id => apiClient.delete(`/media/shares/${encodeURIComponent(id)}`, options)));
        const withoutVideoLinks = (att: Attachment): Attachment => att.mimeType?.startsWith("video/") ? { ...att, fileUrl: "" } : att;
        printOsPdf({
            ...data,
            attachments: data.attachments?.map(withoutVideoLinks),
            followupBlocks: data.followupBlocks?.map(block => ({ ...block, attachments: block.attachments.map(withoutVideoLinks) })),
        }, popup);
        toast.warning(error instanceof Error
            ? `PDF gerado sem links dos vídeos: ${error.message}`
            : "PDF gerado sem links dos vídeos. Tente novamente para compartilhar os vídeos.");
    } finally {
        generating = false;
    }
}
