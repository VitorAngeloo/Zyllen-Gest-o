import { z } from 'zod';
import { projectForecastSchema } from './planning';

export const PROJECT_PENDING_TYPES = ['Aguardando software ou conteúdo', 'Pausada, aguardando adequação do cliente',
    'Sem software por falta de materiais do cliente', 'Aguardando obra ou infraestrutura', 'Aguardando kickoff',
    'Aguardando equipamento ou logística', 'Aguardando contrato', 'Sem previsão', 'Sem retorno do cliente', 'Aguardando apresentação de projeto', 'Outra'] as const;
const pendingFields = {
    type: z.string().trim().min(1).max(200),
    responsible: z.string().trim().max(200).default(''),
    deadline: projectForecastSchema.refine(value => value.length === 10, 'Informe o dia do prazo').nullable().default(null),
    detail: z.string().trim().max(10000).default(''),
};
export const projectPendingCreateSchema = z.object({ id: z.string().uuid(), ...pendingFields }).strict();
export const projectPendingUpdateSchema = z.object({ ...pendingFields, expectedVersion: z.number().int().min(0) }).strict();
export const projectPendingResolveSchema = z.object({ expectedVersion: z.number().int().min(0) }).strict();
export const projectNoteCreateSchema = z.object({ id: z.string().uuid(), text: z.string().trim().min(1).max(10000) }).strict();
export type ProjectPendingCreate = z.infer<typeof projectPendingCreateSchema>;
export type ProjectPendingUpdate = z.infer<typeof projectPendingUpdateSchema>;
export type ProjectNoteCreate = z.infer<typeof projectNoteCreateSchema>;
export interface ProjectPendingRecord {
    id: string; type: string; responsible: string; deadline: string | null; detail: string; version: number;
    createdAt: string; createdBy: { id: string; name: string }; updatedAt: string;
    resolvedAt: string | null; resolvedBy: { id: string; name: string } | null;
}
export interface ProjectNoteRecord { id: string; text: string; createdAt: string; author: { id: string; name: string } }
