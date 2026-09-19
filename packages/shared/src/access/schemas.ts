import { z } from 'zod';

export const createInternalUserSchema = z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    roleId: z.string().uuid('Role ID inválido'),
    sector: z.string().optional(),
    description: z.string().optional(),
});

export const updateInternalUserSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    roleId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
    sector: z.string().optional(),
    description: z.string().optional(),
    password: z.string().min(6).optional(),
});

export const createRoleSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
});

export const updateRoleSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
});

export const assignPermissionsSchema = z.object({
    permissionIds: z.array(z.string().uuid()),
});

export const createPermissionSchema = z.object({
    screen: z.string().min(1, 'Tela é obrigatória'),
    action: z.string().min(1, 'Ação é obrigatória'),
});
