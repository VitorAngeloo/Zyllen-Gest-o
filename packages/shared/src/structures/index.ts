import { z } from 'zod';

export const STRUCTURE_KINDS = ['ROOM', 'TOTEM', 'OTHER'] as const;
export const structureInputSchema = z.object({ companyId: z.string().uuid(), name: z.string().trim().min(1).max(200), kind: z.enum(STRUCTURE_KINDS) }).strict();
export const structureListSchema = z.object({ companyId: z.string().uuid().optional(), search: z.string().trim().max(200).optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) }).strict();
export type StructureInput = z.infer<typeof structureInputSchema>;
export type StructureListQuery = z.infer<typeof structureListSchema>;
export interface StructureRecord { id: string; name: string; kind: typeof STRUCTURE_KINDS[number]; company: { id: string; name: string }; createdAt: string }
export interface StructureCycleService { id: string; projectName: string; status: string; completedAt: string | null }
export interface StructureCycleRecord {
    id: string; structureId: string; structureName: string; companyName: string;
    installation: StructureCycleService; removals: StructureCycleService[];
    installedAt: string | null; removedAt: string | null; durationDays: number | null;
    status: 'PLANNED' | 'INSTALLED' | 'REMOVED' | 'CANCELLED' | 'UNCLASSIFIED';
    createdAt: string;
}
