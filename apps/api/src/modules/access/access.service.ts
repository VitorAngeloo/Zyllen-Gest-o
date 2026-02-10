import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccessService {
    constructor(private readonly prisma: PrismaService) { }

    // ═══════════════════════════════════════════
    // ROLES
    // ═══════════════════════════════════════════

    async findAllRoles() {
        return this.prisma.role.findMany({
            include: {
                permissions: {
                    include: { screenPermission: true },
                },
                _count: { select: { users: true } },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findRoleById(id: string) {
        const role = await this.prisma.role.findUnique({
            where: { id },
            include: {
                permissions: {
                    include: { screenPermission: true },
                },
                users: {
                    select: { id: true, name: true, email: true, isActive: true },
                },
            },
        });

        if (!role) throw new NotFoundException('Role não encontrada');
        return role;
    }

    async createRole(data: { name: string; description?: string }) {
        const existing = await this.prisma.role.findUnique({
            where: { name: data.name },
        });
        if (existing) throw new ConflictException('Role com este nome já existe');

        return this.prisma.role.create({ data });
    }

    async updateRole(id: string, data: { name?: string; description?: string }) {
        await this.findRoleById(id);

        if (data.name) {
            const existing = await this.prisma.role.findFirst({
                where: { name: data.name, NOT: { id } },
            });
            if (existing) throw new ConflictException('Role com este nome já existe');
        }

        return this.prisma.role.update({
            where: { id },
            data,
        });
    }

    async deleteRole(id: string) {
        const role = await this.findRoleById(id);
        if (role.users.length > 0) {
            throw new ConflictException(
                'Não é possível excluir role com usuários vinculados',
            );
        }

        await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
        return this.prisma.role.delete({ where: { id } });
    }

    // ═══════════════════════════════════════════
    // SCREEN PERMISSIONS
    // ═══════════════════════════════════════════

    async findAllPermissions() {
        return this.prisma.screenPermission.findMany({
            orderBy: [{ screen: 'asc' }, { action: 'asc' }],
        });
    }

    async createPermission(data: { screen: string; action: string }) {
        const existing = await this.prisma.screenPermission.findUnique({
            where: { screen_action: { screen: data.screen, action: data.action } },
        });
        if (existing) throw new ConflictException('Permissão já existe');

        return this.prisma.screenPermission.create({ data });
    }

    async deletePermission(id: string) {
        await this.prisma.rolePermission.deleteMany({
            where: { screenPermissionId: id },
        });
        return this.prisma.screenPermission.delete({ where: { id } });
    }

    // ═══════════════════════════════════════════
    // ROLE ↔ PERMISSION ASSIGNMENT
    // ═══════════════════════════════════════════

    async assignPermissionsToRole(
        roleId: string,
        permissionIds: string[],
    ) {
        await this.findRoleById(roleId);

        // Remove all existing and re-assign
        await this.prisma.rolePermission.deleteMany({ where: { roleId } });

        const assignments = permissionIds.map((screenPermissionId) => ({
            roleId,
            screenPermissionId,
        }));

        await this.prisma.rolePermission.createMany({ data: assignments });

        return this.findRoleById(roleId);
    }

    // ═══════════════════════════════════════════
    // PERMISSION CHECK (used by guard)
    // ═══════════════════════════════════════════

    async userHasPermission(
        userId: string,
        screen: string,
        action: string,
    ): Promise<boolean> {
        const user = await this.prisma.internalUser.findUnique({
            where: { id: userId },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { screenPermission: true },
                        },
                    },
                },
            },
        });

        if (!user) return false;

        return user.role.permissions.some(
            (rp) =>
                rp.screenPermission.screen === screen &&
                rp.screenPermission.action === action,
        );
    }

    async getUserPermissions(userId: string): Promise<string[]> {
        const user = await this.prisma.internalUser.findUnique({
            where: { id: userId },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { screenPermission: true },
                        },
                    },
                },
            },
        });

        if (!user) return [];

        return user.role.permissions.map(
            (rp) => `${rp.screenPermission.screen}.${rp.screenPermission.action}`,
        );
    }
}
