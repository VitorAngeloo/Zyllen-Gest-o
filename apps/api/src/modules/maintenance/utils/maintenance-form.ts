import { BadRequestException } from '@nestjs/common';
import type { OsFormType } from '@zyllen/shared';

export const FORM_DATA_MAX_BYTES = 64 * 1024;
const PNG_SIGNATURE = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;

const WITNESS_SIGNATURE_FORMS = new Set<OsFormType>([
    'INSTALACAO_SALA',
    'INSTALACAO_TELA',
    'DESINSTALACAO',
    'MANUTENCAO_TELA_SALA',
]);

function hasText(value: unknown): boolean {
    return typeof value === 'string' && value.trim().length > 0;
}

export function hasSignature(formData: Record<string, unknown>, key: string): boolean {
    return typeof formData[key] === 'string' && PNG_SIGNATURE.test(formData[key] as string);
}

export function validateFormData(formData: Record<string, unknown>): void {
    const size = Buffer.byteLength(JSON.stringify(formData), 'utf8');
    if (size > FORM_DATA_MAX_BYTES) {
        throw new BadRequestException(
            `formData excede o limite permitido de ${FORM_DATA_MAX_BYTES / 1024} KB`,
        );
    }

    for (const key of ['witnessSignature', 'technicianSignature']) {
        if (hasText(formData[key]) && !hasSignature(formData, key)) {
            throw new BadRequestException('Assinatura inválida. Capture novamente e confirme antes de salvar.');
        }
    }
}

export function assertRequiredSignaturesForClosing(
    formType: string,
    formData: Record<string, unknown>,
): void {
    if (WITNESS_SIGNATURE_FORMS.has(formType as OsFormType)) {
        const witnessIdentified = hasText(formData.witnessName) || hasText(formData.witnessDocument);
        if (witnessIdentified && !hasSignature(formData, 'witnessSignature')) {
            throw new BadRequestException('Confirme a assinatura de quem acompanhou antes de finalizar a OS.');
        }
    }

    if (formType === 'TERCEIRIZADO') {
        if (hasText(formData.localContactName) && !hasSignature(formData, 'witnessSignature')) {
            throw new BadRequestException('Confirme a assinatura de quem acompanhou antes de finalizar a OS.');
        }
        if (hasText(formData.technicianName) && !hasSignature(formData, 'technicianSignature')) {
            throw new BadRequestException('Confirme a assinatura do técnico antes de finalizar a OS.');
        }
    }
}
