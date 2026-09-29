import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PANEL_IDS, PANEL_PERMISSION_OPTIONS, type PanelId, type PanelMirrorInput, type PanelMirrorStatus } from '@zyllen/shared';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface PanelActor { id: string; role: { name: string }; views: PanelId[] }

@Injectable()
export class PanelAccessService {
    constructor(private readonly prisma: PrismaService) {}

    async owner(id: string): Promise<PanelActor> {
        const user = await this.prisma.retry(() => this.prisma.internalUser.findUnique({
            where: { id },
            select: {
                id: true,
                isActive: true,
                role: {
                    select: {
                        name: true,
                        permissions: { select: { screenPermission: { select: { screen: true, action: true } } } },
                    },
                },
            },
        }));
        if (!user?.isActive) throw new ForbiddenException('Acesso ao painel indisponível');
        const permissions = user.role.permissions.map(({ screenPermission }) => `${screenPermission.screen}.${screenPermission.action}`);
        return { id, role: { name: user.role.name }, views: user.role.name === 'Administrador' ? [...PANEL_IDS] : PANEL_IDS.filter(view => PANEL_PERMISSION_OPTIONS[view].some(permission => permissions.includes(permission))) };
    }

    require(actor: PanelActor, view: PanelId) {
        if (!actor.views.includes(view)) throw new ForbiddenException('Esta visão não está disponível neste painel');
    }

    async status(ownerId: string): Promise<PanelMirrorStatus> {
        const actor = await this.owner(ownerId);
        if (!actor.views.length) throw new ForbiddenException('Nenhuma visão autorizada');
        const rows = await this.prisma.retry(() => this.prisma.panelMirror.findMany({ where: { ownerId, revokedAt: null }, orderBy: { updatedAt: 'desc' }, select: { views: true, updatedAt: true } }));
        const latest = rows[0];
        return { active: rows.length > 0, activeLinks: rows.length, views: latest ? actor.views.filter(view => latest.views.includes(view)) : [], updatedAt: latest?.updatedAt.toISOString() ?? null };
    }

    async create(ownerId: string, input: PanelMirrorInput) {
        const actor = await this.owner(ownerId);
        for (const view of input.views) this.require(actor, view);
        const token = randomBytes(32).toString('base64url');
        const tokenHash = createHash('sha256').update(token).digest('hex');
        await this.prisma.$transaction(async tx => {
            const synchronized = await tx.panelMirror.updateMany({ where: { ownerId, revokedAt: null }, data: { views: input.views } });
            const row = await tx.panelMirror.create({ data: { ownerId, tokenHash, views: input.views } });
            await tx.auditLog.create({ data: { action: 'PANEL_MIRROR_GENERATED', entityType: 'PanelMirror', entityId: row.id, userId: ownerId, details: { views: input.views, existingLinksUpdated: synchronized.count } } });
        });
        return { path: `/painel/espelho/${token}`, views: input.views };
    }

    async update(ownerId: string, input: PanelMirrorInput): Promise<PanelMirrorStatus> {
        const actor = await this.owner(ownerId);
        for (const view of input.views) this.require(actor, view);
        await this.prisma.$transaction(async tx => {
            const rows = await tx.panelMirror.findMany({ where: { ownerId, revokedAt: null }, orderBy: { updatedAt: 'desc' }, select: { id: true } });
            if (!rows.length) throw new NotFoundException('Nenhum link ativo para atualizar');
            const changed = await tx.panelMirror.updateMany({ where: { ownerId, revokedAt: null }, data: { views: input.views } });
            await tx.auditLog.create({ data: { action: 'PANEL_MIRROR_UPDATED', entityType: 'PanelMirror', entityId: rows[0].id, userId: ownerId, details: { views: input.views, linksUpdated: changed.count } } });
        });
        return this.status(ownerId);
    }

    async revoke(ownerId: string) {
        await this.owner(ownerId);
        await this.prisma.$transaction(async tx => {
            const rows = await tx.panelMirror.findMany({ where: { ownerId, revokedAt: null }, orderBy: { updatedAt: 'desc' }, select: { id: true } });
            if (!rows.length) return;
            const changed = await tx.panelMirror.updateMany({ where: { ownerId, revokedAt: null }, data: { revokedAt: new Date() } });
            if (changed.count) await tx.auditLog.create({ data: { action: 'PANEL_MIRROR_REVOKED', entityType: 'PanelMirror', entityId: rows[0].id, userId: ownerId, details: { linksRevoked: changed.count } } });
        });
    }

    async mirror(token: string): Promise<PanelActor> {
        const missing = () => new NotFoundException('Este espelho não está disponível. Solicite um novo link.');
        if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw missing();
        const row = await this.prisma.retry(() => this.prisma.panelMirror.findUnique({ where: { tokenHash: createHash('sha256').update(token).digest('hex') }, select: { ownerId: true, views: true, revokedAt: true } }));
        if (!row || row.revokedAt) throw missing();
        let owner: PanelActor;
        try {
            owner = await this.owner(row.ownerId);
        } catch (error) {
            if (error instanceof ForbiddenException) throw missing();
            throw error;
        }
        const actor = { ...owner, views: owner.views.filter(view => row.views.includes(view)) };
        if (!actor.views.length) throw missing();
        return actor;
    }
}
