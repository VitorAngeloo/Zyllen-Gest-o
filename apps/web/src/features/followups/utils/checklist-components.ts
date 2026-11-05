import type { FollowupChecklistCatalogItem, FollowupChecklistComponent } from "@zyllen/shared";

export interface ChecklistComponentDraft {
    text: string;
    quantity: string;
}

export function componentNameKey(text: string) {
    return text.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function defaultComponentSelection(item: FollowupChecklistCatalogItem): ChecklistComponentDraft[] {
    return (item.components ?? []).filter(component => component.selectedByDefault)
        .map(component => ({ text: component.text, quantity: String(component.quantity) }));
}

export function componentInputs(drafts: ChecklistComponentDraft[]): FollowupChecklistComponent[] {
    return drafts.map(component => ({ text: component.text, quantity: Number(component.quantity) }));
}
