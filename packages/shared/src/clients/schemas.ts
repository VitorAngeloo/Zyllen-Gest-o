import { z } from 'zod';

export const createExternalUserSchema = z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirmação de senha é obrigatória'),
    cpf: z.string().min(11, 'CPF inválido').optional(),
    phone: z.string().min(8, 'Telefone inválido').optional(),
    position: z.string().min(2, 'Cargo/função é obrigatório').optional(),
    city: z.string().min(2, 'Cidade é obrigatória').optional(),
    state: z.string().length(2, 'Estado deve ser a sigla (UF)').optional(),
    companyId: z.string().uuid('Company ID inválido'),
    projectId: z.string().uuid('Project ID inválido').optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
});

export const createCompanySchema = z.object({
    name: z.string().min(2, 'Razão Social deve ter no mínimo 2 caracteres'),
    cnpj: z.string().optional(),
});

export const updateCompanySchema = z.object({
    name: z.string().min(2).optional(),
    cnpj: z.string().optional(),
});

export const createProjectSchema = z.object({
    name: z.string().min(2, 'Nome do projeto/estande deve ter no mínimo 2 caracteres'),
    description: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().length(2, 'Estado deve ser a sigla (UF)').optional(),
});

export const updateProjectSchema = z.object({
    name: z.string().min(2, 'Nome do projeto/estande deve ter no mínimo 2 caracteres').optional(),
    description: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().length(2, 'Estado deve ser a sigla (UF)').optional(),
});
