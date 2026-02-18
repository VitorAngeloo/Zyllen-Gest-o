import {
    Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { ClientsService } from './clients.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import {
    loginExternalSchema,
    createCompanySchema,
    updateCompanySchema,
    createExternalUserSchema,
    updateContractorSchema,
} from '@zyllen/shared';

@Controller('clients')
export class ClientsController {
    constructor(private readonly clientsService: ClientsService) { }

    // ── External Login (no guard) ──
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @UseGuards(ThrottlerGuard)
    @Throttle({ auth: { ttl: 60000, limit: 5 } })
    async loginExternal(@Body(new ZodValidationPipe(loginExternalSchema)) body: { email: string; password: string }) {
        return this.clientsService.loginExternal(body.email, body.password);
    }

    // ── Company search (public - for registration form, rate-limited) ──
    @Get('companies/search')
    @UseGuards(ThrottlerGuard)
    @Throttle({ auth: { ttl: 60000, limit: 10 } })
    async searchCompanies(@Query('q') query?: string) {
        const data = await this.clientsService.searchCompanies(query);
        return { data };
    }

    // ── Contractors (internal, guarded) ──
    @Get('contractors')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.view')
    async findAllContractors() {
        const data = await this.clientsService.findAllContractors();
        return { data };
    }

    @Put('contractors/:id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.manage')
    async updateContractor(@Param('id') id: string, @Body(new ZodValidationPipe(updateContractorSchema)) body: { isActive?: boolean }) {
        const data = await this.clientsService.updateContractor(id, body);
        return { data, message: 'Terceirizado atualizado' };
    }

    @Delete('contractors/:id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.manage')
    async deleteContractor(@Param('id') id: string) {
        await this.clientsService.deleteContractor(id);
        return { message: 'Terceirizado excluído com sucesso' };
    }

    // ── Companies (internal, guarded) ──
    @Get('companies')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.view')
    async findAllCompanies() {
        const data = await this.clientsService.findAllCompanies();
        return { data };
    }

    @Get('companies/:id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.view')
    async findCompany(@Param('id') id: string) {
        const data = await this.clientsService.findCompanyById(id);
        return { data };
    }

    @Post('companies')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.manage')
    async createCompany(@Body(new ZodValidationPipe(createCompanySchema)) body: { name: string; cnpj?: string; address?: string; phone?: string }) {
        const data = await this.clientsService.createCompany(body);
        return { data, message: 'Empresa criada com sucesso' };
    }

    @Put('companies/:id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.manage')
    async updateCompany(@Param('id') id: string, @Body(new ZodValidationPipe(updateCompanySchema)) body: { name?: string; cnpj?: string; address?: string; phone?: string }) {
        const data = await this.clientsService.updateCompany(id, body);
        return { data, message: 'Empresa atualizada' };
    }

    @Delete('companies/:id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.manage')
    async deleteCompany(@Param('id') id: string) {
        await this.clientsService.deleteCompany(id);
        return { message: 'Empresa excluída' };
    }

    // ── External Users ──
    @Get('users')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.view')
    async findAllExternalUsers(@Query('companyId') companyId?: string) {
        const data = await this.clientsService.findAllExternalUsers(companyId);
        return { data };
    }

    @Post('users')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('settings.manage')
    async createExternalUser(@Body(new ZodValidationPipe(createExternalUserSchema)) body: { name: string; email: string; password: string; companyId: string }) {
        const data = await this.clientsService.createExternalUser(body);
        return { data, message: 'Usuário externo criado' };
    }
}
