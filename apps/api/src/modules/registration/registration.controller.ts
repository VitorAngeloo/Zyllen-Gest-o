import {
    Controller, Post, Body, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { RegistrationService } from './registration.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import {
    registerClientSchema,
    registerContractorSchema,
    loginContractorSchema,
} from '@zyllen/shared';

@Controller('register')
export class RegistrationController {
    constructor(private readonly registrationService: RegistrationService) { }

    // ── Client self-registration (public) ──
    @Post('client')
    @UseGuards(ThrottlerGuard)
    @Throttle({ auth: { ttl: 60000, limit: 5 } })
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
        },
    ) {
        return this.registrationService.registerClient(body);
    }

    // ── Contractor self-registration (public) ──
    @Post('contractor')
    @UseGuards(ThrottlerGuard)
    @Throttle({ auth: { ttl: 60000, limit: 5 } })
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
    @Throttle({ auth: { ttl: 60000, limit: 5 } })
    async loginContractor(
        @Body(new ZodValidationPipe(loginContractorSchema)) body: { email: string; password: string },
    ) {
        return this.registrationService.loginContractor(body.email, body.password);
    }
}
