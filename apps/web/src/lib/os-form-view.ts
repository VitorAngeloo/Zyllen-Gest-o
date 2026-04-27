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
    const typedForm = (formType || "") as OsFormType;
    const expectedKeys = FORM_FIELDS_BY_TYPE[typedForm] || [];
    const extraKeys = Object.keys(safeData).filter((key) => !expectedKeys.includes(key));
    const allKeys = [...expectedKeys, ...extraKeys];

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
