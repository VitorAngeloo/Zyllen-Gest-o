import {
    Injectable,
    ConflictException,
    NotFoundException,
    UnauthorizedException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { encryptCPF } from '../../lib/cpf-crypto';

@Injectable()
export class RegistrationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    // ═══════════════════════════════════════════
    // CLIENT REGISTRATION (self-service)
    // ═══════════════════════════════════════════

    async registerClient(data: {
        name: string;
        email: string;
        password: string;
        phone?: string;
        city?: string;
        state?: string;
        position?: string;
        cpf?: string;
        companyName?: string;
        companyId?: string;
        companyCnpj?: string;
        projectId?: string;
    }) {
        // Check if email already exists
        const existingUser = await this.prisma.externalUser.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new ConflictException('Email já cadastrado');
        }

        // O vínculo informado é somente uma solicitação, nunca autorização.
        if (data.companyId) {
            const company = await this.prisma.company.findUnique({ where: { id: data.companyId } });
            if (!company) throw new NotFoundException('Empresa não encontrada');
        } else if (!data.companyName?.trim()) {
            throw new BadRequestException('Informe a empresa para análise do cadastro');
        }
        if (data.projectId && (!data.companyId || !await this.prisma.project.findFirst({
            where: { id: data.projectId, companyId: data.companyId },
        }))) {
            throw new BadRequestException('Projeto não pertence à empresa informada');
        }
        const previous = await this.prisma.clientRegistrationRequest.findUnique({ where: { email: data.email } });
        if (previous) throw new ConflictException('Já existe uma solicitação para este email. Entre em contato com a Skyline.');
        const { password, cpf, ...request } = data;
        await this.prisma.clientRegistrationRequest.create({
            data: { ...request, passwordHash: await bcrypt.hash(password, 10), cpf: cpf ? encryptCPF(cpf) : null },
        });
        return {
            message: 'Solicitação enviada! Aguarde a aprovação de um Administrador ou Gestor para acessar.',
            status: 'PENDING',
        };
    }

    async listClientRequests(status: 'PENDING' | 'APPROVED' | 'REJECTED', skip = 0, take = 50) {
        const where = { status };
        const [data, total] = await Promise.all([
            this.prisma.clientRegistrationRequest.findMany({
                where, skip, take, orderBy: { createdAt: 'asc' },
                select: {
                    id: true, name: true, email: true, phone: true, city: true, state: true, position: true,
                    companyId: true, projectId: true, companyName: true, companyCnpj: true,
                    status: true, createdAt: true, reviewedAt: true, rejectionReason: true,
                },
            }),
            this.prisma.clientRegistrationRequest.count({ where }),
        ]);
        return { data, total };
    }

    async approveClient(id: string, reviewerId: string, data: { companyId?: string; projectId?: string; companyName?: string; companyCnpj?: string }) {
        return this.prisma.$transaction(async (tx) => {
            const request = await tx.clientRegistrationRequest.findUnique({ where: { id } });
            if (!request) throw new NotFoundException('Solicitação não encontrada');
            const claimed = await tx.clientRegistrationRequest.updateMany({
                where: { id, status: 'PENDING' }, data: { status: 'APPROVED', reviewedById: reviewerId, reviewedAt: new Date() },
            });
            if (claimed.count !== 1) throw new ConflictException('Solicitação já analisada');
            let companyId = data.companyId;
            if (companyId) {
                if (!await tx.company.findUnique({ where: { id: companyId } })) throw new NotFoundException('Empresa não encontrada');
            } else {
                if (!data.companyName?.trim()) throw new BadRequestException('Selecione uma empresa ou confirme os dados da nova empresa');
                const company = await tx.company.create({ data: { name: data.companyName.trim(), cnpj: data.companyCnpj || null } });
                companyId = company.id;
            }
            if (data.projectId && !await tx.project.findFirst({ where: { id: data.projectId, companyId } })) {
                throw new BadRequestException('Projeto não pertence à empresa aprovada');
            }
            const user = await tx.externalUser.create({
                data: {
                    name: request.name, email: request.email, passwordHash: request.passwordHash, cpf: request.cpf,
                    phone: request.phone, city: request.city, state: request.state, position: request.position,
                    companyId, projectId: data.projectId || null, isActive: true,
                },
                select: { id: true, name: true, email: true },
            });
            await tx.clientRegistrationRequest.update({ where: { id }, data: { approvedUserId: user.id, passwordHash: '', cpf: null } });
            await tx.auditLog.create({ data: { action: 'CLIENT_REGISTRATION_APPROVED', entityType: 'ClientRegistrationRequest', entityId: id,
                userId: reviewerId, details: { externalUserId: user.id, companyId, projectId: data.projectId ?? null } } });
            return { data: user, message: 'Cliente aprovado. O acesso já está liberado.' };
        });
    }

    async rejectClient(id: string, reviewerId: string, reason: string) {
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.clientRegistrationRequest.updateMany({
                where: { id, status: 'PENDING' }, data: { status: 'REJECTED', reviewedById: reviewerId, reviewedAt: new Date(), rejectionReason: reason, passwordHash: '', cpf: null },
            });
            if (updated.count !== 1) throw new ConflictException('Solicitação inexistente ou já analisada');
            await tx.auditLog.create({ data: { action: 'CLIENT_REGISTRATION_REJECTED', entityType: 'ClientRegistrationRequest', entityId: id, userId: reviewerId, details: { reason } } });
            return { message: 'Solicitação rejeitada' };
        });
    }

    // ═══════════════════════════════════════════
    // CONTRACTOR REGISTRATION (self-service)
    // ═══════════════════════════════════════════

    async registerContractor(data: {
        name: string;
        email: string;
        password: string;
        phone?: string;
        city?: string;
        state?: string;
        cpf?: string;
    }) {
        // Check if email already exists
        const existingUser = await this.prisma.contractorUser.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new ConflictException('Email já cadastrado');
        }

        // Check CPF uniqueness (compara com valor criptografado, pois a criptografia é determinística)
        if (data.cpf) {
            const encryptedCpf = encryptCPF(data.cpf);
            const existingCpf = await this.prisma.contractorUser.findUnique({
                where: { cpf: encryptedCpf },
            });
            if (existingCpf) throw new ConflictException('CPF já cadastrado');
        }

        const passwordHash = await bcrypt.hash(data.password, 10);

        const user = await this.prisma.contractorUser.create({
            data: {
                name: data.name,
                email: data.email,
                passwordHash,
                phone: data.phone,
                city: data.city,
                state: data.state,
                cpf: data.cpf ? encryptCPF(data.cpf) : null,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                city: true,
                state: true,
            },
        });

        return {
            message: 'Cadastro realizado com sucesso! Faça login para acessar.',
            user,
        };
    }

    // ═══════════════════════════════════════════
    // CONTRACTOR LOGIN
    // ═══════════════════════════════════════════

    async loginContractor(email: string, password: string) {
        const user = await this.prisma.contractorUser.findUnique({
            where: { email },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        const payload = {
            sub: user.id,
            email: user.email,
            name: user.name,
            type: 'contractor' as const,
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
                type: 'contractor' as const,
            },
        };
    }
}
