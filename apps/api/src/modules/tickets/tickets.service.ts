import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TicketsService {
    constructor(private readonly prisma: PrismaService) { }

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
                    externalUser: { select: { name: true } },
                    assignedTo: { select: { name: true } },
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
                externalUser: { select: { name: true, email: true } },
                assignedTo: { select: { name: true, email: true } },
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

    // ── Change status ──
    async changeStatus(ticketId: string, status: string) {
        const validStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'];
        if (!validStatuses.includes(status)) {
            throw new BadRequestException(`Status inválido. Use: ${validStatuses.join(', ')}`);
        }

        const ticket = await this.findById(ticketId);
        if (ticket.status === 'CLOSED' && status !== 'OPEN') {
            throw new BadRequestException('Chamado encerrado não pode mudar de status');
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
        await this.findById(ticketId);
        return this.prisma.ticketMessage.create({
            data: { ticketId, authorId, authorType, content },
        });
    }
}
