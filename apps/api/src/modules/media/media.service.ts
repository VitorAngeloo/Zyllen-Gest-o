import { Injectable, ForbiddenException, NotFoundException, UnauthorizedException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { open } from 'fs/promises';
import { resolve, sep } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessService } from '../access/access.service';
import { isManager } from '../auth/manager.guard';
import { MaintenanceMediaStorageService } from '../maintenance/maintenance-media-storage.service';
import { detectMedia } from './media-storage';

export const MEDIA_KINDS = ['maintenance', 'os-followup', 'ticket', 'followup', 'item'] as const;
export type MediaKind = typeof MEDIA_KINDS[number];
export type MediaActor = { id: string; type: string; companyId?: string | null; role?: { name: string } };
const SESSION_COOKIE = 'zyllen_media';
const SESSION_SECONDS = 8 * 60 * 60;
const SHARE_SECONDS = 24 * 60 * 60;
type Resource = { id: string; fileName: string; filePath: string; kind: MediaKind; companyId?: string | null; ownerId?: string | null; internalOwnerId?: string | null; permission: string };

@Injectable()
export class MediaService {
    private readonly sessionKey: Buffer;
    private readonly uploadRoot: string;
    constructor(private readonly prisma: PrismaService, private readonly access: AccessService,
        private readonly storage: MaintenanceMediaStorageService, private readonly config: ConfigService) {
        this.sessionKey = createHmac('sha256', config.getOrThrow<string>('JWT_SECRET')).update('zyllen/media-session/v1').digest();
        this.uploadRoot = resolve(config.get<string>('MEDIA_UPLOAD_ROOT') || resolve(__dirname, '../../..', 'uploads'));
    }

