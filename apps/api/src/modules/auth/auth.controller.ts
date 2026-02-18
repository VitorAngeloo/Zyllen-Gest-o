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
    BadRequestException,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService, TokenResponse } from './auth.service';
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
    async login(@Body() dto: LoginDto): Promise<TokenResponse> {
        return this.authService.loginInternal(dto.email, dto.password);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @UseGuards(ThrottlerGuard)
    @Throttle({ auth: { ttl: 60000, limit: 10 } })
    async refresh(@Body() dto: RefreshTokenDto): Promise<{ accessToken: string }> {
        return this.authService.refresh(dto.refreshToken);
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
            pin: dto.pin,
        });

        return {
            message: 'Usuário criado com sucesso. O PIN será exibido apenas uma vez.',
            data: result,
        };
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
            sector?: string; description?: string; password?: string; pin?: string;
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

    @Post('users/:id/reset-pin')
    @UseGuards(JwtAuthGuard, PermissionsGuard)
    @RequirePermission('access.manage')
    @HttpCode(HttpStatus.OK)
    async resetPin(@Param('id') id: string) {
        const data = await this.authService.resetPin(id);
        return { data, message: 'PIN resetado. O novo PIN será exibido apenas uma vez.' };
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
        @Body() body: { name?: string; currentPassword?: string; password?: string; pin?: string },
    ) {
        // Require current password when changing password or PIN
        if ((body.password || body.pin) && !body.currentPassword) {
            throw new BadRequestException(
                'Senha atual é obrigatória para alterar senha ou PIN',
            );
        }
        if (body.currentPassword) {
            await this.authService.verifyCurrentPassword(req.user.id, body.currentPassword);
        }

        // Users can only update their own name, password, and PIN
        const allowed: any = {};
        if (body.name) allowed.name = body.name;
        if (body.password) allowed.password = body.password;
        if (body.pin) allowed.pin = body.pin;
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
}
