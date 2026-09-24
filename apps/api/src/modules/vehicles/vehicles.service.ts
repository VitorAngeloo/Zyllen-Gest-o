import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { VehicleCheckoutInput, VehicleReturnInput, VehicleCreateInput, VehicleInput, VehicleReservationCreateInput, VehicleReservationInput, VehicleReservationQuery, VehicleReservationRecord, VehicleStatistics, VehicleDashboard, VehicleDashboardQuery } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MaintenanceMediaStorageService } from '../../infrastructure/storage/maintenance-media-storage.service';
import { mediaUploadDirectory } from '../../infrastructure/storage/verified-media-storage';
import { unlink } from 'fs/promises';
import { randomUUID } from 'crypto';
import { extname } from 'path';

const vehicleSelect = { id: true, name: true, plate: true, active: true } as const;
const include = { vehicle: { select: vehicleSelect }, responsible: { select: { id: true, name: true } }, use: { include: {
    driver: { select: { id: true, name: true, sector: true } }, checkedOutBy: { select: { id: true, name: true } }, returnedBy: { select: { id: true, name: true } },
} } } satisfies Prisma.VehicleReservationInclude;
type Row = Prisma.VehicleReservationGetPayload<{ include: typeof include }>;
function record(row: Row): VehicleReservationRecord {
    return { id: row.id, title: row.title, vehicle: row.vehicle, responsible: row.responsible, notes: row.notes,
        startDate: row.startDate.toISOString(), endDate: row.endDate.toISOString(), cancelledAt: row.cancelledAt?.toISOString() ?? null,
        use: row.use ? { id: row.use.id, reservationId: row.id, driver: row.use.driver, checkedOutBy: row.use.checkedOutBy,
            returnedBy: row.use.returnedBy, clientName: row.use.clientName,
            destination: row.use.destination, purpose: row.use.purpose, odometerOut: row.use.odometerOut,
            fuelOut: row.use.fuelOut, hadDamageOut: row.use.hadDamageOut, checkedOutAt: row.use.checkedOutAt.toISOString(),
            checkoutPhotoUrl: `/media/vehicle-out/${row.use.id}/file`, odometerIn: row.use.odometerIn,
            sameDestination: row.use.sameDestination, returnedAt: row.use.returnedAt?.toISOString() ?? null,
            returnPhotoUrl: row.use.returnedAt ? `/media/vehicle-in/${row.use.id}/file` : null,
            lateMinutes: row.use.lateMinutes } : null };
}
@Injectable()
export class VehiclesService {
    constructor(private readonly prisma: PrismaService, private readonly mediaStorage: MaintenanceMediaStorageService) {}
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
            this.prisma.vehicleReservation.findMany({ where: { ...active, use: { is: { returnedAt: null } } }, include, orderBy: [{ endDate: 'asc' }, { id: 'asc' }] }),
            this.prisma.vehicleReservation.findMany({ where: { ...active, endDate: { gt: now }, use: { is: null } }, include, orderBy: [{ startDate: 'asc' }, { id: 'asc' }], take: 8 }),
        ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
        const occupiedVehicles = new Set(current.map(row => row.vehicleId)).size;
        return { generatedAt: now.toISOString(), activeVehicles, occupiedVehicles, availableVehicles: activeVehicles - occupiedVehicles,
            overdueVehicles: current.filter(row => row.endDate < now).length, current: current.map(record), upcoming: upcoming.map(record) };
    }
    async managerDashboard(query: VehicleDashboardQuery): Promise<VehicleDashboard> {
        const reportMonth = query.month ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).slice(0, 7);
        const [year, month] = reportMonth.split('-').map(Number);
        const start = new Date(`${reportMonth}-01T00:00:00-03:00`);
        const nextMonth = new Date(Date.UTC(year, month, 1));
        const end = new Date(`${nextMonth.toISOString().slice(0, 7)}-01T00:00:00-03:00`);
        const rows = await this.prisma.retry(() => this.prisma.vehicleReservation.findMany({
            where: { use: { is: { checkedOutAt: { gte: start, lt: end } } } }, include,
            orderBy: [{ use: { checkedOutAt: 'desc' } }, { id: 'desc' }],
        }));
        const byVehicle = new Map<string, { id: string; name: string; trips: number; completedTrips: number; km: number }>();
        const bySector = new Map<string, { name: string; trips: number; km: number }>();
        let completedTrips = 0, totalKm = 0, lateReturns = 0;
        for (const row of rows) {
            const use = row.use!;
            const km = use.returnedAt && use.odometerIn !== null ? Math.max(0, use.odometerIn - use.odometerOut) : 0;
            const completed = !!use.returnedAt;
            const car = byVehicle.get(row.vehicleId) ?? { id: row.vehicleId, name: row.vehicle.name, trips: 0, completedTrips: 0, km: 0 };
            car.trips++; car.completedTrips += Number(completed); car.km += km; byVehicle.set(row.vehicleId, car);
            const sectorName = use.driver.sector?.trim() || 'Não informado';
            const sector = bySector.get(sectorName) ?? { name: sectorName, trips: 0, km: 0 };
            sector.trips++; sector.km += km; bySector.set(sectorName, sector);
            completedTrips += Number(completed); totalKm += km; lateReturns += Number(!!use.lateMinutes);
        }
        const statistics = await this.statistics();
        return { ...statistics, month: reportMonth, page: query.page, limit: query.limit, total: rows.length,
            completedTrips, totalKm, lateReturns,
            byVehicle: [...byVehicle.values()].sort((a, b) => b.km - a.km || a.name.localeCompare(b.name)),
            bySector: [...bySector.values()].sort((a, b) => b.trips - a.trips || a.name.localeCompare(b.name)),
            journeys: rows.slice((query.page - 1) * query.limit, query.page * query.limit).map(record) };
    }
    async operations(actorId: string) {
        const now = new Date();
        const mine: Prisma.VehicleReservationWhereInput = { OR: [{ responsibleId: actorId }, { use: { is: { driverId: actorId } } }] };
        const [inUse, ready, recent] = await this.prisma.retry(() => this.prisma.$transaction([
            this.prisma.vehicleReservation.findMany({ where: { AND: [mine, { use: { is: { returnedAt: null } } }] }, include, orderBy: [{ endDate: 'asc' }, { id: 'asc' }] }),
            this.prisma.vehicleReservation.findMany({ where: { responsibleId: actorId, cancelledAt: null, startDate: { lte: now }, endDate: { gt: now }, use: { is: null }, vehicle: { active: true } }, include, orderBy: [{ endDate: 'asc' }, { id: 'asc' }], take: 100 }),
            this.prisma.vehicleReservation.findMany({ where: { AND: [mine, { use: { is: { returnedAt: { not: null } } } }] }, include, orderBy: { use: { returnedAt: 'desc' } }, take: 30 }),
        ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }));
        return { inUse: inUse.map(record), ready: ready.map(record), recent: recent.map(record) };
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
            if (!input.active && await tx.vehicleUse.count({ where: { vehicleId: id, returnedAt: null } })) throw new ConflictException('Registre a devolucao antes de inativar o carro');
            const vehicle = await tx.vehicle.update({ where: { id }, data: input, select: vehicleSelect });
            await this.audit(tx, 'VEHICLE_UPDATE', 'Vehicle', id, actorId, input);
            return vehicle;
        }); } catch (error) { this.unique(error); }
    }
    private async validate(tx: Prisma.TransactionClient, input: VehicleReservationInput, excludeId?: string) {
        const vehicle = await tx.vehicle.findUnique({ where: { id: input.vehicleId } });
        if (new Date(input.startDate) <= new Date() && await tx.vehicleUse.count({ where: { vehicleId: input.vehicleId, returnedAt: null } })) throw new ConflictException('Este carro ainda esta em uso. Aguarde a devolucao para reservar o periodo atual.');
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
            if (await tx.vehicleUse.count({ where: { reservationId: id } })) throw new ConflictException('A reserva ja teve uma retirada e permanece no historico');
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
            if (previous.use) throw new ConflictException('A reserva ja teve uma retirada e nao pode ser cancelada');
            if (previous.endDate <= new Date()) throw new BadRequestException('Reservas concluídas permanecem no histórico');
            await this.lockVehicles(tx, [previous.vehicleId]);
            const row = await tx.vehicleReservation.update({ where: { id }, data: { cancelledAt: new Date() }, include });
            await this.audit(tx, 'VEHICLE_RESERVATION_CANCEL', 'VehicleReservation', id, actorId, { vehicleId: previous.vehicleId });
            return record(row);
        });
    }
    private assertPhoto(file?: Express.Multer.File) {
        if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) throw new BadRequestException('Anexe uma foto do hodometro em JPG, PNG ou WebP');
    }
    private async storePhoto(file: Express.Multer.File, useId: string) {
        const stored = await this.mediaStorage.storeUploadedFile(file, useId, mediaUploadDirectory('vehicles'), 'vehicles');
        return stored.startsWith('supabase:') ? stored : `/uploads/vehicles/${stored}`;
    }
    private async discardPhoto(path: string) {
        const local = path.startsWith('/uploads/vehicles/') ? path.slice('/uploads/vehicles/'.length) : path;
        await this.mediaStorage.deleteStoredFile(local, mediaUploadDirectory('vehicles')).catch(() => undefined);
    }
    async checkout(reservationId: string, input: VehicleCheckoutInput, file: Express.Multer.File | undefined, actorId: string) {
        let localStored = false;
        try {
            this.assertPhoto(file);
            const useId = randomUUID(), path = await this.storePhoto(file!, useId);
            localStored = path.startsWith('/uploads/');
            try {
                return await this.prisma.$transaction(async tx => {
                    await this.lockReservation(tx, reservationId);
                    const booking = await tx.vehicleReservation.findUnique({ where: { id: reservationId }, include });
                    if (!booking) throw new NotFoundException('Reserva nao encontrada');
                    await this.lockVehicles(tx, [booking.vehicleId]);
                    const now = new Date();
                    if (booking.cancelledAt || booking.use) throw new ConflictException('Esta reserva foi cancelada ou ja teve retirada');
                    if (!booking.vehicle.active) throw new ConflictException('O carro esta inativo');
                    if (now < booking.startDate || now >= booking.endDate) throw new ConflictException('A retirada deve acontecer no periodo reservado. Ajuste a reserva antes de retirar.');
                    if (await tx.vehicleUse.count({ where: { vehicleId: booking.vehicleId, returnedAt: null } })) throw new ConflictException('O carro ainda esta em uso. Aguarde a devolucao.');
                    if (!await tx.internalUser.findFirst({ where: { id: input.driverId, isActive: true } })) throw new BadRequestException('Selecione um condutor ativo');
                    await tx.vehicleUse.create({ data: { id: useId, reservationId, vehicleId: booking.vehicleId, driverId: input.driverId,
                        checkedOutById: actorId, clientName: input.clientName, destination: input.destination, purpose: input.purpose,
                        odometerOut: input.odometerOut, fuelOut: input.fuelOut, hadDamageOut: input.hadDamageOut,
                        checkoutPhotoName: `hodometro-retirada${extname(file!.filename)}`, checkoutPhotoPath: path } });
                    await this.audit(tx, 'VEHICLE_CHECKOUT', 'VehicleUse', useId, actorId, { reservationId, vehicleId: booking.vehicleId, driverId: input.driverId, odometerOut: input.odometerOut, fuelOut: input.fuelOut, hadDamageOut: input.hadDamageOut });
                    return record((await tx.vehicleReservation.findUnique({ where: { id: reservationId }, include }))!);
                });
            } catch (error) {
                await this.discardPhoto(path);
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('O carro ja esta em uso ou a reserva ja teve retirada');
                throw error;
            }
        } finally { if (file?.path && !localStored) await unlink(file.path).catch(() => undefined); }
    }
    async returnVehicle(reservationId: string, input: VehicleReturnInput, file: Express.Multer.File | undefined, actorId: string) {
        let localStored = false;
        try {
            this.assertPhoto(file);
            const booking = await this.prisma.retry(() => this.prisma.vehicleReservation.findUnique({ where: { id: reservationId }, select: { use: { select: { id: true } } } }));
            if (!booking?.use) throw new ConflictException('Registre a retirada antes da devolucao');
            const path = await this.storePhoto(file!, booking.use.id);
            localStored = path.startsWith('/uploads/');
            try {
                return await this.prisma.$transaction(async tx => {
                    await this.lockReservation(tx, reservationId);
                    const row = await tx.vehicleReservation.findUnique({ where: { id: reservationId }, include });
                    if (!row?.use) throw new ConflictException('Registre a retirada antes da devolucao');
                    await this.lockVehicles(tx, [row.vehicleId]);
                    if (row.use.returnedAt) throw new ConflictException('A devolucao ja foi registrada');
                    if (input.odometerIn < row.use.odometerOut) throw new BadRequestException('A quilometragem de devolucao nao pode ser menor que a de retirada');
                    const now = new Date(), lateMinutes = Math.max(0, Math.ceil((now.getTime() - row.endDate.getTime()) / 60000));
                    await tx.vehicleUse.update({ where: { id: row.use.id }, data: { returnedAt: now, returnedById: actorId,
                        odometerIn: input.odometerIn, sameDestination: input.sameDestination,
                        returnPhotoName: `hodometro-devolucao${extname(file!.filename)}`, returnPhotoPath: path, lateMinutes } });
                    await this.audit(tx, 'VEHICLE_RETURN', 'VehicleUse', row.use.id, actorId, { reservationId, vehicleId: row.vehicleId, odometerIn: input.odometerIn, sameDestination: input.sameDestination, lateMinutes });
                    return record((await tx.vehicleReservation.findUnique({ where: { id: reservationId }, include }))!);
                });
            } catch (error) { await this.discardPhoto(path); throw error; }
        } finally { if (file?.path && !localStored) await unlink(file.path).catch(() => undefined); }
    }
}
