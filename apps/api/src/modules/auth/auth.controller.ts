import {
    Controller,
    Post,
    Body,
    HttpCode,
    HttpStatus,
    UseGuards,
    Get,
    Request,
} from '@nestjs/common';
import { AuthService, TokenResponse } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { CreateInternalUserDto } from './dto/create-internal-user.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto): Promise<TokenResponse> {
        return this.authService.loginInternal(dto.email, dto.password);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Body() dto: RefreshTokenDto): Promise<{ accessToken: string }> {
        return this.authService.refresh(dto.refreshToken);
    }

    @Post('users')
    @UseGuards(JwtAuthGuard)
    async createUser(@Body() dto: CreateInternalUserDto) {
        const result = await this.authService.createInternalUser({
            name: dto.name,
            email: dto.email,
            password: dto.password,
            roleId: dto.roleId,
        });

        return {
            message: 'Usuário criado com sucesso. O PIN será exibido apenas uma vez.',
            data: result,
        };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async me(@Request() req: any) {
        return { data: req.user };
    }
}
