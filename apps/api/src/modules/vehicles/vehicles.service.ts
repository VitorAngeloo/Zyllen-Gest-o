import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { VehicleCreateInput, VehicleInput, VehicleReservationCreateInput, VehicleReservationInput, VehicleReservationQuery, VehicleReservationRecord, VehicleStatistics } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const vehicleSelect = { id: true, name: true, plate: true, active: true } as const;
const include = { vehicle: { select: vehicleSelect }, responsible: { select: { id: true, name: true } } } satisfies Prisma.VehicleReservationInclude;
type Row = Prisma.VehicleReservationGetPayload<{ include: typeof include }>;
function record(row: Row): VehicleReservationRecord {
    return { id: row.id, title: row.title, vehicle: row.vehicle, responsible: row.responsible, notes: row.notes,
        startDate: row.startDate.toISOString(), endDate: row.endDate.toISOString(), cancelledAt: row.cancelledAt?.toISOString() ?? null };
}
@Injectable()
export class VehiclesService {
    constructor(private readonly prisma: PrismaService) {}
    list() { return this.prisma.retry(() => this.prisma.vehicle.findMany({ select: vehicleSelect, orderBy: [{ active: 'desc' }, { name: 'asc' }, { id: 'asc' }] })); }
    async options() {
        const [vehicles, users] = await Promise.all([this.list(), this.prisma.retry(() => this.prisma.internalUser.findMany({ where: { OR: [{ isActive: true }, { vehicleReservations: { some: {} } }] }, select: { id: true, name: true, isActive: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }] }))]);
        const person = ({ id, name }: { id: string; name: string }) => ({ id, name });
        return { vehicles, responsibleUsers: users.filter(user => user.isActive).map(person), reservationResponsibleUsers: users.map(person) };
    }
    async reservations(query: VehicleReservationQuery) {
        // Overlap: inclui reservas que começam antes do período e continuam dentro dele.
        const where: Prisma.VehicleReservationWhereInput = { startDate: { lt: new Date(query.end) }, endDate: { gt: new Date(query.start) }, ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}), ...(query.responsibleId ? { responsibleId: query.responsibleId } : {}) };
        const [rows, total] = await this.prisma.retry(() => this.prisma.$transaction([
            this.prisma.vehicleReservation.findMany({ where, include, orderBy: [{ startDate: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.limit, take: query.limit }),
            this.prisma.vehicleReservation.count({ where }),
        ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
        return { data: rows.map(record), total, page: query.page, limit: query.limit };
    }
    async statistics(): Promise<VehicleStatistics> {
        const now = new Date(), active = { cancelledAt: null, vehicle: { active: true } } as const;
        const [activeVehicles, current, upcoming] = await this.prisma.retry(() => this.prisma.$transaction([
            this.prisma.vehicle.count({ where: { active: true } }),
            this.prisma.vehicleReservation.findMany({ where: { ...active, startDate: { lte: now }, endDate: { gt: now } }, include, orderBy: [{ endDate: 'asc' }, { id: 'asc' }] }),
            this.prisma.vehicleReservation.findMany({ where: { ...active, startDate: { gt: now } }, include, orderBy: [{ startDate: 'asc' }, { id: 'asc' }], take: 5 }),
        ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
        const occupiedVehicles = new Set(current.map(row => row.vehicleId)).size;
        return { generatedAt: now.toISOString(), activeVehicles, occupiedVehicles, availableVehicles: activeVehicles - occupiedVehicles, current: current.map(record), upcoming: upcoming.map(record) };
    }
    private async lockReservation(tx: Prisma.TransactionClient, id: string) {
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'vehicle-reservation:' + id}))`;
    }
    private async lockVehicles(tx: Prisma.TransactionClient, ids: string[]) {
        await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ANY(${[...new Set(ids)].sort()}::text[]) ORDER BY id FOR UPDATE`;
    }
    private audit(tx: Prisma.TransactionClient, action: string, entityType: string, entityId: string, userId: string, details: Prisma.InputJsonObject) {
        return tx.auditLog.create({ data: { action, entityType, entityId, userId, details } });
    }
    private unique(error: unknown): never {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Esta placa ou identificação já está cadastrada');
        throw error;
    }
    async create(input: VehicleCreateInput, actorId: string) {
        const { requestId, ...data } = input;
        try { return await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${'vehicle-create:' + requestId}))`;
            const previous = await tx.vehicle.findUnique({ where: { id: requestId }, select: vehicleSelect });
            if (previous) {
                const own = await tx.auditLog.findFirst({ where: { entityId: requestId, action: 'VEHICLE_CREATE', userId: actorId } });
                if (!own || previous.name !== data.name || previous.plate !== data.plate || previous.active !== data.active) throw new ConflictException('Esta solicitação já foi utilizada. Confira o cadastro antes de tentar novamente.');
                return previous;
            }
            const vehicle = await tx.vehicle.create({ data: { ...data, id: requestId }, select: vehicleSelect });
            await this.audit(tx, 'VEHICLE_CREATE', 'Vehicle', vehicle.id, actorId, data);
            return vehicle;
        }); } catch (error) { this.unique(error); }
    }
    async update(id: string, input: VehicleInput, actorId: string) {
        try { return await this.prisma.$transaction(async tx => {
            await this.lockVehicles(tx, [id]);
            if (!await tx.vehicle.findUnique({ where: { id } })) throw new NotFoundException('Carro não encontrado');
            if (!input.active && await tx.vehicleReservation.count({ where: { vehicleId: id, cancelledAt: null, endDate: { gt: new Date() } } })) throw new ConflictException('Cancele ou transfira as reservas atuais e futuras antes de inativar o carro');
            const vehicle = await tx.vehicle.update({ where: { id }, data: input, select: vehicleSelect });
            await this.audit(tx, 'VEHICLE_UPDATE', 'Vehicle', id, actorId, input);
            return vehicle;
        }); } catch (error) { this.unique(error); }
    }
    private async validate(tx: Prisma.TransactionClient, input: VehicleReservationInput, excludeId?: string) {
        const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
        if (!vehicle) throw new NotFoundException('Carro não encontrado');
        if (!vehicle.active) throw new BadRequestException('Este carro está inativo');
        if (!await tx.internalUser.findFirst({ where: { id: input.responsibleId, isActive: true } })) throw new BadRequestException('Selecione um responsável ativo');
        if (await tx.vehicleReservation.count({ where: { vehicleId: input.vehicleId, cancelledAt: null, ...(excludeId ? { id: { not: excludeId } } : {}), startDate: { lt: new Date(input.endDate) }, endDate: { gt: new Date(input.startDate) } } })) throw new ConflictException('Este carro já está reservado nesse período. Escolha outro horário ou outro carro.');
    }
    private values(input: VehicleReservationInput) { return { ...input, startDate: new Date(input.startDate), endDate: new Date(input.endDate) }; }
    async reserve(input: VehicleReservationCreateInput, actorId: string) {
        const { requestId, ...values } = input;
        return this.prisma.$transaction(async tx => {
            await this.lockReservation(tx, requestId);
            const previous = await tx.vehicleReservation.findUnique({ where: { id: requestId }, include });
            if (previous) {
                if (previous.createdById !== actorId || previous.vehicleId !== values.vehicleId || previous.title !== values.title || previous.responsibleId !== values.responsibleId || previous.notes !== values.notes || previous.startDate.getTime() !== Date.parse(values.startDate) || previous.endDate.getTime() !== Date.parse(values.endDate)) throw new ConflictException('Esta solicitação já foi utilizada. Confira a reserva antes de tentar novamente.');
                return record(previous);
            }
            await this.lockVehicles(tx, [values.vehicleId]); await this.validate(tx, values);
            const row = await tx.vehicleReservation.create({ data: { ...this.values(values), id: requestId, createdById: actorId }, include });
            await this.audit(tx, 'VEHICLE_RESERVE', 'VehicleReservation', row.id, actorId, values);
            return record(row);
        });
    }
    async updateReservation(id: string, input: VehicleReservationInput, actorId: string) {
        return this.prisma.$transaction(async tx => {
            await this.lockReservation(tx, id);
            const previous = await tx.vehicleReservation.findUnique({ where: { id } });
            if (!previous) throw new NotFoundException('Reserva não encontrada');
            if (previous.cancelledAt || previous.endDate <= new Date()) throw new BadRequestException('Reservas canceladas ou concluídas permanecem no histórico');
            await this.lockVehicles(tx, [previous.vehicleId, input.vehicleId]); await this.validate(tx, input, id);
            const row = await tx.vehicleReservation.update({ where: { id }, data: this.values(input), include });
            await this.audit(tx, 'VEHICLE_RESERVATION_UPDATE', 'VehicleReservation', id, actorId, input);
            return record(row);
        });
    }
    async cancel(id: string, actorId: string) {
        return this.prisma.$transaction(async tx => {
            await this.lockReservation(tx, id);
            const previous = await tx.vehicleReservation.findUnique({ where: { id }, include });
            if (!previous) throw new NotFoundException('Reserva não encontrada');
            if (previous.cancelledAt) return record(previous);
            if (previous.endDate <= new Date()) throw new BadRequestException('Reservas concluídas permanecem no histórico');
            await this.lockVehicles(tx, [previous.vehicleId]);
            const row = await tx.vehicleReservation.update({ where: { id }, data: { cancelledAt: new Date() }, include });
            await this.audit(tx, 'VEHICLE_RESERVATION_CANCEL', 'VehicleReservation', id, actorId, { vehicleId: previous.vehicleId });
            return record(row);
        });
    }
}
