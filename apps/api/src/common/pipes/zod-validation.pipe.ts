import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
    constructor(private schema: ZodSchema) { }

    transform(value: unknown, _metadata: ArgumentMetadata) {
        try {
            return this.schema.parse(value);
        } catch (error) {
            if (error instanceof ZodError) {
                const messages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
                throw new BadRequestException({
                    message: 'Erro de validação',
                    errors: messages,
                });
            }
            throw new BadRequestException('Erro de validação');
        }
    }
}
