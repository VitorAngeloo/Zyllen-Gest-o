import { Controller, ForbiddenException, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InternalDashboardService } from './internal-dashboard.service';

@Controller('internal-dashboard')
@UseGuards(JwtAuthGuard)
export class InternalDashboardController {
    constructor(private readonly dashboard: InternalDashboardService) {}

    @Get()
    async get(@Request() req: any) {
        if (req.user.type !== 'internal' || req.user.role?.name !== 'Internos') {
            throw new ForbiddenException('Esta dashboard é exclusiva para o perfil Internos');
        }
        return { data: await this.dashboard.get(req.user.id) };
    }
}
