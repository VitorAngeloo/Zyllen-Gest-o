import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export const loginExternalSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export const pinSchema = z.object({
    pin: z.string().length(4, 'PIN deve ter exatamente 4 dígitos').regex(/^\d{4}$/, 'PIN deve conter apenas números'),
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token é obrigatório'),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(6, 'Senha atual é obrigatória'),
    newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
});

export const resetPinSchema = z.object({
    password: z.string().min(6, 'Senha é obrigatória para resetar PIN'),
});

export const loginContractorSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});
