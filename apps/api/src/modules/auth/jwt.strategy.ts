import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'change-me-in-production',
        });
    }

    async validate(payload: JwtPayload) {
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
                role: user.role.name,
                roleId: user.roleId,
                type: 'internal',
            };
        }

        throw new UnauthorizedException('Tipo de token inválido');
    }
}
