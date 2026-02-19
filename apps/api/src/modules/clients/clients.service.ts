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
            include: { _count: { select: { externalUsers: true, tickets: true } } },
            orderBy: { name: 'asc' },
        });
    }

    async findCompanyById(id: string) {
        const company = await this.prisma.company.findUnique({
            where: { id },
            include: {
                externalUsers: { select: { id: true, name: true, email: true } },
                _count: { select: { tickets: true } },
            },
        });
        if (!company) throw new NotFoundException('Empresa não encontrada');
        return company;
    }

    async createCompany(data: { name: string; cnpj?: string; address?: string; phone?: string }) {
        if (data.cnpj) {
            const existing = await this.prisma.company.findUnique({ where: { cnpj: data.cnpj } });
            if (existing) throw new ConflictException('CNPJ já cadastrado');
        }
        return this.prisma.company.create({ data });
    }

    async updateCompany(id: string, data: { name?: string; cnpj?: string; address?: string; phone?: string }) {
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
            take: 20,
        });
    }

    // ═══════════════════════════════════════════
    // EXTERNAL USERS
    // ═══════════════════════════════════════════

    async findAllExternalUsers(companyId?: string) {
        return this.prisma.externalUser.findMany({
            where: companyId ? { companyId } : {},
            include: { company: { select: { id: true, name: true } } },
            orderBy: { name: 'asc' },
        });
    }

    async createExternalUser(data: { name: string; email: string; password: string; companyId: string }) {
        const company = await this.prisma.company.findUnique({ where: { id: data.companyId } });
        if (!company) throw new NotFoundException('Empresa não encontrada');

        const existing = await this.prisma.externalUser.findUnique({ where: { email: data.email } });
        if (existing) throw new ConflictException('Email já cadastrado');

        const passwordHash = await bcrypt.hash(data.password, 10);
        return this.prisma.externalUser.create({
            data: { name: data.name, email: data.email, passwordHash, companyId: data.companyId },
            select: { id: true, name: true, email: true, company: { select: { name: true } } },
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
