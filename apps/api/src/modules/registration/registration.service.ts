import {
    Injectable,
    ConflictException,
    NotFoundException,
    UnauthorizedException,
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

        // Find or create company
        let company: any = null;
        if (data.companyId) {
            company = await this.prisma.company.findUnique({ where: { id: data.companyId } });
            if (!company) throw new NotFoundException('Empresa não encontrada');
        } else if (data.companyName) {
            company = data.companyCnpj
                ? await this.prisma.company.findUnique({ where: { cnpj: data.companyCnpj } })
                : null;
            if (!company) {
                company = await this.prisma.company.create({
                    data: {
                        name: data.companyName,
                        cnpj: data.companyCnpj || null,
                    },
                });
            }
        }

        const passwordHash = await bcrypt.hash(data.password, 10);

        const user = await this.prisma.externalUser.create({
            data: {
                name: data.name,
                email: data.email,
                passwordHash,
                phone: data.phone,
                city: data.city,
                state: data.state,
                position: data.position,
                companyId: company?.id || null,
                projectId: data.projectId || null,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                city: true,
                state: true,
                position: true,
                company: { select: { id: true, name: true } },
            },
        });

        // Auto-link existing OS whose clientName matches this company (exact or partial)
        if (company) {
            // Exact match (case-insensitive)
            await this.prisma.maintenanceOS.updateMany({
                where: { companyId: null, clientName: { equals: company.name, mode: 'insensitive' } },
                data: { companyId: company.id },
            });
            // Partial match: clientName is contained in company name or vice versa
            // Load unlinked OS and match in memory to avoid complex DB queries
            const unlinked = await this.prisma.maintenanceOS.findMany({
                where: { companyId: null, clientName: { not: null } },
                select: { id: true, clientName: true },
            });
            const companyLower = company.name.toLowerCase();
            const toLink = unlinked
                .filter((os) => {
                    const nameLower = os.clientName!.toLowerCase().trim();
                    return companyLower.includes(nameLower) || nameLower.includes(companyLower);
                })
                .map((os) => os.id);
            if (toLink.length > 0) {
                await this.prisma.maintenanceOS.updateMany({
                    where: { id: { in: toLink } },
                    data: { companyId: company.id },
                });
            }
        }

        return {
            message: 'Cadastro realizado com sucesso! Faça login para acessar.',
            user,
        };
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
