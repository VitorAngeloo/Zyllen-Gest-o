import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Erro interno do servidor';
        let details: unknown;

        if (exception instanceof HttpException) {
            statusCode = exception.getStatus();
            const body = exception.getResponse();

            if (typeof body === 'string') {
                message = body;
            } else if (typeof body === 'object' && body !== null) {
                const r = body as Record<string, unknown>;
                // Array messages come from class-validator
                if (Array.isArray(r.message)) {
                    message = 'Erro de validação';
                    details = r.message;
                } else {
                    message = (r.message as string) ?? message;
                    // ZodValidationPipe sends { message, errors: [] }
                    if (r.errors) details = r.errors;
                }
            }

            // Friendly message for rate-limit errors
            if (statusCode === 429) {
                message = 'Muitas requisições. Aguarde um momento e tente novamente.';
            }
        } else if (exception instanceof Error) {
            this.logger.error(exception.message, exception.stack);
        } else {
            this.logger.error('Exceção desconhecida', String(exception));
        }

        response.status(statusCode).json({
            success: false,
            error: {
                statusCode,
                message,
                ...(details !== undefined ? { details } : {}),
            },
        });
    }
}
