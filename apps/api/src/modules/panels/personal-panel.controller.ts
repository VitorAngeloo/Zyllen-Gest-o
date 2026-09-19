import { Body, Controller, Delete, ForbiddenException, Get, Post, Query, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { panelMirrorInputSchema, panelStatisticsQuerySchema, type PanelMirrorInput, type PanelStatisticsQuery } from '@zyllen/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PanelAccessService } from './panel-access.service';
import { PanelDataService } from './panel-data.service';
import { PanelCacheInterceptor } from './panel-cache.interceptor';
@Controller('personal-panel') @UseGuards(JwtAuthGuard) @UseInterceptors(PanelCacheInterceptor)
export class PersonalPanelController {
    constructor(private readonly access: PanelAccessService, private readonly data: PanelDataService) {}
    @Get('statistics')
    async statistics(@Request() req: any, @Query(new ZodValidationPipe(panelStatisticsQuerySchema)) query: PanelStatisticsQuery) {
        this.internal(req);
        return { data: await this.data.statistics(await this.access.owner(req.user.id), query) };
    }
    private internal(req: any) { if (req.user.type !== 'internal') throw new ForbiddenException('Este painel é destinado à equipe interna'); }
    @Get('mirror')
    async mirror(@Request() req: any) { this.internal(req); return { data: await this.access.status(req.user.id) }; }
    @Post('mirror')
    async create(@Request() req: any, @Body(new ZodValidationPipe(panelMirrorInputSchema)) input: PanelMirrorInput) { this.internal(req); return { data: await this.access.create(req.user.id, input) }; }
    @Delete('mirror')
    async revoke(@Request() req: any) { this.internal(req); await this.access.revoke(req.user.id); return { data: null }; }
}
