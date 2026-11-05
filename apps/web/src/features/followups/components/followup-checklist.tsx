"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { FollowupChecklistEntry } from "@zyllen/shared";
import { Button } from "@web/components/ui/button";
import type { RequestOptions } from "@web/lib/api-client";
import { ChecklistItemPicker } from "./checklist-item-picker";
import { FollowupChecklistItem } from "./followup-checklist-item";

export function FollowupChecklist({ items, followupId, blockId, fetchOpts, readOnly }: {
    items: FollowupChecklistEntry[]; followupId: string; blockId: string; fetchOpts: RequestOptions; readOnly: boolean;
}) {
    const [picking, setPicking] = useState(false);
    return (
        <div className="space-y-3">
            {items.length ? items.map(item => (
                <FollowupChecklistItem key={item.id} item={item} followupId={followupId} blockId={blockId} fetchOpts={fetchOpts} readOnly={readOnly} />
            )) : <p className="text-sm text-[var(--zyllen-muted)]">Nenhum item na checklist.</p>}
            {!readOnly && (
                <Button type="button" variant="outline" onClick={() => setPicking(true)}><Plus size={16} /> Selecionar itens do catálogo</Button>
            )}
            {picking && !readOnly && <ChecklistItemPicker followupId={followupId} blockId={blockId} fetchOpts={fetchOpts} onClose={() => setPicking(false)} />}
        </div>
    );
}
