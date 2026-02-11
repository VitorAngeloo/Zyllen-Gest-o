import {
    Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) { }

    // ── External Login (no guard) ──
    @Post('login')
    @HttpCode(HttpStatus.OK)
    async loginExternal(@Body() body: { email: string; password: string }) {
        return this.clientsService.loginExternal(body.email, body.password);
    }

    // ── Companies (internal, guarded) ──
    @Get('companies')
    @UseGuards(JwtAuthGuard)
    async findAllCompanies() {
        const data = await this.clientsService.findAllCompanies();
        return { data };
    }

    @Get('companies/:id')
    @UseGuards(JwtAuthGuard)
    async findCompany(@Param('id') id: string) {
        const data = await this.clientsService.findCompanyById(id);
        return { data };
    }

    @Post('companies')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.view')
    async createCompany(@Body() body: { name: string; cnpj?: string; address?: string; phone?: string }) {
        const data = await this.clientsService.createCompany(body);
        return { data, message: 'Empresa criada com sucesso' };
    }

    @Put('companies/:id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.view')
    async updateCompany(@Param('id') id: string, @Body() body: { name?: string; cnpj?: string; address?: string; phone?: string }) {
        const data = await this.clientsService.updateCompany(id, body);
        return { data, message: 'Empresa atualizada' };
    }

    @Delete('companies/:id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.view')
    async deleteCompany(@Param('id') id: string) {
        await this.clientsService.deleteCompany(id);
        return { message: 'Empresa excluída' };
    }

    // ── External Users ──
    @Get('users')
    @UseGuards(JwtAuthGuard)
    async findAllExternalUsers(@Query('companyId') companyId?: string) {
        const data = await this.clientsService.findAllExternalUsers(companyId);
        return { data };
    }

    @Post('users')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.view')
    async createExternalUser(@Body() body: { name: string; email: string; password: string; companyId: string }) {
        const data = await this.clientsService.createExternalUser(body);
        return { data, message: 'Usuário externo criado' };
    }
}
