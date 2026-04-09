import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class TicketsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly authService: AuthService,
    ) { }

    // ── Status label helper (human-readable) ──
    getStatusLabel(status: string, technicianName?: string | null): string {
        switch (status) {
            case 'OPEN': return 'Aguardando Técnico';
            case 'IN_PROGRESS': return technicianName ? `Em Atendimento — ${technicianName}` : 'Em Atendimento';
            case 'WAITING_CLIENT': return 'Aguardando Sua Resposta';
            case 'RESOLVED': return 'Resolvido';
            case 'CLOSED': return 'Encerrado';
            default: return status;
        }
    }

    // ── Create ticket (external user) ──
    async create(data: { title: string; description: string; companyId: string; externalUserId: string; priority?: string }) {
        const company = await this.prisma.company.findUnique({ where: { id: data.companyId } });
        if (!company) throw new NotFoundException('Empresa não encontrada');

        // Calculate SLA due date (default: 48h for MEDIUM, 24h HIGH, 72h LOW)
        const slaHours = data.priority === 'HIGH' ? 24 : data.priority === 'LOW' ? 72 : 48;
        const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

        return this.prisma.ticket.create({
            data: {
                title: data.title,
                description: data.description,
                companyId: data.companyId,
                externalUserId: data.externalUserId,
                priority: data.priority ?? 'MEDIUM',
                slaDueAt,
            },
            include: {
                company: { select: { name: true } },
                externalUser: { select: { name: true, email: true } },
            },
        });
    }

    // ── Create ticket with attachments (external user) ──
    async createWithAttachments(data: {
        description: string;
        companyId: string;
        externalUserId: string;
        files: { fileName: string; filePath: string }[];
    }) {
        const company = await this.prisma.company.findUnique({ where: { id: data.companyId } });
        if (!company) throw new NotFoundException('Empresa não encontrada');

        const user = await this.prisma.externalUser.findUnique({
            where: { id: data.externalUserId },
            include: { company: true, project: true },
        });
        if (!user) throw new NotFoundException('Usuário não encontrado');

        // Auto-generate title from company name
        const ticketCount = await this.prisma.ticket.count({ where: { companyId: data.companyId } });
        const title = `Chamado #${ticketCount + 1} — ${company.name}`;

        const slaHours = 48; // Default MEDIUM priority
        const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

        return this.prisma.ticket.create({
            data: {
                title,
                description: data.description,
                companyId: data.companyId,
                externalUserId: data.externalUserId,
                priority: 'MEDIUM',
                slaDueAt,
                attachments: {
                    create: data.files.map((f) => ({
                        fileName: f.fileName,
                        filePath: f.filePath,
                        uploadedById: data.externalUserId,
                    })),
                },
            },
            include: {
                company: { select: { name: true } },
                externalUser: {
                    select: { name: true, email: true, phone: true, position: true, project: { select: { name: true } } },
                },
                attachments: true,
            },
        });
    }

    // ── Add attachments to existing ticket ──
    async addAttachments(ticketId: string, uploadedById: string | null, files: { fileName: string; filePath: string }[]) {
        await this.findById(ticketId);
        return this.prisma.ticketAttachment.createMany({
            data: files.map((f) => ({
                ticketId,
                fileName: f.fileName,
                filePath: f.filePath,
                uploadedById,
            })),
        });
    }

    // ── Current active ticket for a client user ──
    async findCurrentForUser(externalUserId: string) {
        const ticket = await this.prisma.ticket.findFirst({
            where: {
                externalUserId,
                status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT'] },
            },
            orderBy: { createdAt: 'desc' },
            include: {
                company: { select: { name: true } },
                assignedTo: { select: { name: true } },
                attachments: true,
            },
        });
        if (!ticket) return null;

        return {
            ...ticket,
            statusLabel: this.getStatusLabel(ticket.status, ticket.assignedTo?.name),
        };
    }

    // ── List tickets ──
    async findAll(params?: { status?: string; companyId?: string; assignedToId?: string; externalUserId?: string; skip?: number; take?: number }) {
        const where = {
            ...(params?.status ? { status: params.status } : {}),
            ...(params?.companyId ? { companyId: params.companyId } : {}),
            ...(params?.assignedToId ? { assignedToInternalUserId: params.assignedToId } : {}),
            ...(params?.externalUserId ? { externalUserId: params.externalUserId } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.ticket.findMany({
                where,
                include: {
                    company: { select: { name: true } },
                    externalUser: { select: { name: true, company: { select: { name: true } } } },
                    internalUser: { select: { name: true, sector: true } },
                    assignedTo: { select: { name: true, sector: true } },
                },
                orderBy: { createdAt: 'desc' },
                ...(params?.skip !== undefined ? { skip: params.skip, take: params.take } : {}),
            }),
            this.prisma.ticket.count({ where }),
        ]);
        return { data, total };
    }

    // ── Find by ID ──
    async findById(id: string) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id },
            include: {
                company: true,
                externalUser: {
                    select: {
                        name: true, email: true, phone: true, position: true, cpf: true,
                        company: { select: { name: true } },
                        project: { select: { name: true } },
                    },
                },
                internalUser: { select: { name: true, sector: true } },
                assignedTo: { select: { name: true, email: true, sector: true } },
                messages: { orderBy: { createdAt: 'asc' } },
                attachments: true,
            },
        });
        if (!ticket) throw new NotFoundException('Chamado não encontrado');
        return ticket;
    }

    // ── Triage: assign to internal user ──
    async assign(ticketId: string, assignedToId: string) {
        const ticket = await this.findById(ticketId);
        if (ticket.status === 'CLOSED') throw new BadRequestException('Chamado já encerrado');

        const user = await this.prisma.internalUser.findUnique({ where: { id: assignedToId } });
        if (!user) throw new NotFoundException('Usuário interno não encontrado');

        return this.prisma.ticket.update({
            where: { id: ticketId },
            data: {
                assignedToInternalUserId: assignedToId,
                status: 'IN_PROGRESS',
                firstResponseAt: ticket.firstResponseAt ?? new Date(),
            },
        });
    }

    // ── Helper: check admin/gestor role ──
    private isAdminOrGestor(roleName: string): boolean {
        return ['Administrador', 'Gestor'].includes(roleName);
    }

    // ── Assign with PIN (self or delegate) ──
    async assignWithPin(ticketId: string, userId: string, roleName: string, pin: string, assignedToId?: string) {
        const ticket = await this.findById(ticketId);
        if (ticket.status === 'CLOSED') throw new BadRequestException('Chamado encerrado não pode ser alterado');

        // Only admin/gestor can delegate to another user
        const targetId = assignedToId && this.isAdminOrGestor(roleName) ? assignedToId : userId;

        const valid = await this.authService.validatePin(userId, pin);
        if (!valid) throw new ForbiddenException('PIN inválido');

        const user = await this.prisma.internalUser.findUnique({ where: { id: targetId } });
        if (!user) throw new NotFoundException('Usuário interno não encontrado');

        return this.prisma.ticket.update({
            where: { id: ticketId },
            data: {
                assignedToInternalUserId: targetId,
                status: 'IN_PROGRESS',
                firstResponseAt: ticket.firstResponseAt ?? new Date(),
            },
            include: { company: { select: { name: true } }, assignedTo: { select: { name: true } } },
        });
    }

    // ── Close with PIN + resolution notes ──
    async closeWithPin(ticketId: string, userId: string, roleName: string, pin: string, resolutionNotes: string) {
        const ticket = await this.findById(ticketId);
        if (ticket.status === 'CLOSED') throw new BadRequestException('Chamado já está encerrado');

        // Regular user can only close tickets assigned to them; admin/gestor can close any
        if (!this.isAdminOrGestor(roleName) && ticket.assignedToInternalUserId !== userId) {
            throw new ForbiddenException('Você só pode fechar chamados atribuídos a você');
        }

        const valid = await this.authService.validatePin(userId, pin);
        if (!valid) throw new ForbiddenException('PIN inválido');

        const now = new Date();
        const elapsedSeconds = ticket.firstResponseAt
            ? Math.floor((now.getTime() - new Date(ticket.firstResponseAt).getTime()) / 1000)
            : null;

        return this.prisma.ticket.update({
            where: { id: ticketId },
            data: {
                status: 'CLOSED',
                resolutionNotes,
                closedAt: now,
                elapsedSeconds,
            },
        });
    }

    // ── Reassign (admin/gestor only) ──
    async reassign(ticketId: string, userId: string, roleName: string, pin: string, newAssignedToId: string) {
        if (!this.isAdminOrGestor(roleName)) {
            throw new ForbiddenException('Apenas administradores e gestores podem mover chamados');
        }

        const ticket = await this.findById(ticketId);
        if (ticket.status === 'CLOSED') throw new BadRequestException('Chamado encerrado não pode ser alterado');

        const valid = await this.authService.validatePin(userId, pin);
        if (!valid) throw new ForbiddenException('PIN inválido');

        const targetUser = await this.prisma.internalUser.findUnique({ where: { id: newAssignedToId } });
        if (!targetUser) throw new NotFoundException('Usuário destino não encontrado');

        return this.prisma.ticket.update({
            where: { id: ticketId },
            data: {
                assignedToInternalUserId: newAssignedToId,
                status: 'IN_PROGRESS',
            },
            include: { company: { select: { name: true } }, assignedTo: { select: { name: true } } },
        });
    }

    // ── List internal users (for assign dropdown) ──
    async listInternalUsers() {
        return this.prisma.internalUser.findMany({
            where: { isActive: true },
            select: { id: true, name: true, email: true, role: { select: { name: true } } },
            orderBy: { name: 'asc' },
        });
    }

    // ── Change status ──
    async changeStatus(ticketId: string, status: string) {
        const validStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'];
        if (!validStatuses.includes(status)) {
            throw new BadRequestException(`Status inválido. Use: ${validStatuses.join(', ')}`);
        }

        const ticket = await this.findById(ticketId);
        if (ticket.status === 'CLOSED') {
            throw new BadRequestException('Chamado encerrado não pode ser alterado');
        }

        const updateData: any = { status };
        if (status === 'CLOSED') updateData.closedAt = new Date();

        return this.prisma.ticket.update({
            where: { id: ticketId },
            data: updateData,
        });
    }

    // ── Add message ──
    async addMessage(ticketId: string, authorId: string, authorType: string, content: string) {
        const ticket = await this.findById(ticketId);
        if (ticket.status === 'CLOSED') throw new BadRequestException('Chamado encerrado não aceita novas mensagens');
        return this.prisma.ticketMessage.create({
            data: { ticketId, authorId, authorType, content },
        });
    }

    // ── Add message to own internal ticket (no permission required) ──
    async addInternalMessage(ticketId: string, userId: string, content: string) {
        const ticket = await this.findById(ticketId);
        if (ticket.source !== 'INTERNAL' || ticket.internalUserId !== userId) {
            throw new ForbiddenException('Sem permissão para enviar mensagem neste chamado');
        }
        if (ticket.status === 'CLOSED') throw new BadRequestException('Chamado encerrado não aceita novas mensagens');
        return this.prisma.ticketMessage.create({
            data: { ticketId, authorId: userId, authorType: 'external', content },
        });
    }

    // ── Create internal ticket (collaborator TI) ──
    async createInternalTicket(data: {
        title: string;
        description: string;
        priority?: string;
        internalUserId: string;
        files?: { fileName: string; filePath: string }[];
    }) {
        const user = await this.prisma.internalUser.findUnique({ where: { id: data.internalUserId } });
        if (!user) throw new NotFoundException('Usuário interno não encontrado');

        const slaHours = data.priority === 'HIGH' ? 24 : data.priority === 'LOW' ? 72 : 48;
        const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

        return this.prisma.ticket.create({
            data: {
                title: data.title,
                description: data.description,
                priority: data.priority ?? 'MEDIUM',
                source: 'INTERNAL',
                internalUserId: data.internalUserId,
                slaDueAt,
                ...(data.files?.length ? {
                    attachments: {
                        create: data.files.map((f) => ({
                            fileName: f.fileName,
                            filePath: f.filePath,
                            uploadedById: data.internalUserId,
                        })),
                    },
                } : {}),
            },
            include: {
                internalUser: { select: { name: true, email: true } },
                attachments: true,
            },
        });
    }

    // ── List internal tickets for a specific collaborator ──
    async findMyInternalTickets(internalUserId: string) {
        const tickets = await this.prisma.ticket.findMany({
            where: { internalUserId, source: 'INTERNAL' },
            include: {
                assignedTo: { select: { name: true } },
                attachments: true,
                messages: { orderBy: { createdAt: 'asc' } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return tickets.map((t) => ({
            ...t,
            statusLabel: this.getStatusLabel(t.status, t.assignedTo?.name),
        }));
    }
}
