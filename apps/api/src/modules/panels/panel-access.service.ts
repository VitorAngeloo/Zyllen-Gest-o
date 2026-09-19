import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PANEL_IDS, PANEL_PERMISSIONS, type PanelId, type PanelMirrorInput, type PanelMirrorStatus } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface PanelActor { id: string; role: { name: string }; views: PanelId[] }
@Injectable()
export class PanelAccessService {
    constructor(private readonly prisma: PrismaService) {}
    async owner(id: string): Promise<PanelActor> {
        const user = await this.prisma.retry(() => this.prisma.internalUser.findUnique({ where: { id }, select: { id: true, isActive: true, role: { select: { name: true, permissions: { select: { screenPermission: { select: { screen: true, action: true } } } } } } } }));
        if (!user?.isActive) throw new ForbiddenException('Acesso ao painel indisponível');
        const permissions = user.role.name === 'Administrador' ? Object.values(PANEL_PERMISSIONS) : user.role.permissions.map(({ screenPermission }) => `${screenPermission.screen}.${screenPermission.action}`);
        return { id, role: { name: user.role.name }, views: PANEL_IDS.filter(view => permissions.includes(PANEL_PERMISSIONS[view])) };
    }
    require(actor: PanelActor, view: PanelId) { if (!actor.views.includes(view)) throw new ForbiddenException('Esta visão não está disponível neste painel'); }
    async status(ownerId: string): Promise<PanelMirrorStatus> {
        const actor = await this.owner(ownerId);
        if (!actor.views.length) throw new ForbiddenException('Nenhuma visão autorizada');
        const row = await this.prisma.retry(() => this.prisma.panelMirror.findUnique({ where: { ownerId }, select: { views: true, revokedAt: true, updatedAt: true } }));
        return { active: !!row && !row.revokedAt, views: row ? actor.views.filter(view => row.views.includes(view)) : [], updatedAt: row?.updatedAt.toISOString() ?? null };
    }
    async create(ownerId: string, input: PanelMirrorInput) {
        const actor = await this.owner(ownerId);
        for (const view of input.views) this.require(actor, view);
        const token = randomBytes(32).toString('base64url'), tokenHash = createHash('sha256').update(token).digest('hex');
        await this.prisma.$transaction(async tx => {
            const row = await tx.panelMirror.upsert({ where: { ownerId }, create: { ownerId, tokenHash, views: input.views }, update: { tokenHash, views: input.views, revokedAt: null } });
            await tx.auditLog.create({ data: { action: 'PANEL_MIRROR_GENERATED', entityType: 'PanelMirror', entityId: row.id, userId: ownerId, details: { views: input.views } } });
        });
        return { path: `/painel/espelho/${token}`, views: input.views };
    }
    async revoke(ownerId: string) {
        await this.owner(ownerId);
        await this.prisma.$transaction(async tx => {
            const row = await tx.panelMirror.findUnique({ where: { ownerId } });
            if (!row) return;
            const changed = await tx.panelMirror.updateMany({ where: { id: row.id, revokedAt: null }, data: { revokedAt: new Date() } });
            if (changed.count) await tx.auditLog.create({ data: { action: 'PANEL_MIRROR_REVOKED', entityType: 'PanelMirror', entityId: row.id, userId: ownerId } });
        });
    }
    async mirror(token: string): Promise<PanelActor> {
        const missing = () => new NotFoundException('Este espelho não está disponível. Solicite um novo link.');
        if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw missing();
        const row = await this.prisma.retry(() => this.prisma.panelMirror.findUnique({ where: { tokenHash: createHash('sha256').update(token).digest('hex') }, select: { ownerId: true, views: true, revokedAt: true } }));
        if (!row || row.revokedAt) throw missing();
        let owner: PanelActor;
        try { owner = await this.owner(row.ownerId); } catch (error) { if (error instanceof ForbiddenException) throw missing(); throw error; }
        const actor = { ...owner, views: owner.views.filter(view => row.views.includes(view)) };
        if (!actor.views.length) throw missing();
        return actor;
    }
}
