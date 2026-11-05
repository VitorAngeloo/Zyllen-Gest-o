

export enum FollowupStatus {
    IN_PROGRESS = 'IN_PROGRESS',
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
}

export interface FollowupChecklistCatalogItem {
    id: string;
    text: string;
    components?: FollowupChecklistComponentTemplate[];
}

export interface FollowupChecklistComponent {
    text: string;
    quantity: number;
    checked?: boolean;
}

export interface FollowupChecklistComponentTemplate extends Pick<FollowupChecklistComponent, 'text' | 'quantity'> {
    selectedByDefault: boolean;
}

export interface FollowupChecklistEntry {
    id: string;
    text: string;
    details?: string | null;
    /** Historical entries have no inferred quantity. */
    quantity?: number | null;
    components?: FollowupChecklistComponent[] | null;
    checked: boolean;
    order: number;
}
