import {
    Controller, Post, Get, Param, Query, Request, Body, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { RegistrationService } from './registration.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ManagerGuard } from '../auth/manager.guard';
import {
    registerClientSchema,
    registerContractorSchema,
    loginContractorSchema,
} from '@zyllen/shared';

@Controller('register')
export class RegistrationController {
    constructor(private readonly registrationService: RegistrationService) { }

    @Get('client-requests')
    @UseGuards(JwtAuthGuard, ManagerGuard)
    async listClientRequests(@Query(new ZodValidationPipe(z.object({
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
        page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50),
    }))) query: { status: 'PENDING' | 'APPROVED' | 'REJECTED'; page: number; limit: number }) {
        return { ...await this.registrationService.listClientRequests(query.status, (query.page - 1) * query.limit, query.limit), page: query.page, limit: query.limit };
    }

    @Post('client-requests/:id/approve')
    @UseGuards(JwtAuthGuard, ManagerGuard)
    async approveClient(@Param('id') id: string, @Request() req: any,
        @Body(new ZodValidationPipe(z.object({
            companyId: z.string().uuid().optional(), projectId: z.string().uuid().optional(),
            companyName: z.string().trim().min(2).max(200).optional(), companyCnpj: z.string().max(30).optional(),
        }).strict())) body: { companyId?: string; projectId?: string; companyName?: string; companyCnpj?: string }) {
        return this.registrationService.approveClient(id, req.user.id, body);
    }

    @Post('client-requests/:id/reject')
    @UseGuards(JwtAuthGuard, ManagerGuard)
    async rejectClient(@Param('id') id: string, @Request() req: any,
        @Body(new ZodValidationPipe(z.object({ reason: z.string().trim().min(3).max(500) }).strict())) body: { reason: string }) {
        return this.registrationService.rejectClient(id, req.user.id, body.reason);
    }

    // ── Client self-registration (public) ──
    @Post('client')
    @UseGuards(ThrottlerGuard)
    @Throttle({ auth: { ttl: 60000, limit: 30 } })
    async registerClient(
        @Body(new ZodValidationPipe(registerClientSchema)) body: {
            name: string;
            email: string;
            password: string;
            phone?: string;
            city?: string;
            state?: string;
            position?: string;
            cpf?: string;
            companyName?: string;
            companyId?: string;
            companyCnpj?: string;
            projectId?: string;
        },
    ) {
        return this.registrationService.registerClient(body);
    }

    // ── Contractor self-registration (public) ──
    @Post('contractor')
    @UseGuards(ThrottlerGuard)
    @Throttle({ auth: { ttl: 60000, limit: 30 } })
    async registerContractor(
        @Body(new ZodValidationPipe(registerContractorSchema)) body: {
            name: string;
            email: string;
            password: string;
            phone?: string;
            city?: string;
            state?: string;
            cpf?: string;
        },
    ) {
        return this.registrationService.registerContractor(body);
    }

    // ── Contractor login (public) ──
    @Post('contractor/login')
    @HttpCode(HttpStatus.OK)
    @UseGuards(ThrottlerGuard)
    @Throttle({ auth: { ttl: 60000, limit: 30 } })
    async loginContractor(
        @Body(new ZodValidationPipe(loginContractorSchema)) body: { email: string; password: string },
    ) {
        return this.registrationService.loginContractor(body.email, body.password);
    }
}
