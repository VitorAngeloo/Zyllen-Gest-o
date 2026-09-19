/** Startup validation never includes secret values in errors. */
export function validateSecurityConfig(config: Record<string, unknown>) {
    const secret = String(config.JWT_SECRET ?? '');
    if (secret.length < 64 || /(change.?me|your.?secret|replace.?me|example|placeholder)/i.test(secret) || new Set(secret).size < 12) {
        throw new Error('JWT_SECRET deve ser um segredo aleatório exclusivo, com pelo menos 64 caracteres, sem defaults públicos.');
    }
    if (String(config.SUPABASE_OS_MEDIA_BUCKET_PUBLIC ?? 'false').toLowerCase() === 'true') {
        throw new Error('O bucket de anexos precisa ser privado. Desative SUPABASE_OS_MEDIA_BUCKET_PUBLIC e confira a política do bucket antes do deploy.');
    }
    if (!!config.SUPABASE_URL !== !!config.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em conjunto, ou deixe ambas ausentes para armazenamento local.');
    }
    return config;
}
