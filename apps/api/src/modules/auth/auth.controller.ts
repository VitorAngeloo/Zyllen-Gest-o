import {
    Controller,
    Post,
    Put,
    Delete,
    Body,
    Param,
    HttpCode,
    HttpStatus,
    UseGuards,
    Get,
    Request,
    Req,
    Res,
    BadRequestException,
    UnauthorizedException,
} from '@nestjs/common';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ValidatePinDto } from './dto/validate-pin.dto';
import { AccessService } from '../access/access.service';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { updateInternalUserSchema } from '@zyllen/shared';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly accessService: AccessService,
    ) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @UseGuards(ThrottlerGuard)
    @Throttle({ auth: { ttl: 60000, limit: 5 } })
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) res: ExpressResponse,
    ) {
        const result = await this.authService.loginInternal(dto.email, dto.password);

        // Store refresh token in httpOnly cookie — XSS cannot read it
        res.cookie('refresh_token', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/auth/refresh',
        });

        return result; // Still returns refreshToken in body for backwards compatibility
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @UseGuards(ThrottlerGuard)
    @Throttle({ auth: { ttl: 60000, limit: 10 } })
    async refresh(
        @Body() dto: RefreshTokenDto,
        @Req() req: ExpressRequest,
    ): Promise<{ accessToken: string }> {
        // Prefer httpOnly cookie; fall back to body for existing clients
        const token = (req.cookies as Record<string, string>)?.refresh_token ?? dto.refreshToken;
        if (!token) throw new UnauthorizedException('Refresh token não fornecido');
        return this.authService.refresh(token);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(@Res({ passthrough: true }) res: ExpressResponse) {
        res.clearCookie('refresh_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/auth/refresh',
        });
        return { message: 'Logout realizado com sucesso' };
    }

    @Post('users')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('access.manage')
    async createUser(@Body() dto: CreateInternalUserDto) {
        const result = await this.authService.createInternalUser({
            name: dto.name,
            email: dto.email,
            password: dto.password,
            roleId: dto.roleId,
            sector: dto.sector,
            description: dto.description,
        });

        return {
            message: 'Usuário criado com sucesso. O colaborador definirá o PIN no primeiro acesso.',
            data: result,
        };
    }

    @Post('setup-pin')
    @UseGuards(ThrottlerGuard, JwtAuthGuard)
    @Throttle({ auth: { ttl: 60_000, limit: 5 } })
    @HttpCode(HttpStatus.OK)
    async setupPin(@Request() req: any, @Body() dto: ValidatePinDto) {
        await this.authService.setupPin(req.user.id, dto.pin);
        return { message: 'PIN definido com sucesso' };
    }

    @Get('has-pin')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async hasPin(@Request() req: any) {
        const hasPin = await this.authService.hasPin(req.user.id);
        return { hasPin };
    }

    @Get('users')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('access.view')
    async listUsers() {
        const data = await this.authService.findAllInternalUsers();
        return { data };
    }

    @Get('users/:id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('access.view')
    async getUserDetail(@Param('id') id: string) {
        const data = await this.authService.findInternalUserById(id);
        return { data };
    }

    @Put('users/:id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('access.manage')
    async updateUser(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(updateInternalUserSchema)) body: {
            name?: string; email?: string; roleId?: string; isActive?: boolean;
            sector?: string; description?: string; password?: string;
        },
    ) {
        const data = await this.authService.updateInternalUser(id, body);
        return { data, message: 'Usuário atualizado' };
    }

    @Delete('users/:id')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('access.manage')
    async deleteUser(@Param('id') id: string, @Request() req: any) {
        await this.authService.deleteInternalUser(id, req.user.id);
        return { message: 'Usuário excluído com sucesso' };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async me(@Request() req: any) {
        return { data: req.user };
    }

    @Get('me/profile')
    @UseGuards(JwtAuthGuard)
    async myProfile(@Request() req: any) {
        if (req.user.type !== 'internal') {
            return { data: { ...req.user, permissions: [], activity: { assignedTickets: [], maintenanceOpened: [], maintenanceClosed: [], auditLogs: [] } } };
        }
        const user = await this.authService.findInternalUserById(req.user.id);
        const permissions = await this.accessService.getUserPermissions(req.user.id);
        return { data: { ...user, permissions } };
    }

    @Put('me/profile')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async updateMyProfile(
        @Request() req: any,
        @Body() dto: UpdateMyProfileDto,
    ) {
        if (dto.password && !dto.currentPassword) {
            throw new BadRequestException(
                'Senha atual é obrigatória para alterar senha',
            );
        }
        if (dto.currentPassword) {
            await this.authService.verifyCurrentPassword(req.user.id, dto.currentPassword);
        }

        const allowed: { name?: string; password?: string } = {};
        if (dto.name) allowed.name = dto.name;
        if (dto.password) allowed.password = dto.password;
        const data = await this.authService.updateInternalUser(req.user.id, allowed);
        return { data, message: 'Perfil atualizado' };
    }

    @Get('me/permissions')
    @UseGuards(JwtAuthGuard)
    async myPermissions(@Request() req: any) {
        const permissions = await this.accessService.getUserPermissions(req.user.id);
        return { data: permissions };
    }

    @Post('validate-pin')
    @UseGuards(ThrottlerGuard, JwtAuthGuard)
    @Throttle({ auth: { ttl: 60000, limit: 10 } })
    @HttpCode(HttpStatus.OK)
    async validatePin(@Request() req: any, @Body() dto: ValidatePinDto) {
        const valid = await this.authService.validatePin(req.user.id, dto.pin);
        return { valid };
    }

    @Post('users/:id/reset-pin')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('access.manage')
    @HttpCode(HttpStatus.OK)
    async resetPin(@Param('id') id: string) {
        const data = await this.authService.resetPin(id);
        return { data, message: 'PIN resetado com sucesso' };
    }
}
