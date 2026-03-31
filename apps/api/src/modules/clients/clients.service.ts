import {
    Injectable,
    NotFoundException,
    ConflictException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClientsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    // ═══════════════════════════════════════════
    // COMPANIES
    // ═══════════════════════════════════════════

    async findAllCompanies() {
        return this.prisma.company.findMany({
            include: { _count: { select: { externalUsers: true, tickets: true, projects: true } } },
            orderBy: { name: 'asc' },
        });
    }

    async findCompanyById(id: string) {
        const company = await this.prisma.company.findUnique({
            where: { id },
            include: {
                externalUsers: { select: { id: true, name: true, email: true } },
                projects: { orderBy: { name: 'asc' } },
                _count: { select: { tickets: true } },
            },
        });
        if (!company) throw new NotFoundException('Empresa não encontrada');
        return company;
    }

    async createCompany(data: { name: string; cnpj?: string }) {
        if (data.cnpj) {
            const existing = await this.prisma.company.findUnique({ where: { cnpj: data.cnpj } });
            if (existing) throw new ConflictException('CNPJ já cadastrado');
        }
        return this.prisma.company.create({ data });
    }

    async updateCompany(id: string, data: { name?: string; cnpj?: string }) {
        await this.findCompanyById(id);
        if (data.cnpj) {
            const existing = await this.prisma.company.findFirst({ where: { cnpj: data.cnpj, NOT: { id } } });
            if (existing) throw new ConflictException('CNPJ já cadastrado');
        }
        return this.prisma.company.update({ where: { id }, data });
    }

    async deleteCompany(id: string) {
        const company = await this.findCompanyById(id);
        if (company.externalUsers.length > 0) throw new ConflictException('Empresa com usuários vinculados');
        const ticketCount = await this.prisma.ticket.count({ where: { companyId: id } });
        if (ticketCount > 0) throw new ConflictException('Empresa com chamados vinculados');
        return this.prisma.company.delete({ where: { id } });
    }

    // ═══════════════════════════════════════════
    // PROJECTS
    // ═══════════════════════════════════════════

    async findProjectsByCompany(companyId: string) {
        await this.findCompanyById(companyId);
        return this.prisma.project.findMany({
            where: { companyId },
            include: { _count: { select: { externalUsers: true } } },
            orderBy: { name: 'asc' },
        });
    }

    async createProject(companyId: string, data: { name: string; description?: string; phone?: string; address?: string; city?: string; state?: string }) {
        await this.findCompanyById(companyId);
        return this.prisma.project.create({
            data: { ...data, companyId },
        });
    }

    async updateProject(projectId: string, data: { name?: string; description?: string; phone?: string; address?: string; city?: string; state?: string }) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundException('Projeto não encontrado');
        return this.prisma.project.update({ where: { id: projectId }, data });
    }

    async deleteProject(projectId: string) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundException('Projeto não encontrado');
        const userCount = await this.prisma.externalUser.count({ where: { projectId } });
        if (userCount > 0) throw new ConflictException('Projeto com usuários vinculados');
        return this.prisma.project.delete({ where: { id: projectId } });
    }

    // ═══════════════════════════════════════════
    // CONTRACTORS
    // ═══════════════════════════════════════════

    async findAllContractors() {
        return this.prisma.contractorUser.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                city: true,
                state: true,
                cpf: true,
                isActive: true,
                createdAt: true,
                _count: { select: { maintenanceOrders: true } },
            },
            orderBy: { name: 'asc' },
        });
    }

    // ── Update Contractor (toggle active, etc.) ──
    async updateContractor(id: string, data: { isActive?: boolean }) {
        const contractor = await this.prisma.contractorUser.findUnique({ where: { id } });
        if (!contractor) throw new NotFoundException('Terceirizado não encontrado');

        const updateData: any = {};
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        return this.prisma.contractorUser.update({
            where: { id },
            data: updateData,
            select: {
                id: true, name: true, email: true, phone: true,
                city: true, state: true, cpf: true, isActive: true,
                createdAt: true, _count: { select: { maintenanceOrders: true } },
            },
        });
    }

    // ── Delete Contractor ──
    async deleteContractor(id: string) {
        const contractor = await this.prisma.contractorUser.findUnique({ where: { id } });
        if (!contractor) throw new NotFoundException('Terceirizado não encontrado');

        const osCount = await this.prisma.maintenanceOS.count({ where: { openedByContractorId: id } });
        if (osCount > 0) {
            throw new ConflictException(
                'Este terceirizado possui OS vinculadas. Desative-o ao invés de excluir.',
            );
        }

        return this.prisma.contractorUser.delete({ where: { id } });
    }

    // ═══════════════════════════════════════════
    // COMPANIES (Public search for registration)
    // ═══════════════════════════════════════════

    async searchCompanies(query?: string) {
        return this.prisma.company.findMany({
            where: query ? {
                OR: [
                    { name: { contains: query, mode: 'insensitive' as const } },
                    ...(query.length >= 3 ? [{ cnpj: { contains: query, mode: 'insensitive' as const } }] : []),
                ],
            } : {},
            select: { id: true, name: true, cnpj: true },
            orderBy: { name: 'asc' },
            take: 50,
        });
    }

    async findProjectsPublic(companyId: string) {
        return this.prisma.project.findMany({
            where: { companyId },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
        });
    }

    // ═══════════════════════════════════════════
    // EXTERNAL USERS
    // ═══════════════════════════════════════════

    async findAllExternalUsers(companyId?: string) {
        return this.prisma.externalUser.findMany({
            where: companyId ? { companyId } : {},
            include: {
                company: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } },
            },
            orderBy: [{ company: { name: 'asc' } }, { name: 'asc' }],
        });
    }

    async createExternalUser(data: {
        name: string;
        email: string;
        password: string;
        cpf?: string;
        phone?: string;
        position?: string;
        city?: string;
        state?: string;
        companyId: string;
        projectId?: string;
    }) {
        const company = await this.prisma.company.findUnique({ where: { id: data.companyId } });
        if (!company) throw new NotFoundException('Empresa não encontrada');

        if (data.projectId) {
            const project = await this.prisma.project.findFirst({
                where: { id: data.projectId, companyId: data.companyId },
            });
            if (!project) throw new NotFoundException('Projeto não encontrado ou não pertence à empresa');
        }

        const existing = await this.prisma.externalUser.findUnique({ where: { email: data.email } });
        if (existing) throw new ConflictException('Email já cadastrado');

        if (data.cpf) {
            const existingCpf = await this.prisma.externalUser.findUnique({ where: { cpf: data.cpf } });
            if (existingCpf) throw new ConflictException('CPF já cadastrado');
        }

        const { password, ...rest } = data;
        const passwordHash = await bcrypt.hash(password, 10);
        return this.prisma.externalUser.create({
            data: { ...rest, passwordHash },
            select: {
                id: true, name: true, email: true, cpf: true, phone: true,
                position: true, city: true, state: true,
                company: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } },
            },
        });
    }

    // ── External Login ──
    async loginExternal(email: string, password: string) {
        const user = await this.prisma.externalUser.findUnique({
            where: { email },
            include: { company: { select: { id: true, name: true } } },
        });
        if (!user || !user.isActive) throw new UnauthorizedException('Credenciais inválidas');

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) throw new UnauthorizedException('Credenciais inválidas');

        const payload = {
            sub: user.id,
            email: user.email,
            name: user.name,
            companyId: user.companyId,
            type: 'external' as const,
        };

        const accessToken = this.jwtService.sign(payload, { expiresIn: '1d' });
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                company: user.company,
                type: 'external' as const,
            },
        };
    }
}
