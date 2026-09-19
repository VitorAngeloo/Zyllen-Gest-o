import { BadRequestException } from '@nestjs/common';

export const FORM_DATA_MAX_BYTES = 64 * 1024;

export function validateFormData(formData: Record<string, unknown>): void {
    const size = Buffer.byteLength(JSON.stringify(formData), 'utf8');
    if (size > FORM_DATA_MAX_BYTES) {
        throw new BadRequestException(
            `formData excede o limite permitido de ${FORM_DATA_MAX_BYTES / 1024} KB`,
        );
    }
}
