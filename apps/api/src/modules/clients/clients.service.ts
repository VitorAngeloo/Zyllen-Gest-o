import {
    Injectable,
    NotFoundException,
    ConflictException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { encryptCPF, decryptCPFSafe } from '../../infrastructure/security/cpf-crypto';
import { createClientStock } from './client-stock';

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
            take: 500,
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

    async createCompany(data: { name: string; cnpj?: string }, actorId: string) {
        if (data.cnpj) {
            const existing = await this.prisma.company.findUnique({ where: { cnpj: data.cnpj } });
            if (existing) throw new ConflictException('CNPJ já cadastrado');
        }
        return this.prisma.$transaction(async tx => {
            const company = await tx.company.create({ data });
            await createClientStock(tx, company, actorId);
            return company;
        });
    }

    async findCompaniesPage(query: string, page: number) {
        const pageSize = 50;
        const search = query.trim().slice(0, 120);
        const digits = /^[\d.\-/\s]+$/.test(search) ? search.replace(/\D/g, '') : '';
        const cnpjMatches = digits
            ? await this.prisma.$queryRaw<Array<{ id: string }>>`
                SELECT id FROM "Company"
                WHERE regexp_replace(COALESCE(cnpj, ''), '[^0-9]', '', 'g') LIKE ${`%${digits}%`}
            `
            : [];
        const where: Prisma.CompanyWhereInput = search ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                ...(cnpjMatches.length ? [{ id: { in: cnpjMatches.map(company => company.id) } }] : []),
            ],
        } : {};
        const [data, total] = await Promise.all([
            this.prisma.company.findMany({
                where,
                include: { _count: { select: { externalUsers: true, tickets: true, projects: true } } },
                orderBy: [{ name: 'asc' }, { id: 'asc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            this.prisma.company.count({ where }),
        ]);
        return { data, total, page, pageSize };
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
        return this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT id FROM "Company" WHERE id = ${id} FOR UPDATE`;
            const locationIds = (await tx.location.findMany({
                where: { companyId: id },
                select: { id: true },
            })).map(location => location.id);
            if (locationIds.length) {
                const [assets, movements, transfers, minimums] = await Promise.all([
                    tx.asset.count({ where: { currentLocationId: { in: locationIds } } }),
                    tx.stockMovement.count({ where: { OR: [{ fromLocationId: { in: locationIds } }, { toLocationId: { in: locationIds } }] } }),
                    tx.inventoryTransfer.count({ where: { OR: [{ fromLocationId: { in: locationIds } }, { toLocationId: { in: locationIds } }] } }),
                    tx.stockMinimum.count({ where: { locationId: { in: locationIds } } }),
                ]);
                if (assets || movements || transfers || minimums) {
                    throw new ConflictException('Empresa com estoque ou histórico de movimentações vinculado');
                }
                await tx.location.deleteMany({ where: { id: { in: locationIds } } });
            }
            return tx.company.delete({ where: { id } });
        });
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
        const rows = await this.prisma.contractorUser.findMany({
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
            take: 500,
        });
        return rows.map((r) => ({ ...r, cpf: decryptCPFSafe(r.cpf) }));
    }

    // ── Update Contractor (toggle active, etc.) ──
    async updateContractor(id: string, data: { isActive?: boolean }) {
        const contractor = await this.prisma.contractorUser.findUnique({ where: { id } });
        if (!contractor) throw new NotFoundException('Terceirizado não encontrado');

        const updateData: any = {};
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        const updated = await this.prisma.contractorUser.update({
            where: { id },
            data: updateData,
            select: {
                id: true, name: true, email: true, phone: true,
                city: true, state: true, cpf: true, isActive: true,
                createdAt: true, _count: { select: { maintenanceOrders: true } },
            },
        });
        return { ...updated, cpf: decryptCPFSafe(updated.cpf) };
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
            take: 500,
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

    async findAllExternalUsers(params?: { companyId?: string; skip?: number; take?: number }) {
        const where = params?.companyId ? { companyId: params.companyId } : {};
        const [data, total] = await Promise.all([
            this.prisma.externalUser.findMany({
                where,
                select: {
                    id: true, name: true, email: true, phone: true, position: true, city: true, state: true,
                    companyId: true, projectId: true, isActive: true, createdAt: true, updatedAt: true,
                    company: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } },
                },
                orderBy: [{ company: { name: 'asc' } }, { name: 'asc' }],
                skip: params?.skip ?? 0,
                take: params?.take ?? 200,
            }),
            this.prisma.externalUser.count({ where }),
        ]);
        return { data, total };
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
    }, authorizedById: string) {
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
            const encryptedCpf = encryptCPF(data.cpf);
            const existingCpf = await this.prisma.externalUser.findUnique({ where: { cpf: encryptedCpf } });
            if (existingCpf) throw new ConflictException('CPF já cadastrado');
        }

        const { password, cpf, ...rest } = data;
        const passwordHash = await bcrypt.hash(password, 10);
        const created = await this.prisma.$transaction(async tx => {
            const user = await tx.externalUser.create({
                data: { ...rest, passwordHash, cpf: cpf ? encryptCPF(cpf) : null },
                select: {
                    id: true, name: true, email: true, cpf: true, phone: true,
                    position: true, city: true, state: true,
                    company: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } },
                },
            });
            await tx.auditLog.create({ data: {
                action: 'CLIENT_CREATED_BY_MANAGER', entityType: 'ExternalUser', entityId: user.id, userId: authorizedById,
                details: { companyId: data.companyId, projectId: data.projectId ?? null },
            } });
            return user;
        });
        return { ...created, cpf: decryptCPFSafe(created.cpf) };
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
