import { z } from 'zod';

export const registerClientSchema = z.object({
    name: z.string().min(2, 'Nome completo é obrigatório'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    cpf: z.string().min(11, 'CPF inválido').optional(),
    phone: z.string().min(8, 'Telefone inválido').optional(),
    city: z.string().min(2, 'Cidade é obrigatória').optional(),
    state: z.string().length(2, 'Estado deve ser a sigla (UF)').optional(),
    position: z.string().min(2, 'Cargo/função é obrigatório').optional(),
    companyId: z.string().uuid('Company ID inválido').optional(),
    companyName: z.string().min(2, 'Nome da empresa é obrigatório').optional(),
    companyCnpj: z.string().optional(),
    projectId: z.string().uuid('Project ID inválido').optional(),
});

export const registerContractorSchema = z.object({
    name: z.string().min(2, 'Nome completo é obrigatório'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    cpf: z.string().min(11, 'CPF inválido'),
    phone: z.string().min(8, 'Telefone inválido').optional(),
    city: z.string().min(2, 'Cidade é obrigatória').optional(),
    state: z.string().length(2, 'Estado deve ser a sigla (UF)').optional(),
});
