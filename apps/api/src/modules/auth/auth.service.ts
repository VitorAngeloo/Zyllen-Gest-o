import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    type: 'internal' | 'external' | 'contractor';
}

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: { id: string; name: string };
        type?: string;
    };
}

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    // ── Internal Login (email + password → JWT) ──
    async loginInternal(email: string, password: string): Promise<TokenResponse> {
        const user = await this.prisma.internalUser.findUnique({
            where: { email },
            include: { role: true },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role.name,
            type: 'internal',
        };

        const result: TokenResponse = {
            accessToken: this.jwtService.sign(payload),
            refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: { id: user.role.id, name: user.role.name },
                type: 'internal',
            },
        };

        // AuditLog — LOGIN
        await this.prisma.auditLog.create({
            data: {
                action: 'LOGIN',
                entityType: 'InternalUser',
                entityId: user.id,
                userId: user.id,
                details: JSON.stringify({ email: user.email, role: user.role.name }),
            },
        });

        return result;
    }

    // ── Refresh Token ──
    async refresh(refreshToken: string): Promise<{ accessToken: string }> {
        try {
            const payload = this.jwtService.verify<JwtPayload>(refreshToken);

            // Revalidate user still exists and is active
            if (payload.type === 'internal') {
                const user = await this.prisma.internalUser.findUnique({
                    where: { id: payload.sub },
                    include: { role: true },
                });
                if (!user || !user.isActive) {
                    throw new UnauthorizedException('Usuário inativo ou removido');
                }
                // Use fresh role data
                const newPayload: JwtPayload = {
                    sub: user.id,
                    email: user.email,
                    role: user.role.name,
                    type: 'internal',
                };
                return { accessToken: this.jwtService.sign(newPayload) };
            }

            if (payload.type === 'external') {
                const user = await this.prisma.externalUser.findUnique({
                    where: { id: payload.sub },
                });
                if (!user || !user.isActive) {
                    throw new UnauthorizedException('Usuário externo não encontrado ou inativo');
                }
                return {
                    accessToken: this.jwtService.sign({
                        sub: user.id,
                        email: user.email,
                        name: user.name,
                        companyId: user.companyId,
                        type: 'external',
                    }),
                };
            }

            if (payload.type === 'contractor') {
                const user = await this.prisma.contractorUser.findUnique({
                    where: { id: payload.sub },
                });
                if (!user || !user.isActive) {
                    throw new UnauthorizedException('Terceirizado não encontrado ou inativo');
                }
                return {
                    accessToken: this.jwtService.sign({
                        sub: user.id,
                        email: user.email,
                        name: user.name,
                        type: 'contractor',
                    }),
                };
            }

            throw new UnauthorizedException('Tipo de token inválido');
        } catch (err) {
            if (err instanceof UnauthorizedException) throw err;
            throw new UnauthorizedException('Refresh token inválido ou expirado');
        }
    }

    // ── Validate PIN ──
    async validatePin(userId: string, pin: string): Promise<boolean> {
        const user = await this.prisma.internalUser.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new UnauthorizedException('Usuário não encontrado');
        }

        if (!user.pin4Hash) {
            return false;
        }

        return bcrypt.compare(pin, user.pin4Hash);
    }

    // ── Create Internal User with unique PIN ──
    async createInternalUser(data: {
        name: string;
        email: string;
        password: string;
        roleId: string;
        sector?: string;
        description?: string;
        pin?: string;
    }): Promise<{ user: { id: string; name: string; email: string }; pin: string }> {
        // Check if email already exists
        const existingUser = await this.prisma.internalUser.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new ConflictException('Email já cadastrado');
        }

        // Check if role exists
        const role = await this.prisma.role.findUnique({
            where: { id: data.roleId },
        });
        if (!role) {
            throw new ConflictException('Role não encontrada');
        }

        const passwordHash = await bcrypt.hash(data.password, 10);

        // Use provided PIN or generate a unique one
        let pin: string;
        let pinHash: string;
        if (data.pin) {
            pin = data.pin;
            pinHash = await bcrypt.hash(pin, 10);
        } else {
            const generated = await this.generateUniquePin();
            pin = generated.pin;
            pinHash = generated.pinHash;
        }

        const user = await this.prisma.internalUser.create({
            data: {
                name: data.name,
                email: data.email,
                passwordHash,
                pin4Hash: pinHash,
                roleId: data.roleId,
                sector: data.sector,
                description: data.description,
            },
        });

        // AuditLog — USER_CREATED
        await this.prisma.auditLog.create({
            data: {
                action: 'USER_CREATED',
                entityType: 'InternalUser',
                entityId: user.id,
                userId: user.id,
                details: JSON.stringify({
                    name: user.name,
                    email: user.email,
                    role: role.name,
                }),
            },
        });

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
            pin, // Return plain PIN to show once to the user
        };
    }

    // ── List Internal Users ──
    async findAllInternalUsers() {
        return this.prisma.internalUser.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                sector: true,
                description: true,
                isActive: true,
                createdAt: true,
                role: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    // ── Get Internal User by ID (with activity) ──
    async findInternalUserById(id: string) {
        const user = await this.prisma.internalUser.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                sector: true,
                description: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
                role: { select: { id: true, name: true } },
            },
        });

        if (!user) throw new NotFoundException('Usuário não encontrado');

        // Fetch activity: tickets assigned, maintenance OS opened/closed, audit logs
        const [assignedTickets, maintenanceOpened, maintenanceClosed, auditLogs] = await Promise.all([
            this.prisma.ticket.findMany({
                where: { assignedToInternalUserId: id },
                select: {
                    id: true, title: true, status: true, priority: true, createdAt: true,
                    company: { select: { name: true } },
                    externalUser: { select: { name: true } },
                },
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
            this.prisma.maintenanceOS.findMany({
                where: { openedById: id },
                select: {
                    id: true, status: true, createdAt: true, notes: true,
                    asset: { select: { assetCode: true, sku: { select: { name: true } } } },
                },
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
            this.prisma.maintenanceOS.findMany({
                where: { closedById: id },
                select: {
                    id: true, status: true, createdAt: true, updatedAt: true,
                    asset: { select: { assetCode: true, sku: { select: { name: true } } } },
                },
                orderBy: { updatedAt: 'desc' },
                take: 50,
            }),
            this.prisma.auditLog.findMany({
                where: { userId: id },
                select: {
                    id: true, action: true, entityType: true, entityId: true, details: true, createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 100,
            }),
        ]);

        return {
            ...user,
            activity: {
                assignedTickets,
                maintenanceOpened,
                maintenanceClosed,
                auditLogs,
            },
        };
    }

    // ── Verify Current Password ──
    async verifyCurrentPassword(userId: string, currentPassword: string): Promise<void> {
        const user = await this.prisma.internalUser.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('Usuário não encontrado');
        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid) throw new UnauthorizedException('Senha atual incorreta');
    }

    // ── Update Internal User ──
    async updateInternalUser(id: string, data: {
        name?: string; email?: string; roleId?: string; isActive?: boolean;
        sector?: string; description?: string; password?: string; pin?: string;
    }) {
        const user = await this.prisma.internalUser.findUnique({ where: { id } });
        if (!user) throw new UnauthorizedException('Usuário não encontrado');

        if (data.email && data.email !== user.email) {
            const existing = await this.prisma.internalUser.findUnique({ where: { email: data.email } });
            if (existing) throw new ConflictException('Email já cadastrado');
        }

        if (data.roleId) {
            const role = await this.prisma.role.findUnique({ where: { id: data.roleId } });
            if (!role) throw new ConflictException('Role não encontrada');
        }

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.roleId !== undefined) updateData.roleId = data.roleId;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.sector !== undefined) updateData.sector = data.sector;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);
        if (data.pin) updateData.pin4Hash = await bcrypt.hash(data.pin, 10);

        return this.prisma.internalUser.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                sector: true,
                description: true,
                isActive: true,
                role: { select: { id: true, name: true } },
            },
        });
    }

    // ── Delete Internal User ──
    async deleteInternalUser(id: string, requesterId: string) {
        if (id === requesterId) throw new ConflictException('Você não pode excluir a própria conta');

        const user = await this.prisma.internalUser.findUnique({ where: { id } });
        if (!user) throw new NotFoundException('Usuário não encontrado');

        // Check for related records that block hard-delete
        const [tickets, maintenance, movements, approvals, receivings, exits] = await Promise.all([
            this.prisma.ticket.count({ where: { assignedToInternalUserId: id } }),
            this.prisma.maintenanceOS.count({ where: { openedById: id } }),
            this.prisma.stockMovement.count({ where: { createdByInternalUserId: id } }),
            this.prisma.approvalRequest.count({ where: { requestedById: id } }),
            this.prisma.receiving.count({ where: { receivedById: id } }),
            this.prisma.productExit.count({ where: { createdById: id } }),
        ]);

        if (tickets + maintenance + movements + approvals + receivings + exits > 0) {
            throw new ConflictException(
                'Este usuário possui registros vinculados (chamados, OS, movimentações ou aprovações). Desative-o ao invés de excluir.',
            );
        }

        // Remove audit logs + labels, then delete user
        await this.prisma.auditLog.deleteMany({ where: { userId: id } });
        await this.prisma.labelPrintJob.deleteMany({ where: { printedById: id } });
        return this.prisma.internalUser.delete({ where: { id } });
    }

    // ── Reset User PIN ──
    async resetPin(userId: string) {
        const user = await this.prisma.internalUser.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException('Usuário não encontrado');

        const { pin, pinHash } = await this.generateUniquePin();
        await this.prisma.internalUser.update({
            where: { id: userId },
            data: { pin4Hash: pinHash },
        });

        return { pin };
    }

    // ── Generate Unique 4-digit PIN ──
    private async generateUniquePin(): Promise<{ pin: string; pinHash: string }> {
        const MAX_RETRIES = 100;

        // Pre-fetch all PIN hashes once
        const allUsers = await this.prisma.internalUser.findMany({
            select: { pin4Hash: true },
        });
        const existingHashes = allUsers.map((u) => u.pin4Hash).filter(Boolean) as string[];

        for (let i = 0; i < MAX_RETRIES; i++) {
            const pin = String(Math.floor(Math.random() * 10_000)).padStart(4, '0');

            // Check against existing hashes
            let pinExists = false;
            for (const hash of existingHashes) {
                if (await bcrypt.compare(pin, hash)) {
                    pinExists = true;
                    break;
                }
            }

            if (!pinExists) {
                const pinHash = await bcrypt.hash(pin, 10);
                return { pin, pinHash };
            }
        }

        throw new ConflictException(
            'Não foi possível gerar um PIN único. Tente novamente.',
        );
    }
}
