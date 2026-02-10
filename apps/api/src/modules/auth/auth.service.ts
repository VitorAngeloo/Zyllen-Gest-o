import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    type: 'internal' | 'external';
}

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
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

        return {
            accessToken: this.jwtService.sign(payload),
            refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role.name,
            },
        };
    }

    // ── Refresh Token ──
    async refresh(refreshToken: string): Promise<{ accessToken: string }> {
        try {
            const payload = this.jwtService.verify<JwtPayload>(refreshToken);
            const newPayload: JwtPayload = {
                sub: payload.sub,
                email: payload.email,
                role: payload.role,
                type: payload.type,
            };
            return {
                accessToken: this.jwtService.sign(newPayload),
            };
        } catch {
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

        return bcrypt.compare(pin, user.pin4Hash);
    }

    // ── Create Internal User with unique PIN ──
    async createInternalUser(data: {
        name: string;
        email: string;
        password: string;
        roleId: string;
    }): Promise<{ user: { id: string; name: string; email: string }; pin: string }> {
        // Check if email already exists
        const existingUser = await this.prisma.internalUser.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new ConflictException('Email já cadastrado');
        }

        const passwordHash = await bcrypt.hash(data.password, 10);

        // Generate unique PIN with retry
        const { pin, pinHash } = await this.generateUniquePin();

        const user = await this.prisma.internalUser.create({
            data: {
                name: data.name,
                email: data.email,
                passwordHash,
                pin4Hash: pinHash,
                roleId: data.roleId,
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

    // ── Generate Unique 4-digit PIN ──
    private async generateUniquePin(): Promise<{ pin: string; pinHash: string }> {
        const MAX_RETRIES = 100;

        for (let i = 0; i < MAX_RETRIES; i++) {
            const pin = String(Math.floor(Math.random() * 10_000)).padStart(4, '0');
            const pinHash = await bcrypt.hash(pin, 10);

            // Check if any user already has this PIN
            // Since PIN is stored as hash, we need to check against all existing PINs
            // However, we use UNIQUE constraint on pin4Hash as a safety net
            // We can't compare hashes directly, so we use a different approach:
            // Generate and try to insert — if UNIQUE violation, retry
            const allUsers = await this.prisma.internalUser.findMany({
                select: { pin4Hash: true },
            });

            let pinExists = false;
            for (const user of allUsers) {
                if (await bcrypt.compare(pin, user.pin4Hash)) {
                    pinExists = true;
                    break;
                }
            }

            if (!pinExists) {
                return { pin, pinHash };
            }
        }

        throw new ConflictException(
            'Não foi possível gerar um PIN único. Tente novamente.',
        );
    }
}
