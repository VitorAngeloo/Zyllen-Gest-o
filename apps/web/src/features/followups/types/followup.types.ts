


export type Tab = "list" | "new" | "detail";

export interface Company {
    id: string;
    name: string;
    cnpj?: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
}

export interface FollowupBlock {
    id: string;
    type: "TEXT" | "MEDIA" | "CHECKLIST" | "PDF" | "SIGNATURE";
    title?: string;
    content?: string;
    order: number;
    attachments: { id: string; fileName: string; filePath: string; mimeType?: string }[];
    checklistItems: { id: string; text: string; details?: string | null; checked: boolean; order: number }[];
    comments: { id: string; text: string; createdAt: string; author: { id: string; name: string } }[];
}

export interface Followup {
    id: string;
    code: string;
    status: string;
    responsibleName?: string;
    responsibleContact?: string;
    createdAt: string;
    updatedAt: string;
    company: Company;
    project?: { id: string; name: string } | null;
    createdBy: { id: string; name: string; email: string };
    blocks: FollowupBlock[];
    _count?: { blocks: number };
}
