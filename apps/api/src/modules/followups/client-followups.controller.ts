import {
    Controller, Get, Param, Query, UseGuards, Request, ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FollowupsService } from './followups.service';

/**
 * Client portal — read-only access to Acompanhamentos linked to their company.
 */
@Controller('client/followups')
@UseGuards(JwtAuthGuard)
export class ClientFollowupsController {
    constructor(private readonly followupsService: FollowupsService) { }

    private assertCompany(req: any) {
        if (req.user?.type !== 'external') throw new ForbiddenException('Acesso restrito a clientes');
        if (!req.user?.companyId) throw new ForbiddenException('Usuário não está vinculado a uma empresa');
    }

    @Get()
    async listMyCompanyFollowups(
        @Request() req: any,
        @Query('status') status?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        this.assertCompany(req);
        const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
        const l = Math.min(50, Math.max(1, parseInt(limit ?? '20', 10) || 20));
        const result = await this.followupsService.findAll({
            companyId: req.user.companyId,
            status: status || undefined,
            skip: (p - 1) * l,
            take: l,
        });
        return { data: result.data, total: result.total, page: p, limit: l };
    }

    @Get(':id')
    async findOne(@Request() req: any, @Param('id') id: string) {
        this.assertCompany(req);
        const followup = await this.followupsService.findById(id);
        if (followup.companyId !== req.user.companyId) {
            throw new ForbiddenException('Acompanhamento não pertence à sua empresa');
        }
        return { data: followup };
    }
}
