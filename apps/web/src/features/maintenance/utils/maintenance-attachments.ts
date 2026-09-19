import { maintenanceApi } from "@web/features/maintenance/api/maintenance-api";
export async function uploadMaintenanceAttachments(
    endpointBasePath: string,
    osId: string | undefined,
    files: File[] | undefined,
    options?: { headers?: Record<string, string> },
) {
    if (!files || files.length === 0) {
        return;
    }

    if (!osId) {
        throw new Error("Nao foi possivel identificar a OS para anexar os arquivos.");
    }

    const formData = new FormData();
    for (const file of files) {
        formData.append("files", file);
    }

    await maintenanceApi.uploadAttachments(endpointBasePath, osId, formData, options);
}
