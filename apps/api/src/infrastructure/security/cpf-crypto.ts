import { createCipheriv, createDecipheriv, createHmac } from 'crypto';

const ALGORITHM = 'aes-256-cbc';

function getKey(): Buffer {
    const key = process.env.CPF_ENCRYPTION_KEY;
    if (!key || key.length !== 64) {
        throw new Error('CPF_ENCRYPTION_KEY inválida: deve ter 64 caracteres hex (32 bytes)');
    }
    return Buffer.from(key, 'hex');
}

// IV determinístico via HMAC — mesmo CPF sempre gera mesmo ciphertext, mantendo @unique
function deterministicIv(key: Buffer, value: string): Buffer {
    return createHmac('sha256', key).update(value).digest().subarray(0, 16);
}

export function encryptCPF(cpf: string): string {
    const key = getKey();
    const iv = deterministicIv(key, cpf);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    return iv.toString('hex') + ':' + cipher.update(cpf, 'utf8', 'hex') + cipher.final('hex');
}

export function decryptCPF(encrypted: string): string {
    const colonIdx = encrypted.indexOf(':');
    const ivHex = encrypted.slice(0, colonIdx);
    const data = encrypted.slice(colonIdx + 1);
    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
}

// Retorna null em vez de lançar — usado em leituras onde CPF é opcional
export function decryptCPFSafe(value: string | null | undefined): string | null {
    if (!value) return null;
    try { return decryptCPF(value); } catch { return null; }
}
