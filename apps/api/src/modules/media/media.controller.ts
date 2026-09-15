import { Controller, Get, Post, Delete, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ManagerGuard } from '../auth/manager.guard';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
    constructor(private readonly media: MediaService) {}
    @Delete('session')
    clearSession(@Res({ passthrough: true }) res: Response) { this.media.clearSession(res); return { message: 'Sessão de mídia encerrada' }; }
    @Get('shared/:token')
    async shared(@Param('token') token: string, @Req() req: Request, @Res() res: Response) {
        return this.media.serve(await this.media.sharedResource(token), req, res);
    }
    @Post(':kind/:id/shares')
    @UseGuards(JwtAuthGuard, ManagerGuard)
    async createShare(@Param('kind') kind: string, @Param('id') id: string, @Req() req: any) { return { data: await this.media.createShare(req.user, kind, id) }; }
    @Get(':kind/:id/shares')
    @UseGuards(JwtAuthGuard, ManagerGuard)
    async listShares(@Param('kind') kind: string, @Param('id') id: string, @Req() req: any) { return { data: await this.media.listShares(req.user, kind, id) }; }
    @Delete('shares/:id')
    @UseGuards(JwtAuthGuard, ManagerGuard)
    async revoke(@Param('id') id: string, @Req() req: any) { await this.media.revokeShare(req.user, id); return { message: 'Link revogado' }; }
    @Get(':kind/:id/file')
    async file(@Param('kind') kind: string, @Param('id') id: string, @Req() req: Request, @Res() res: Response) {
        const actor = await this.media.actorFromSession(req);
        const resource = await this.media.resource(kind, id);
        await this.media.authorize(actor, resource);
        return this.media.serve(resource, req, res);
    }
}
