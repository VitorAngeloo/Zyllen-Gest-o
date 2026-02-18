// ============================================
// Zyllen Gestão — OS Form Type Definitions
// ============================================

export const OS_FORM_TYPES = [
    'TERCEIRIZADO',
    'INSTALACAO_SALA',
    'INSTALACAO_TELA',
    'DESINSTALACAO',
    'SUPORTE_REMOTO',
    'MANUTENCAO_TELA_SALA',
] as const;

export type OsFormType = (typeof OS_FORM_TYPES)[number];

export interface OsFormTypeConfig {
    key: OsFormType;
    label: string;
    shortLabel: string;
    description: string;
    icon: string; // lucide icon name
    requiresAsset: boolean;
    requiresClient: boolean;
    requiresSchedule: boolean;
}

export const OS_FORM_CONFIG: Record<OsFormType, OsFormTypeConfig> = {
    TERCEIRIZADO: {
        key: 'TERCEIRIZADO',
        label: 'Formulário de Terceirizado',
        shortLabel: 'Terceirizado',
        description: 'OS genérica aberta por terceirizados para serviços diversos',
        icon: 'HardHat',
        requiresAsset: false,
        requiresClient: true,
        requiresSchedule: true,
    },
    INSTALACAO_SALA: {
        key: 'INSTALACAO_SALA',
        label: 'Instalação de Sala Interativa/Imersiva',
        shortLabel: 'Instalar Sala',
        description: 'Formulário para instalação de salas interativas e imersivas',
        icon: 'MonitorPlay',
        requiresAsset: false,
        requiresClient: true,
        requiresSchedule: true,
    },
    INSTALACAO_TELA: {
        key: 'INSTALACAO_TELA',
        label: 'Instalação de Tela Interativa',
        shortLabel: 'Instalar Tela',
        description: 'Formulário para instalação de telas interativas',
        icon: 'Monitor',
        requiresAsset: false,
        requiresClient: true,
        requiresSchedule: true,
    },
    DESINSTALACAO: {
        key: 'DESINSTALACAO',
        label: 'Desinstalação de Tela/Sala',
        shortLabel: 'Desinstalar',
        description: 'Formulário para desinstalação de telas ou salas',
        icon: 'MonitorOff',
        requiresAsset: false,
        requiresClient: true,
        requiresSchedule: true,
    },
    SUPORTE_REMOTO: {
        key: 'SUPORTE_REMOTO',
        label: 'Suporte Remoto',
        shortLabel: 'Suporte Remoto',
        description: 'Formulário para atendimento de suporte remoto',
        icon: 'Headset',
        requiresAsset: false,
        requiresClient: true,
        requiresSchedule: false,
    },
    MANUTENCAO_TELA_SALA: {
        key: 'MANUTENCAO_TELA_SALA',
        label: 'Manutenção de Tela/Sala',
        shortLabel: 'Manutenção',
        description: 'Formulário para manutenção corretiva ou preventiva de telas e salas',
        icon: 'Wrench',
        requiresAsset: false,
        requiresClient: true,
        requiresSchedule: true,
    },
};

export const OS_FORM_TYPE_LIST = OS_FORM_TYPES.map((key) => OS_FORM_CONFIG[key]);

// Contractor users can only use the TERCEIRIZADO form type
export const CONTRACTOR_FORM_TYPES: OsFormType[] = ['TERCEIRIZADO'];

// Internal users can use all form types
export const INTERNAL_FORM_TYPES: OsFormType[] = [...OS_FORM_TYPES];
