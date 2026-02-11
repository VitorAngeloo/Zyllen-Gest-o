import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermission } from './permissions.decorator';
import { AccessService } from './access.service';


@Controller('access')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccessController {
    constructor(private readonly accessService: AccessService) { }

    // ═══════════════════════════════════════════
    // ROLES
    // ═══════════════════════════════════════════

    @Get('roles')
    @RequirePermission('access.view')
    async findAllRoles() {
        const data = await this.accessService.findAllRoles();
        return { data };
    }

    @Get('roles/:id')
    @RequirePermission('access.view')
    async findRole(@Param('id') id: string) {
        const data = await this.accessService.findRoleById(id);
        return { data };
    }

    @Post('roles')
    @RequirePermission('access.manage_roles')
    async createRole(@Body() body: { name: string; description?: string }) {
        const data = await this.accessService.createRole(body);
        return { data, message: 'Role criada com sucesso' };
    }

    @Put('roles/:id')
    @RequirePermission('access.manage_roles')
    async updateRole(
        @Param('id') id: string,
        @Body() body: { name?: string; description?: string },
    ) {
        const data = await this.accessService.updateRole(id, body);
        return { data, message: 'Role atualizada com sucesso' };
    }

    @Delete('roles/:id')
    @RequirePermission('access.manage_roles')
    async deleteRole(@Param('id') id: string) {
        await this.accessService.deleteRole(id);
        return { message: 'Role excluída com sucesso' };
    }

    // ═══════════════════════════════════════════
    // PERMISSIONS
    // ═══════════════════════════════════════════

    @Get('permissions')
    @RequirePermission('access.view')
    async findAllPermissions() {
        const data = await this.accessService.findAllPermissions();
        return { data };
    }

    @Post('permissions')
    @RequirePermission('access.manage_permissions')
    async createPermission(@Body() body: { screen: string; action: string }) {
        const data = await this.accessService.createPermission(body);
        return { data, message: 'Permissão criada com sucesso' };
    }

    @Delete('permissions/:id')
    @RequirePermission('access.manage_permissions')
    async deletePermission(@Param('id') id: string) {
        await this.accessService.deletePermission(id);
        return { message: 'Permissão excluída com sucesso' };
    }

    // ═══════════════════════════════════════════
    // ROLE ↔ PERMISSION ASSIGNMENT
    // ═══════════════════════════════════════════

    @Post('roles/:id/permissions')
    @RequirePermission('access.manage_permissions')
    async assignPermissions(
        @Param('id') roleId: string,
        @Body() body: { permissionIds: string[] },
    ) {
        const data = await this.accessService.assignPermissionsToRole(
            roleId,
            body.permissionIds,
        );
        return { data, message: 'Permissões atualizadas com sucesso' };
    }
}
