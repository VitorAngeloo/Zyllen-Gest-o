import { checklistComponentsSchema, type FollowupChecklistComponent } from '@zyllen/shared';

export function componentKey(text: string) {
    return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

/** Match legacy numbered labels and generic kit names, retaining specific models. */
export function checklistGroupKey(text: string) {
    const key = componentKey(text)
        .replace(/^\d+\s*[-–.)]\s*/, '')
        .replace(/^\d+\s+(?=[a-zà-ú])/, '')
        .replace(/\s*\((?:e seus componentes|mais acessórios)\)\s*$/, '')
        .replace(/^computadores$/, 'computador');
    if (/^(?:kits?(?: de)? )?suportes?(?: (?:de|para))? projetor(?:es)?$/.test(key)) {
        return 'suporte de projetor';
    }
    return key;
}

export function storedChecklistComponents(value: unknown): FollowupChecklistComponent[] | null {
    if (value == null) return null;
    const parsed = checklistComponentsSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
}

/** Extract component lines, never single-line notes or specifications such as 32GB/1TB. */
export function historicalChecklistComponents(details: string | null): FollowupChecklistComponent[] {
    if (!details?.trim()) return [];
    const lines = details.replace(/[•●▪◦°]\s*/g, '\n').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length < 2 && !/[•●▪◦°]/.test(details)) return [];
    const result = new Map<string, FollowupChecklistComponent>();
    for (const line of lines) {
        if (/^(?:ser[aá]|n[aã]o|obs\b|observa[çc][aã]o|s[oó] tem)\b/i.test(line)) continue;
        // A frequent legacy line joins the RAM specification and the power supply.
        for (const part of line.split(/\s+(?=fonte\s+\d)/i)) {
            let text = part.replace(/^(?:[-*]\s+|\[\s*[xX]?\s*\]\s*)/, '').trim();
            let quantity = 1;
            const prefix = /^(\d+)\s*(?:[-–x×]\s*|\s+)(?=[a-zà-ú])/i.exec(text);
            if (prefix && !/^(?:gb|tb|mb|w|v|mm|cm|mts?|hz)\b/i.test(text.slice(prefix[0].length))) {
                const count = Number(prefix[1]);
                if (count > 0 && count <= 2147483647) {
                    quantity = count;
                    text = text.slice(prefix[0].length).trim();
                }
            }
            if (text && text.length <= 500) {
                const key = componentKey(text);
                if (!result.has(key)) result.set(key, { text, quantity });
            }
        }
    }
    return [...result.values()].slice(0, 100);
}
