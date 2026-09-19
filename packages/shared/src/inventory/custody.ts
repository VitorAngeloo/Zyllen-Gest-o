import { z } from 'zod';

export const LOCATION_KINDS = ['INTERNAL', 'CLIENT'] as const;
export type LocationKind = typeof LOCATION_KINDS[number];
export const AVAILABLE_ASSET_STATUS = 'ATIVO' as const;
export const TRANSFER_KINDS = ['SHIPMENT', 'RETURN', 'INTERNAL'] as const;
export const inventoryTransferSchema = z.object({
    requestId: z.string().uuid(),
    kind: z.enum(TRANSFER_KINDS),
    fromLocationId: z.string().uuid(),
    toLocationId: z.string().uuid(),
    movementTypeId: z.string().uuid(),
    assetIds: z.array(z.string().uuid()).min(1).max(100),
    reason: z.string().trim().min(1).max(2000),
    returnStatus: z.enum(['ATIVO', 'EM_MANUTENCAO']).optional(),
    pin: z.string().regex(/^\d{4}$/, 'Informe o PIN de quatro dígitos'),
}).strict().superRefine((value, context) => {
    if (value.fromLocationId === value.toLocationId) context.addIssue({ code: 'custom', path: ['toLocationId'], message: 'Escolha um destino diferente da origem' });
    if (value.kind !== 'RETURN' && value.returnStatus) context.addIssue({ code: 'custom', path: ['returnStatus'], message: 'Condição de retorno somente para devoluções' });
    if (new Set(value.assetIds).size !== value.assetIds.length) context.addIssue({ code: 'custom', path: ['assetIds'], message: 'Há patrimônios repetidos na seleção' });
});
export type InventoryTransferInput = z.infer<typeof inventoryTransferSchema>;
export const custodyQuerySchema = z.object({
    scope: z.enum(['CLIENT', 'INTERNAL', 'ALL']).optional(),
    locationId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
    search: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict().superRefine((value, context) => {
    if (value.companyId && value.scope && value.scope !== 'CLIENT') {
        context.addIssue({ code: 'custom', path: ['companyId'], message: 'Empresa somente na visao de clientes' });
    }
});
export type CustodyQuery = z.infer<typeof custodyQuerySchema>;
export interface CustodyLocation {
    id: string; name: string; kind: LocationKind | null; companyId: string | null; projectId: string | null;
    isMainWarehouse: boolean | null; company: { id: string; name: string } | null; project: { id: string; name: string } | null;
    _count: { assets: number };
}
export interface CustodyAsset {
    id: string; assetCode: string; status: string; currentLocationId: string | null;
    sku: { id: string; skuCode: string; name: string; brand: string | null };
    currentLocation: { id: string; name: string; kind: LocationKind | null; company: { id: string; name: string } | null; project: { id: string; name: string } | null } | null;
    shipmentAt: string | null;
}
export interface InventoryTransferRecord {
    id: string; kind: typeof TRANSFER_KINDS[number]; status: 'PENDING' | 'COMPLETED' | 'REJECTED';
    fromLocationId: string; toLocationId: string; approvalRequestId: string | null; reason: string;
    createdAt: string; completedAt: string | null; items: { assetId: string; asset: { id: string; assetCode: string; status: string }; movementId: string | null }[];
    fromLocation: { id: string; name: string }; toLocation: { id: string; name: string };
}
export interface CustodyOptions {
    locations: CustodyLocation[];
    companies: { id: string; name: string; projects: { id: string; name: string }[] }[];
    movementTypes: { id: string; name: string; requiresApproval: boolean }[];
    diagnostic: { unlocatedAssets: number; unclassifiedAssets: number; unclassifiedLocations: number };
}
