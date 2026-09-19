import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ProjectServiceInput, ProjectServiceRecord, ProjectServiceStatus } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ScheduleService } from '../schedule/schedule.service';
import { StructureCyclesService } from '../structures/structure-cycles.service';

const person = { id: true, name: true, sector: true, agendaColor: true } as const;
const include = {
    project: { include: { company: { select: { id: true, name: true } } } },
    marker: { select: { id: true, name: true } }, schedule: true,
    installationCycle: { include: { structure: { select: { id: true, name: true } } } },
    removalCycle: { include: { structure: { select: { id: true, name: true } } } },
    trip: { select: { id: true, schedule: { select: { title: true, status: true } } } },
    internalAssignees: { include: { user: { select: person } } },
    contractors: { include: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.ProjectServiceInclude;
type ServiceRow = Prisma.ProjectServiceGetPayload<{ include: typeof include }>;

function record(row: ServiceRow): ProjectServiceRecord {
    const cycle = row.installationCycle ?? row.removalCycle;
    return {
        id: row.id, projectId: row.projectId, name: row.project.name, company: row.project.company,
        structureCycle: cycle ? { id: cycle.id, structureId: cycle.structureId, structureName: cycle.structure.name, installationId: cycle.installationId } : null,
        type: row.type as ProjectServiceRecord['type'], status: (row.schedule?.status ?? (row.cancelledAt ? 'CANCELLED' : 'PENDING')) as ProjectServiceStatus,
        marker: row.marker, urgency: row.urgency, color: row.color, mapsUrl: row.mapsUrl, notes: row.notes,
        trip: row.trip ? { id: row.trip.id, title: row.trip.schedule.title, status: row.trip.schedule.status } : null,
        address: row.project.address, city: row.project.city, state: row.project.state, sectors: row.sectors,
        requiresTravel: row.requiresTravel, relevant: row.relevant,
        internalAssignees: row.internalAssignees.map(item => item.user), contractors: row.contractors.map(item => item.user),
        schedule: row.schedule ? { id: row.schedule.id, startDate: row.schedule.startDate.toISOString(), endDate: row.schedule.endDate.toISOString() } : null,
        startedAt: row.schedule?.startedAt?.toISOString() ?? null, completedAt: row.schedule?.completedAt?.toISOString() ?? null,
        cancelledAt: (row.schedule?.cancelledAt ?? row.cancelledAt)?.toISOString() ?? null, createdAt: row.createdAt.toISOString(),
    };
}

@Injectable()
export class ProjectServicesService {
    constructor(private readonly prisma: PrismaService, private readonly schedules: ScheduleService, private readonly cycles: StructureCyclesService) {}

    async options() {
        const [companies, projects, markers, internalUsers, contractors] = await this.prisma.retry(() => Promise.all([
            this.prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
            this.prisma.project.findMany({ select: { id: true, name: true, companyId: true, address: true, city: true, state: true, operationalService: { select: { id: true } } }, orderBy: { name: 'asc' } }),
            this.prisma.projectServiceMarker.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
            this.prisma.internalUser.findMany({ where: { isActive: true }, select: person, orderBy: { name: 'asc' } }),
            this.prisma.contractorUser.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        ]));
        return { companies, projects: projects.map(({ operationalService, ...project }) => ({ ...project, hasService: !!operationalService })), markers, internalUsers, contractors };
    }

    async list(params: { page: number; limit: number; status?: ProjectServiceStatus; type?: string; search?: string }) {
        const status: Prisma.ProjectServiceWhereInput = params.status === 'PENDING' ? { scheduleId: null, cancelledAt: null }
            : params.status === 'CANCELLED' ? { OR: [{ schedule: { status: 'CANCELLED' } }, { scheduleId: null, cancelledAt: { not: null } }] }
            : params.status ? { schedule: { status: params.status } } : {};
        const where: Prisma.ProjectServiceWhereInput = { ...status, ...(params.type ? { type: params.type } : {}),
            ...(params.search ? { project: { name: { contains: params.search, mode: 'insensitive' } } } : {}) };
        const [rows, total] = await this.prisma.retry(() => this.prisma.$transaction([
            this.prisma.projectService.findMany({ where, include, orderBy: [{ urgency: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }], skip: (params.page - 1) * params.limit, take: params.limit }),
            this.prisma.projectService.count({ where }),
        ]));
        return { data: rows.map(record), total, page: params.page, limit: params.limit };
    }

    async find(id: string) {
        const row = await this.prisma.retry(() => this.prisma.projectService.findUnique({ where: { id }, include }));
        if (!row) throw new NotFoundException('Projeto operacional não encontrado');
        return record(row);
    }

    async marker(name: string, actorId: string) {
        const nameKey = name.toLocaleLowerCase('pt-BR');
        return this.prisma.$transaction(async tx => {
            const existing = await tx.projectServiceMarker.findUnique({ where: { nameKey } });
            if (existing) return { id: existing.id, name: existing.name };
            const marker = await tx.projectServiceMarker.upsert({ where: { nameKey }, update: {},
                create: { name, nameKey, createdAt: new Date() }, select: { id: true, name: true } });
            await this.audit(tx, 'PROJECT_SERVICE_MARKER_CREATE', marker.id, actorId);
            return marker;
        });
    }

    private async audit(tx: Prisma.TransactionClient, action: string, id: string, actorId: string, details?: Prisma.InputJsonObject) {
        await tx.auditLog.create({ data: { action, entityType: 'ProjectService', entityId: id, userId: actorId, details, createdAt: new Date() } });
    }

    private async assignees(tx: Prisma.TransactionClient, id: string, input: ProjectServiceInput) {
        const internalIds = [...new Set(input.installerIds)], contractorIds = [...new Set(input.contractorIds)];
        const [users, contractors] = await Promise.all([
            tx.internalUser.count({ where: { id: { in: internalIds }, isActive: true } }),
            tx.contractorUser.count({ where: { id: { in: contractorIds }, isActive: true } }),
        ]);
        if (users !== internalIds.length || contractors !== contractorIds.length) throw new BadRequestException('Um responsável está inativo ou não existe');
        if (input.markerId && !await tx.projectServiceMarker.findUnique({ where: { id: input.markerId } })) throw new BadRequestException('Marcador não encontrado');
        await tx.projectServiceInternal.deleteMany({ where: { serviceId: id } });
        await tx.projectServiceContractor.deleteMany({ where: { serviceId: id } });
        if (internalIds.length) await tx.projectServiceInternal.createMany({ data: internalIds.map(userId => ({ serviceId: id, userId })) });
        if (contractorIds.length) await tx.projectServiceContractor.createMany({ data: contractorIds.map(userId => ({ serviceId: id, userId })) });
    }

    private projectData(input: ProjectServiceInput) {
        return { name: input.name, address: input.address || null, city: input.city || null, state: input.state || null };
    }
    private serviceData(input: ProjectServiceInput) {
        return { type: input.type, markerId: input.markerId, urgency: input.urgency, color: input.color,
            mapsUrl: input.mapsUrl || null, notes: input.notes || null, sectors: [...new Set(input.sectors)], requiresTravel: input.requiresTravel, relevant: input.relevant };
    }

    private async conflicts(tx: Prisma.TransactionClient, input: ProjectServiceInput, excludeId?: string) {
        if (!input.startDate || input.allowConflicts) return;
        const service = excludeId ? await tx.projectService.findUnique({ where: { scheduleId: excludeId }, select: { trip: { select: { scheduleId: true } } } }) : null;
        const conflicting = await this.schedules.conflictingAssignments(tx, { startDate: input.startDate, endDate: input.endDate!, installerIds: input.installerIds, contractorIds: input.contractorIds,
            excludeScheduleIds: [...(excludeId ? [excludeId] : []), ...(service?.trip ? [service.trip.scheduleId] : [])] });
        if (conflicting) throw new ConflictException('Há conflito de horário para um responsável. Confira e confirme o agendamento com conflito.');
    }

    async create(input: ProjectServiceInput, actorId: string) {
        try {
            const id = await this.prisma.$transaction(async tx => {
                if (!await tx.company.findUnique({ where: { id: input.companyId } })) throw new BadRequestException('Cliente não encontrado');
                if (input.markerId && !await tx.projectServiceMarker.findUnique({ where: { id: input.markerId } })) throw new BadRequestException('Marcador não encontrado');
                let projectId = input.projectId;
                if (projectId) {
                    await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${projectId} FOR UPDATE`;
                    const project = await tx.project.findUnique({ where: { id: projectId }, include: { operationalService: true } });
                    if (!project || project.companyId !== input.companyId) throw new BadRequestException('Projeto não pertence ao cliente selecionado');
                    if (project.operationalService) throw new ConflictException('Este projeto já possui seu serviço operacional');
                    await tx.project.update({ where: { id: projectId }, data: this.projectData(input) });
                } else {
                    projectId = (await tx.project.create({ data: { companyId: input.companyId, ...this.projectData(input), createdAt: new Date() } })).id;
                }
                const service = await tx.projectService.create({ data: { projectId, ...this.serviceData(input), createdAt: new Date() } });
                await this.cycles.attach(tx, service.id, input, actorId);
                await this.assignees(tx, service.id, input);
                await this.conflicts(tx, input);
                if (input.startDate) {
                    const schedule = await this.schedules.createInTransaction({ title: input.name, type: input.type, startDate: input.startDate, endDate: input.endDate!,
                        companyId: input.companyId, projectId, address: input.address, notes: input.notes, installerIds: input.installerIds }, actorId, tx);
                    await tx.projectService.update({ where: { id: service.id }, data: { scheduleId: schedule.id } });
                }
                await this.audit(tx, 'PROJECT_SERVICE_CREATE', service.id, actorId, { projectId, type: input.type });
                return service.id;
            });
            return this.find(id);
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Este projeto já possui seu serviço operacional');
            throw error;
        }
    }

    async update(id: string, input: ProjectServiceInput, actorId: string) {
        await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "ProjectService" WHERE id = ${id} FOR UPDATE`;
            const service = await tx.projectService.findUnique({ where: { id }, include: { project: true } });
            if (!service) throw new NotFoundException('Projeto operacional não encontrado');
            if (input.companyId !== service.project.companyId || (input.projectId && input.projectId !== service.projectId)) throw new BadRequestException('O vínculo com o cliente e o projeto não pode ser trocado');
            if (service.scheduleId && !input.startDate) throw new BadRequestException('Mantenha o intervalo agendado; cancelar usa a ação de status');
            if (service.tripId && !input.requiresTravel) throw new BadRequestException('Este serviço possui viagem vinculada. Desvincule pela gestão de viagens antes de remover a necessidade.');
            if (service.cancelledAt && input.startDate) throw new BadRequestException('Reabra o projeto antes de agendar');
            await this.cycles.attach(tx, id, input, actorId);
            await this.assignees(tx, id, input);
            await this.conflicts(tx, input, service.scheduleId ?? undefined);
            await tx.project.update({ where: { id: service.projectId }, data: this.projectData(input) });
            await tx.projectService.update({ where: { id }, data: this.serviceData(input) });
            if (input.startDate) {
                const scheduleData = { title: input.name, type: input.type, startDate: input.startDate, endDate: input.endDate!, companyId: input.companyId,
                    projectId: service.projectId, address: input.address, notes: input.notes, installerIds: input.installerIds, allowConflicts: input.allowConflicts };
                const schedule = service.scheduleId ? await this.schedules.updateInTransaction(service.scheduleId, scheduleData, tx, actorId)
                    : await this.schedules.createInTransaction(scheduleData, actorId, tx);
                await tx.projectService.update({ where: { id }, data: { scheduleId: schedule.id } });
            }
            await this.audit(tx, 'PROJECT_SERVICE_UPDATE', id, actorId, { projectId: service.projectId });
        });
        return this.find(id);
    }

    async status(id: string, status: ProjectServiceStatus, actorId: string) {
        await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "ProjectService" WHERE id = ${id} FOR UPDATE`;
            const service = await tx.projectService.findUnique({ where: { id } });
            if (!service) throw new NotFoundException('Projeto operacional não encontrado');
            if (service.scheduleId) {
                if (status === 'PENDING') throw new BadRequestException('Projeto possui agendamento; escolha um status da agenda');
                await this.schedules.updateInTransaction(service.scheduleId, { status }, tx, actorId);
            } else {
                await this.cycles.validateChange(tx, id, status);
                if (status !== 'PENDING' && status !== 'CANCELLED') throw new BadRequestException('Agende o projeto antes de iniciar ou concluir o serviço');
                await tx.projectService.update({ where: { id }, data: { cancelledAt: status === 'CANCELLED' ? service.cancelledAt ?? new Date() : null } });
            }
            await this.audit(tx, 'PROJECT_SERVICE_STATUS', id, actorId, { status, previousCancelledAt: service.cancelledAt?.toISOString() ?? null });
        });
        return this.find(id);
    }
}
