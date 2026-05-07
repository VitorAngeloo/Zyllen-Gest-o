import type { OsFormType } from "@web/components/os-forms";

export const OS_FIELD_LABELS: Record<string, string> = {
    roomModel: "Modelo da sala",
    screenDimensions: "Dimensões da tela",
    hasOutlets: "Pontos de tomada",
    internetType: "Tipo de internet",
    easyAccess: "Fácil acesso",
    safeLocation: "Local seguro",
    displayType: "Tipo de display",
    displayModel: "Modelo do display",
    computerConfig: "Configuração do computador",
    soundEquipment: "Equipamento de som",
    tabletTotem: "Tablet / Totem",
    cameraInstalled: "Câmera instalada",
    anydeskAlias: "Alias do Anydesk",
    totemCondition: "Condição do totem",
    uninstalledServiceType: "Tipo de serviço desinstalado",
    equipmentCondition: "Condição do equipamento",
    uninstalledEquipment: "Equipamentos desinstalados",
    infrastructureIssues: "Problemas de infraestrutura",
    maintenanceType: "Tipo de manutenção",
    workDone: "Serviço realizado",
    softwareCorrection: "Correção de software",
    rsActivated: "R&S acionada",
    issueDescription: "Descrição do problema",
    problemDescription: "Descrição do problema",
    localContactName: "Nome do contato local",
    localContactPhone: "Telefone do contato local",
    localContactRole: "Cargo do contato local",
    rsTechnicianName: "Técnico R&S",
    serviceScope: "Escopo do serviço",
    serviceDescription: "Descrição do atendimento",
    equipmentUsed: "Equipamento utilizado",
    skylineAnalyst: "Analista Skyline",
    technicianName: "Técnico",
    logbook: "Diário de bordo",
    witnessName: "Nome de quem acompanhou",
    witnessDocument: "RG/CPF de quem acompanhou",
    witnessSignature: "Assinatura de quem acompanhou",
    technicianSignature: "Assinatura do técnico",
};

const FORM_FIELDS_BY_TYPE: Record<OsFormType, string[]> = {
    INSTALACAO_SALA: [
        "roomModel",
        "screenDimensions",
        "hasOutlets",
        "internetType",
        "easyAccess",
        "safeLocation",
        "displayType",
        "displayModel",
        "computerConfig",
        "soundEquipment",
        "tabletTotem",
        "cameraInstalled",
        "anydeskAlias",
        "logbook",
        "witnessName",
        "witnessDocument",
        "witnessSignature",
    ],
    INSTALACAO_TELA: [
        "displayType",
        "displayModel",
        "screenDimensions",
        "hasOutlets",
        "internetType",
        "easyAccess",
        "safeLocation",
        "computerConfig",
        "soundEquipment",
        "tabletTotem",
        "cameraInstalled",
        "anydeskAlias",
        "totemCondition",
        "logbook",
        "witnessName",
        "witnessDocument",
        "witnessSignature",
    ],
    DESINSTALACAO: [
        "uninstalledServiceType",
        "uninstalledEquipment",
        "equipmentCondition",
        "infrastructureIssues",
        "logbook",
        "witnessName",
        "witnessDocument",
        "witnessSignature",
    ],
    MANUTENCAO_TELA_SALA: [
        "maintenanceType",
        "issueDescription",
        "workDone",
        "softwareCorrection",
        "rsActivated",
        "logbook",
        "witnessName",
        "witnessDocument",
        "witnessSignature",
    ],
    SUPORTE_REMOTO: [
        "issueDescription",
        "serviceDescription",
        "softwareCorrection",
        "rsActivated",
        "rsTechnicianName",
        "localContactName",
        "localContactPhone",
        "localContactRole",
        "logbook",
        "witnessName",
        "witnessDocument",
        "witnessSignature",
    ],
    TERCEIRIZADO: [
        "serviceScope",
        "serviceDescription",
        "equipmentUsed",
        "skylineAnalyst",
        "technicianName",
        "witnessSignature",
        "technicianSignature",
        "logbook",
    ],
};

const normalizeFormType = (value: string): string => {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toUpperCase();
};

const FORM_TYPE_ALIASES: Record<string, OsFormType> = {
    TERCEIRIZADO: "TERCEIRIZADO",
    INSTALACAO_SALA: "INSTALACAO_SALA",
    INSTALACAO_TELA: "INSTALACAO_TELA",
    DESINSTALACAO: "DESINSTALACAO",
    SUPORTE_REMOTO: "SUPORTE_REMOTO",
    MANUTENCAO_TELA_SALA: "MANUTENCAO_TELA_SALA",
    MANUTENCAO: "MANUTENCAO_TELA_SALA",
};

function resolveFormType(formType: OsFormType | string | undefined, formData: Record<string, unknown>): OsFormType | undefined {
    const raw = typeof formType === "string" ? formType.trim() : "";
    if (raw) {
        const normalized = normalizeFormType(raw);
        const direct = FORM_TYPE_ALIASES[normalized];
        if (direct) return direct;
    }

    // Legacy safety: infer by best overlap when type is inconsistent.
    const keys = new Set(Object.keys(formData));
    let bestType: OsFormType | undefined;
    let bestScore = 0;

    (Object.keys(FORM_FIELDS_BY_TYPE) as OsFormType[]).forEach((type) => {
        const expected = FORM_FIELDS_BY_TYPE[type];
        const score = expected.reduce((acc, key) => (keys.has(key) ? acc + 1 : acc), 0);
        if (score > bestScore) {
            bestScore = score;
            bestType = type;
        }
    });

    return bestScore > 0 ? bestType : undefined;
}

export interface OsFieldRow {
    key: string;
    label: string;
    rawValue: unknown;
    displayValue: string;
    isEmpty: boolean;
    isSignature: boolean;
}

export function isSignatureDataUrl(value: unknown): value is string {
    return typeof value === "string" && value.startsWith("data:image/");
}

export function formatFieldValue(value: unknown): string {
    if (value === null || value === undefined || value === "") return "Não preenchido";
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (Array.isArray(value)) return value.length ? value.map((v) => String(v)).join(", ") : "Não preenchido";
    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

export function getOsFieldRows(formType: OsFormType | string | undefined, formData: Record<string, unknown> | null | undefined): OsFieldRow[] {
    const safeData = formData && typeof formData === "object" ? formData : {};
    const resolvedType = resolveFormType(formType, safeData);
    const allKeys = resolvedType ? FORM_FIELDS_BY_TYPE[resolvedType] || [] : [];

    return allKeys.map((key) => {
        const rawValue = safeData[key as keyof typeof safeData];
        const isSignature = key.toLowerCase().includes("signature") && isSignatureDataUrl(rawValue);
        const isEmpty = rawValue === null || rawValue === undefined || rawValue === "";

        return {
            key,
            label: OS_FIELD_LABELS[key] || key,
            rawValue,
            displayValue: isSignature ? "Assinatura registrada" : formatFieldValue(rawValue),
            isEmpty,
            isSignature,
        };
    });
}
