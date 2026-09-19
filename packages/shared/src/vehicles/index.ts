import { z } from 'zod';
export const vehicleInputSchema = z.object({
    name: z.string().trim().min(2).max(100),
    plate: z.string().trim().transform(value => value.toUpperCase().replace(/[-\s]/g, '')).pipe(z.string().regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, 'Informe uma placa brasileira válida')).nullable().default(null),
    active: z.boolean().default(true),
}).strict();
export const vehicleCreateSchema = vehicleInputSchema.extend({ requestId: z.string().uuid() });
export const vehicleReservationInputSchema = z.object({
    vehicleId: z.string().uuid(), title: z.string().trim().min(2).max(200), responsibleId: z.string().uuid(),
    startDate: z.string().datetime({ offset: true }), endDate: z.string().datetime({ offset: true }),
    notes: z.string().trim().max(4000).nullable().default(null),
}).strict();
const validPeriod = (value: { startDate: string; endDate: string }) => Date.parse(value.endDate) > Date.parse(value.startDate);
export const vehicleReservationSchema = vehicleReservationInputSchema.refine(validPeriod, { message: 'O término deve ser depois do início', path: ['endDate'] });
export const vehicleReservationCreateSchema = vehicleReservationInputSchema.extend({ requestId: z.string().uuid() }).refine(validPeriod, { message: 'O término deve ser depois do início', path: ['endDate'] });
export const vehicleReservationQuerySchema = z.object({
    start: z.string().datetime({ offset: true }), end: z.string().datetime({ offset: true }), vehicleId: z.string().uuid().optional(), responsibleId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict().refine(value => validPeriod({ startDate: value.start, endDate: value.end }) && Date.parse(value.end) - Date.parse(value.start) <= 366 * 86400000, { message: 'Selecione um período válido de até 366 dias' });
export type VehicleInput = z.infer<typeof vehicleInputSchema>;
export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;
export type VehicleReservationInput = z.infer<typeof vehicleReservationSchema>;
export type VehicleReservationCreateInput = z.infer<typeof vehicleReservationCreateSchema>;
export type VehicleReservationQuery = z.infer<typeof vehicleReservationQuerySchema>;
export interface VehicleRecord { id: string; name: string; plate: string | null; active: boolean }
export interface VehicleReservationRecord {
    id: string; vehicle: VehicleRecord; title: string; responsible: { id: string; name: string };
    startDate: string; endDate: string; notes: string | null; cancelledAt: string | null;
}
export interface VehicleStatistics { generatedAt: string; activeVehicles: number; occupiedVehicles: number; availableVehicles: number; upcoming: VehicleReservationRecord[]; current: VehicleReservationRecord[] }
