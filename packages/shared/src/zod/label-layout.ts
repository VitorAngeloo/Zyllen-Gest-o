import { z } from 'zod';

const mm = z.number().finite().min(0).max(500);
const dimension = mm.positive();
export const labelLayoutSchema = z.object({
    id: z.string().max(200).optional(),
    name: z.string().min(1).max(200).default('Template'),
    description: z.string().max(2000).optional(),
    widthMm: dimension.default(50), heightMm: dimension.default(30),
    columns: z.number().int().min(1).max(20).default(1),
    gapXMm: mm.default(2), gapYMm: mm.default(0),
    marginTopMm: mm.default(1.5), marginLeftMm: mm.default(1.5),
    dpi: z.number().int().min(72).max(1200).default(203),
    offsetXMm: z.number().finite().min(-500).max(500).default(0),
    offsetYMm: z.number().finite().min(-500).max(500).default(0),
    elements: z.array(z.object({
        id: z.string().min(1).max(200),
        type: z.enum(['text', 'itemName', 'assetCode', 'sku', 'location', 'date', 'barcode', 'qrcode', 'logo', 'line']),
        xMm: mm, yMm: mm, text: z.string().max(4000).optional(),
        fontMm: dimension.optional(), widthMm: dimension.optional(),
        maxLines: z.number().int().min(1).max(100).optional(),
        sizeMm: dimension.optional(), heightMm: dimension.optional(),
    }).strict()).max(200),
}).strict();

export const labelLayoutJsonSchema = z.string().min(1).max(256_000).refine((value) => {
    try { return labelLayoutSchema.safeParse(JSON.parse(value)).success; }
    catch { return false; }
}, 'Layout inválido: informe dimensões numéricas e elementos válidos');
