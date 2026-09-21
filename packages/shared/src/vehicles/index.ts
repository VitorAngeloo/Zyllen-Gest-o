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
export const vehicleCheckoutSchema = z.object({
    driverId: z.string().uuid(),
    clientName: z.string().trim().min(2).max(160),
    destination: z.string().trim().min(2).max(240),
    purpose: z.enum(['VISITA_CLIENTE', 'INSTALACAO', 'DESINSTALACAO', 'MANUTENCAO', 'CAPTACAO', 'OUTRO']),
    odometerOut: z.coerce.number().int().min(0).max(9999999),
    fuelOut: z.enum(['CHEIO', 'TRES_QUARTOS', 'METADE', 'UM_QUARTO', 'RESERVA']),
    hadDamageOut: z.enum(['true', 'false']).transform(value => value === 'true'),
}).strict();
export const vehicleReturnSchema = z.object({
    odometerIn: z.coerce.number().int().min(0).max(9999999),
    sameDestination: z.enum(['true', 'false']).transform(value => value === 'true'),
}).strict();
export type VehicleCheckoutInput = z.infer<typeof vehicleCheckoutSchema>;
export type VehicleReturnInput = z.infer<typeof vehicleReturnSchema>;
export const vehicleDashboardQuerySchema = z.object({
    month: z.string().regex(/^(20\d{2})-(0[1-9]|1[0-2])$/, 'Informe um mês válido').optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
export type VehicleDashboardQuery = z.infer<typeof vehicleDashboardQuerySchema>;
export interface VehicleRecord { id: string; name: string; plate: string | null; active: boolean }
export interface VehicleUseRecord {
    id: string; reservationId: string; driver: { id: string; name: string; sector?: string | null };
    checkedOutBy?: { id: string; name: string }; returnedBy?: { id: string; name: string } | null;
    clientName: string; destination: string;
    purpose: string; odometerOut: number; fuelOut: string; hadDamageOut: boolean; checkedOutAt: string;
    checkoutPhotoUrl: string; odometerIn: number | null; sameDestination: boolean | null;
    returnedAt: string | null; returnPhotoUrl: string | null; lateMinutes: number | null;
}
export interface VehicleReservationRecord {
    id: string; vehicle: VehicleRecord; title: string; responsible: { id: string; name: string };
    startDate: string; endDate: string; notes: string | null; cancelledAt: string | null;
    use: VehicleUseRecord | null;
}
export interface VehicleStatistics { generatedAt: string; activeVehicles: number; occupiedVehicles: number; availableVehicles: number; overdueVehicles: number; upcoming: VehicleReservationRecord[]; current: VehicleReservationRecord[] }
export interface VehicleDashboard extends VehicleStatistics {
    month: string; page: number; limit: number; total: number;
    completedTrips: number; totalKm: number; lateReturns: number;
    byVehicle: { id: string; name: string; trips: number; completedTrips: number; km: number }[];
    bySector: { name: string; trips: number; km: number }[];
    journeys: VehicleReservationRecord[];
}