    private mac(value: string) { return createHmac('sha256', this.sessionKey).update(value).digest(); }
    setSession(res: Response, user: MediaActor) {
        const payload = Buffer.from(JSON.stringify({ sub: user.id, type: user.type, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString('base64url');
        res.cookie(SESSION_COOKIE, `${payload}.${this.mac(payload).toString('base64url')}`, {
            httpOnly: true, secure: this.config.get('NODE_ENV') === 'production', sameSite: 'lax', path: '/media', maxAge: SESSION_SECONDS * 1000,
        });
        res.setHeader('Cache-Control', 'private, no-store');
    }
    clearSession(res: Response) {
        res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: this.config.get('NODE_ENV') === 'production', sameSite: 'lax', path: '/media' });
    }
    async actorFromSession(req: Request): Promise<MediaActor> {
        const token: unknown = req.cookies?.[SESSION_COOKIE];
        if (typeof token !== 'string' || token.length > 2000) throw new UnauthorizedException('Entre no sistema para visualizar anexos');
        const [payload, signature, extra] = token.split('.');
        const actual = Buffer.from(signature || '', 'base64url');
        const expected = this.mac(payload || '');
        if (extra || actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new UnauthorizedException();
        let value: { sub: string; type: string; exp: number };
        try { value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); }
        catch { throw new UnauthorizedException(); }
        if (!value || !Number.isFinite(value.exp) || value.exp <= Date.now() / 1000 || typeof value.sub !== 'string') throw new UnauthorizedException();
        return this.activeActor(value.sub, value.type);
    }
    private async activeActor(id: string, type: string): Promise<MediaActor> {
        if (type === 'internal') {
            const user = await this.prisma.internalUser.findUnique({ where: { id }, select: { id: true, isActive: true, role: { select: { name: true } } } });
            if (user?.isActive) return { id, type, role: user.role };
        } else if (type === 'external') {
            const user = await this.prisma.externalUser.findUnique({ where: { id }, select: { id: true, isActive: true, companyId: true } });
            if (user?.isActive) return { id, type, companyId: user.companyId };
        } else if (type === 'contractor') {
            const user = await this.prisma.contractorUser.findUnique({ where: { id }, select: { id: true, isActive: true } });
            if (user?.isActive) return { id, type };
        }
        throw new UnauthorizedException('Sessão de mídia inválida');
    }

    /** Only attachment DTOs are decorated. Raw disk/bucket paths never need to reach the browser. */
    decorate(value: any, route: string): any {
        if (!value || typeof value !== 'object' || value instanceof Date || Buffer.isBuffer(value)) return value;
        if (Array.isArray(value)) return value.map(v => this.decorate(v, route));
        // Preserve Decimal and other classes' JSON serialization; never rewrite signed form/audit blobs.
        if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) return value;
        const result = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, ['formData', 'details'].includes(key) ? child : this.decorate(child, route)]));
        if (typeof value.id !== 'string' || typeof value.filePath !== 'string' || typeof value.fileName !== 'string') return result;
        let kind: MediaKind | undefined;
        if ('maintenanceOSId' in value) kind = 'maintenance';
        else if ('ticketId' in value) kind = 'ticket';
        else if ('blockId' in value) kind = route.includes('maintenance') ? 'os-followup' : 'followup';
        else if ('skuId' in value || 'stockMovementId' in value || ['IMAGE', 'VIDEO'].includes(value.mediaType)) kind = 'item';
        if (kind) {
            result.mediaKind = kind;
            result.filePath = result.fileUrl = `/media/${kind}/${encodeURIComponent(value.id)}/file`;
        }
        return result;
    }

    async resource(kind: string, id: string): Promise<Resource> {
        if (kind === 'maintenance') {
            const att = await this.prisma.maintenanceAttachment.findUnique({ where: { id }, include: { maintenanceOS: true } });
            if (att) return { ...att, kind, companyId: att.maintenanceOS.companyId, ownerId: att.maintenanceOS.openedByContractorId, permission: 'maintenance' };
        } else if (kind === 'os-followup') {
            const att = await this.prisma.maintenanceOSFollowupAttachment.findUnique({ where: { id }, include: { block: { include: { maintenanceOS: true } } } });
            if (att) return { ...att, kind, companyId: att.block.maintenanceOS.companyId, ownerId: att.block.maintenanceOS.openedByContractorId, permission: 'maintenance' };
        } else if (kind === 'ticket') {
            const att = await this.prisma.ticketAttachment.findUnique({ where: { id }, include: { ticket: true } });
            if (att) return { ...att, kind, companyId: att.ticket.companyId, ownerId: att.ticket.externalUserId, internalOwnerId: att.ticket.source === 'INTERNAL' ? att.ticket.internalUserId : null, permission: 'tickets' };
        } else if (kind === 'followup') {
            const att = await this.prisma.followupBlockAttachment.findUnique({ where: { id }, include: { block: { include: { followup: true } } } });
            if (att) return { ...att, kind, companyId: att.block.followup.companyId, permission: 'followups' };
        } else if (kind === 'item') {
            const att = await this.prisma.itemMediaAttachment.findUnique({ where: { id } });
            if (att) return { ...att, kind, permission: att.filePath.startsWith('/uploads/media/catalog/') ? 'catalog' : 'inventory' };
        }
        throw new NotFoundException('Anexo não encontrado');
    }
    async authorize(actor: MediaActor, resource: Resource) {
        let allowed = false;
        if (actor.type === 'internal') allowed = actor.role?.name === 'Administrador' ||
            (resource.kind === 'ticket' && resource.internalOwnerId === actor.id) ||
            await this.access.userHasPermission(actor.id, resource.permission, 'view') ||
            (resource.kind === 'item' && await this.access.userHasPermission(actor.id, resource.permission === 'catalog' ? 'inventory' : 'catalog', 'view'));
        else if (actor.type === 'external') allowed = resource.kind === 'ticket' ? resource.ownerId === actor.id : resource.kind !== 'item' && !!actor.companyId && resource.companyId === actor.companyId;
        else if (actor.type === 'contractor') allowed = ['maintenance', 'os-followup'].includes(resource.kind) && resource.ownerId === actor.id;
        if (!allowed) throw new ForbiddenException('Sem acesso a este anexo');
    }
    async createShare(actor: MediaActor, kind: string, id: string) {
        if (!isManager(actor)) throw new ForbiddenException('Somente Administrador e Gestor podem compartilhar anexos');
        await this.authorize(actor, await this.resource(kind, id));
        const token = randomBytes(32).toString('base64url');
        const expiresAt = new Date(Date.now() + SHARE_SECONDS * 1000);
        const link = await this.prisma.$transaction(async tx => {
            const created = await tx.mediaShareLink.create({ data: { kind, attachmentId: id, createdById: actor.id, expiresAt, tokenHash: createHash('sha256').update(token).digest('hex') } });
            await tx.auditLog.create({ data: { action: 'MEDIA_SHARED', entityType: 'MediaShareLink', entityId: created.id, userId: actor.id, details: { kind, attachmentId: id, expiresAt: expiresAt.toISOString() } } });
            return created;
        });
        return { id: link.id, expiresAt, url: `/media/shared/${token}` };
    }
    async listShares(actor: MediaActor, kind: string, id: string) {
        if (!isManager(actor)) throw new ForbiddenException();
        await this.authorize(actor, await this.resource(kind, id));
        return this.prisma.mediaShareLink.findMany({ where: { kind, attachmentId: id }, orderBy: { createdAt: 'desc' }, take: 100,
            select: { id: true, createdAt: true, expiresAt: true, revokedAt: true, createdById: true } });
    }
    async revokeShare(actor: MediaActor, id: string) {
        if (!isManager(actor)) throw new ForbiddenException();
        const link = await this.prisma.mediaShareLink.findUnique({ where: { id } });
        if (!link) throw new NotFoundException();
        await this.authorize(actor, await this.resource(link.kind, link.attachmentId));
        await this.prisma.$transaction(async tx => {
            await tx.mediaShareLink.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date() } });
            await tx.auditLog.create({ data: { action: 'MEDIA_SHARE_REVOKED', entityType: 'MediaShareLink', entityId: id, userId: actor.id } });
        });
    }
    async sharedResource(token: string) {
        if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new NotFoundException('Link inválido ou expirado');
        const link = await this.prisma.mediaShareLink.findUnique({ where: { tokenHash: createHash('sha256').update(token).digest('hex') } });
        if (!link || link.revokedAt || link.expiresAt <= new Date()) throw new NotFoundException('Link inválido ou expirado');
        const creator = await this.activeActor(link.createdById, 'internal');
        if (!isManager(creator)) throw new NotFoundException('Link indisponível');
        const resource = await this.resource(link.kind, link.attachmentId);
        await this.authorize(creator, resource);
        return resource;
    }
    private localPath(resource: Resource) {
        const relative = resource.filePath.startsWith('/uploads/') ? resource.filePath.slice('/uploads/'.length)
            : `${resource.kind === 'followup' ? 'followups' : 'maintenance'}/${resource.filePath}`;
        const target = resolve(this.uploadRoot, relative);
        if (!target.startsWith(this.uploadRoot + sep)) throw new BadRequestException('Caminho de anexo inválido');
        return target;
    }
    private headers(res: Response, resource: Resource, header: Buffer) {
        const media = detectMedia(header);
        res.setHeader('Content-Type', media?.mime ?? 'application/octet-stream');
        res.setHeader('Content-Disposition', `${media && media.mime !== 'application/pdf' ? 'inline' : 'attachment'}; filename="anexo${media?.ext ?? '.bin'}"; filename*=UTF-8''${encodeURIComponent(resource.fileName.replace(/[\r\n\x00-\x1f]/g, ''))}`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox; frame-ancestors 'none'");
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    }
    async serve(resource: Resource, req: Request, res: Response) {
        if (!resource.filePath.startsWith('supabase:')) {
            const target = this.localPath(resource);
            const file = await open(target, 'r').catch(() => { throw new NotFoundException('Arquivo indisponível'); });
            const header = Buffer.alloc(4096);
            try { const { bytesRead } = await file.read(header, 0, 4096, 0); this.headers(res, resource, header.subarray(0, bytesRead)); }
            finally { await file.close(); }
            return new Promise<void>((done, reject) => res.sendFile(target, { cacheControl: false, lastModified: false }, error => error ? reject(error) : done()));
        }
        const source = await this.storage.resolveServeSource(resource.filePath, this.uploadRoot);
        if (source.type !== 'redirect') throw new ServiceUnavailableException();
        // Proxy the bytes, never expose the storage URL: revocation is checked on every new request/range.
        const controller = new AbortController();
        res.once('close', () => controller.abort());
        const head = await fetch(source.url, { headers: { Range: 'bytes=0-4095' }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]) });
        if (!head.ok) throw new NotFoundException('Arquivo indisponível');
        const reader = head.body?.getReader();
        const chunks: Buffer[] = [];
        let length = 0;
        if (reader) { try { while (length < 4096) { const next = await reader.read(); if (next.done) break; const part = Buffer.from(next.value).subarray(0, 4096 - length); chunks.push(part); length += part.length; } } finally { await reader.cancel(); } }
        this.headers(res, resource, Buffer.concat(chunks));
        const range = req.headers.range;
        if (range && !/^bytes=\d*-\d*$/.test(range)) throw new BadRequestException('Range inválido');
        const upstream = await fetch(source.url, { headers: range ? { Range: range } : {}, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(120_000)]) });
        if (upstream.status === 416) { res.status(416).end(); return; }
        if (!upstream.ok || !upstream.body) throw new ServiceUnavailableException('Falha ao ler o anexo');
        res.status(upstream.status);
        for (const name of ['content-length', 'content-range', 'accept-ranges']) { const value = upstream.headers.get(name); if (value) res.setHeader(name, value); }
        await pipeline(Readable.fromWeb(upstream.body as any), res);
    }
}
