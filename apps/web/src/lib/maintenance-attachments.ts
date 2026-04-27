import { apiClient } from "@web/lib/api-client";

export async function uploadMaintenanceAttachments(
    endpointBasePath: string,
    osId: string | undefined,
    files: File[] | undefined,
    options?: { headers?: Record<string, string> },
) {
    if (!osId || !files || files.length === 0) {
        return;
    }

    const formData = new FormData();
    for (const file of files) {
        formData.append("files", file);
    }

    await apiClient.upload(`${endpointBasePath}/${osId}/attachments`, formData, options);
}
