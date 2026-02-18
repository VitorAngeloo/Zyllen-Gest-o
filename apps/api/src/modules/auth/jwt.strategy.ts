import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly prisma: PrismaService,
        configService: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
        });
    }

    async validate(payload: JwtPayload & { companyId?: string; name?: string }) {
        if (payload.type === 'internal') {
            const user = await this.prisma.internalUser.findUnique({
                where: { id: payload.sub },
                include: { role: true },
            });

            if (!user || !user.isActive) {
                throw new UnauthorizedException('Usuário não encontrado ou inativo');
            }

            return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: { id: user.role.id, name: user.role.name },
                roleId: user.roleId,
                type: 'internal',
            };
        }

        if (payload.type === 'external') {
            const user = await this.prisma.externalUser.findUnique({
                where: { id: payload.sub },
                include: { company: { select: { id: true, name: true } } },
            });

            if (!user || !user.isActive) {
                throw new UnauthorizedException('Usuário externo não encontrado ou inativo');
            }

            return {
                id: user.id,
                email: user.email,
                name: user.name,
                companyId: user.companyId,
                company: user.company,
                type: 'external',
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
                id: user.id,
                email: user.email,
                name: user.name,
                type: 'contractor',
            };
        }

        throw new UnauthorizedException('Tipo de token inválido');
    }
}
