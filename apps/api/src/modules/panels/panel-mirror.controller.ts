import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { panelStatisticsQuerySchema, panelTicketsQuerySchema, type PanelStatisticsQuery, type PanelTicketsQuery } from '@zyllen/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from '../auth/public.decorator';
import { PanelAccessService } from './panel-access.service';
import { PanelDataService } from './panel-data.service';
import { PanelCacheInterceptor } from './panel-cache.interceptor';
@Public() @Controller('panel-mirrors') @UseGuards(ThrottlerGuard) @Throttle({ auth: { limit: 180, ttl: 60_000 }, api: { limit: 180, ttl: 60_000 } }) @UseInterceptors(PanelCacheInterceptor)
export class PanelMirrorController {
    constructor(private readonly access: PanelAccessService, private readonly data: PanelDataService) {}
    @Get(':token')
    async metadata(@Param('token') token: string) { const actor = await this.access.mirror(token); return { data: { views: actor.views } }; }
    @Get(':token/statistics')
    async statistics(@Param('token') token: string, @Query(new ZodValidationPipe(panelStatisticsQuerySchema)) query: PanelStatisticsQuery) { return { data: await this.data.statistics(await this.access.mirror(token), query) }; }
    @Get(':token/tickets')
    async tickets(@Param('token') token: string, @Query(new ZodValidationPipe(panelTicketsQuerySchema)) query: PanelTicketsQuery) { return this.data.listTickets(await this.access.mirror(token), query); }
    @Get(':token/tickets/:id')
    async ticket(@Param('token') token: string, @Param('id', new ParseUUIDPipe()) id: string) { return { data: await this.data.ticket(await this.access.mirror(token), id) }; }
    @Get(':token/attention-clients')
    async attentionClients(@Param('token') token: string) { return { data: (await this.data.attentionClients(await this.access.mirror(token))).selected }; }
    @Get(':token/vehicles')
    async vehicles(@Param('token') token: string) { return { data: await this.data.vehicles(await this.access.mirror(token)) }; }
}
